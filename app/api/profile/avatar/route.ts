import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Profile photo upload/clear (Route Handler) — avoids server-action + client boundary issues on some hosts.
 * POST multipart form field `avatar` (File), or POST JSON `{ "clear": true }`.
 * Location: app/api/profile/avatar/route.ts
 */

export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function publicObjectPathFromAvatarUrl(url: string, userId: string): string | null {
  const marker = "/listing-photos/";
  const i = url.indexOf(marker);
  if (i < 0) return null;
  const path = url.slice(i + marker.length);
  if (!path.startsWith(`${userId}/`)) return null;
  return path;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user ?? null;
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      let body: { clear?: boolean };
      try {
        body = (await req.json()) as { clear?: boolean };
      } catch {
        return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
      }
      if (body?.clear !== true) {
        return NextResponse.json({ ok: false, error: "Expected { clear: true }" }, { status: 400 });
      }

      const { data: prev } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
      const oldUrl = (prev?.avatar_url as string | null)?.trim() || null;

      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      if (dbErr) {
        return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
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
      return NextResponse.json({ ok: true });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ ok: false, error: "Expected multipart form data" }, { status: 400 });
    }

    const file = formData.get("avatar");
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ ok: false, error: "Choose a photo." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "Photo must be 2MB or smaller." }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ ok: false, error: "Use JPG, PNG, or WebP." }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/profile/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("listing-photos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

    if (upErr) {
      console.error("[api/profile/avatar] upload", upErr.message);
      return NextResponse.json({ ok: false, error: `Upload failed: ${upErr.message}` }, { status: 500 });
    }

    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
    if (!base) {
      await supabase.storage.from("listing-photos").remove([path]);
      return NextResponse.json({ ok: false, error: "Server misconfiguration." }, { status: 500 });
    }
    const publicUrl = `${base}/storage/v1/object/public/listing-photos/${path}`;

    const { data: prev } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
    const oldUrl = (prev?.avatar_url as string | null)?.trim() || null;

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (dbErr) {
      console.error("[api/profile/avatar] profile update", dbErr.message);
      await supabase.storage.from("listing-photos").remove([path]);
      return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
    }

    if (oldUrl) {
      const oldPath = publicObjectPathFromAvatarUrl(oldUrl, user.id);
      if (oldPath) {
        const { error: rmErr } = await supabase.storage.from("listing-photos").remove([oldPath]);
        if (rmErr) {
          console.warn("[api/profile/avatar] remove old avatar", rmErr.message);
        }
      }
    }

    revalidatePath("/app/profile");
    revalidatePath("/app/profile/settings");
    revalidatePath("/app", "layout");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/profile/avatar]", e);
    return NextResponse.json({ ok: false, error: "Unexpected server error." }, { status: 500 });
  }
}
