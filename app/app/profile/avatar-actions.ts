"use server";

/**
 * Uploads a profile photo to shared public storage and updates profiles.avatar_url.
 * Uses listing-photos bucket with path {userId}/profile/... (same RLS prefix rules as listing images).
 * Location: app/app/profile/avatar-actions.ts
 */
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export type AvatarActionResult = { ok: true } | { ok: false; error: string };

function publicObjectPathFromAvatarUrl(url: string, userId: string): string | null {
  const marker = "/listing-photos/";
  const i = url.indexOf(marker);
  if (i < 0) return null;
  const path = url.slice(i + marker.length);
  if (!path.startsWith(`${userId}/`)) return null;
  return path;
}

export async function updateProfileAvatarAction(formData: FormData): Promise<AvatarActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "Sign in to change your photo." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, error: "Choose a photo." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Photo must be 2MB or smaller." };
  }
  if (!ALLOWED.has(file.type)) {
    return { ok: false, error: "Use JPG, PNG, or WebP." };
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/profile/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage.from("listing-photos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });

  if (upErr) {
    console.error("[updateProfileAvatarAction] upload", upErr.message);
    return { ok: false, error: `Upload failed: ${upErr.message}` };
  }

  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  if (!base) {
    return { ok: false, error: "Server misconfiguration (missing public URL)." };
  }
  const publicUrl = `${base}/storage/v1/object/public/listing-photos/${path}`;

  const { data: prev } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
  const oldUrl = (prev?.avatar_url as string | null)?.trim() || null;

  const { error: dbErr } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (dbErr) {
    console.error("[updateProfileAvatarAction] profile update", dbErr.message);
    await supabase.storage.from("listing-photos").remove([path]);
    return { ok: false, error: dbErr.message };
  }

  if (oldUrl) {
    const oldPath = publicObjectPathFromAvatarUrl(oldUrl, user.id);
    if (oldPath) {
      const { error: rmErr } = await supabase.storage.from("listing-photos").remove([oldPath]);
      if (rmErr) {
        console.warn("[updateProfileAvatarAction] remove old avatar", rmErr.message);
      }
    }
  }

  revalidatePath("/app/profile");
  revalidatePath("/app/profile/settings");
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function clearProfileAvatarAction(): Promise<AvatarActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "Sign in required." };
  }

  const { data: prev } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
  const oldUrl = (prev?.avatar_url as string | null)?.trim() || null;

  const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  if (dbErr) {
    return { ok: false, error: dbErr.message };
  }

  if (oldUrl) {
    const oldPath = publicObjectPathFromAvatarUrl(oldUrl, user.id);
    if (oldPath) {
      await supabase.storage.from("listing-photos").remove([oldPath]);
    }
  }

  revalidatePath("/app/profile");
  revalidatePath("/app/profile/settings");
  revalidatePath("/app", "layout");
  return { ok: true };
}
