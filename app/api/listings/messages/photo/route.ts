import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Upload one photo and post it as a listing message (optional caption in body).
 * POST multipart: listing_id, photo (File), optional body (caption).
 * Location: app/api/listings/messages/photo/route.ts
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "",
]);

function extFor(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (/\.png$/i.test(file.name)) return "png";
  if (/\.webp$/i.test(file.name)) return "webp";
  return "jpg";
}

function mimeOk(file: File): boolean {
  if (ALLOWED.has(file.type)) return true;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: "Sign in to send photos." }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid upload." }, { status: 400 });
    }

    const listingId = String(formData.get("listing_id") ?? "").trim();
    const caption = String(formData.get("body") ?? "").trim();
    const file = formData.get("photo");

    if (!listingId) {
      return NextResponse.json({ ok: false, error: "Missing listing." }, { status: 400 });
    }
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ ok: false, error: "Choose a photo." }, { status: 400 });
    }
    if (caption.length > 2000) {
      return NextResponse.json({ ok: false, error: "Caption is too long (max 2000 characters)." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Photo must be 5MB or smaller. Try a smaller image." },
        { status: 400 },
      );
    }
    if (!mimeOk(file)) {
      return NextResponse.json({ ok: false, error: "Use a JPG, PNG, or WebP photo." }, { status: 400 });
    }

    const ext = extFor(file);
    const path = `${user.id}/messages/${listingId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("listing-photos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type && file.type.startsWith("image/") ? file.type : "image/jpeg",
    });

    if (upErr) {
      console.error("[api/listings/messages/photo] upload", upErr.message);
      return NextResponse.json({ ok: false, error: `Upload failed: ${upErr.message}` }, { status: 500 });
    }

    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
    if (!base) {
      await supabase.storage.from("listing-photos").remove([path]);
      return NextResponse.json({ ok: false, error: "Server misconfiguration." }, { status: 500 });
    }

    const publicUrl = `${base}/storage/v1/object/public/listing-photos/${path}`;
    const { data: rpcData, error: rpcErr } = await supabase.rpc("post_listing_message", {
      p_listing_id: listingId,
      p_body: caption,
      p_image_url: publicUrl,
    });

    if (rpcErr) {
      console.error("[api/listings/messages/photo] rpc", rpcErr.message);
      await supabase.storage.from("listing-photos").remove([path]);
      return NextResponse.json({ ok: false, error: rpcErr.message }, { status: 500 });
    }

    const pr = rpcData as { ok?: boolean; error?: string } | null;
    if (!pr || pr.ok !== true) {
      await supabase.storage.from("listing-photos").remove([path]);
      const code = pr?.error ?? "";
      const friendly =
        code === "not_participant"
          ? "You can't message on this listing (unlock it first, or list it yourself)."
          : code === "too_long"
            ? "Caption is too long (max 2000 characters)."
            : code === "bad_image_url"
              ? "Invalid photo URL."
              : "Could not send photo.";
      return NextResponse.json({ ok: false, error: friendly }, { status: 400 });
    }

    revalidatePath(`/app/listings/${listingId}`);
    revalidatePath("/app/messages");
    return NextResponse.json({ ok: true, image_url: publicUrl });
  } catch (e) {
    console.error("[api/listings/messages/photo]", e);
    return NextResponse.json({ ok: false, error: "Unexpected server error." }, { status: 500 });
  }
}
