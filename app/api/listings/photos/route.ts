import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Upload one listing photo per request (reliable for multiple gallery/camera picks).
 * POST multipart: listing_id, photo (File), optional sort (int).
 * Location: app/api/listings/photos/route.ts
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS_PER_LISTING = 8;
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
      return NextResponse.json({ ok: false, error: "Sign in to upload photos." }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid upload." }, { status: 400 });
    }

    const listingId = String(formData.get("listing_id") ?? "").trim();
    const file = formData.get("photo");
    if (!listingId) {
      return NextResponse.json({ ok: false, error: "Missing listing." }, { status: 400 });
    }
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ ok: false, error: "Choose a photo." }, { status: 400 });
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

    const { data: listing, error: listErr } = await supabase
      .from("listings")
      .select("id, user_id")
      .eq("id", listingId)
      .maybeSingle();

    if (listErr || !listing || (listing.user_id as string) !== user.id) {
      return NextResponse.json({ ok: false, error: "Listing not found." }, { status: 404 });
    }

    const { count, error: countErr } = await supabase
      .from("listing_photos")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listingId);

    if (countErr) {
      console.error("[api/listings/photos] count", countErr.message);
      return NextResponse.json({ ok: false, error: countErr.message }, { status: 500 });
    }
    if ((count ?? 0) >= MAX_PHOTOS_PER_LISTING) {
      return NextResponse.json(
        { ok: false, error: `This listing already has ${MAX_PHOTOS_PER_LISTING} photos.` },
        { status: 400 },
      );
    }

    let sort = Number.parseInt(String(formData.get("sort") ?? ""), 10);
    if (!Number.isFinite(sort) || sort < 0) {
      const { data: maxRow } = await supabase
        .from("listing_photos")
        .select("sort")
        .eq("listing_id", listingId)
        .order("sort", { ascending: false })
        .limit(1)
        .maybeSingle();
      sort = typeof maxRow?.sort === "number" ? maxRow.sort + 1 : 0;
    }

    const ext = extFor(file);
    const path = `${user.id}/${listingId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("listing-photos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type && file.type.startsWith("image/") ? file.type : "image/jpeg",
    });

    if (upErr) {
      console.error("[api/listings/photos] upload", upErr.message);
      return NextResponse.json({ ok: false, error: `Upload failed: ${upErr.message}` }, { status: 500 });
    }

    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
    if (!base) {
      await supabase.storage.from("listing-photos").remove([path]);
      return NextResponse.json({ ok: false, error: "Server misconfiguration." }, { status: 500 });
    }

    const publicUrl = `${base}/storage/v1/object/public/listing-photos/${path}`;
    const { data: photoRpc, error: photoErr } = await supabase.rpc("add_my_listing_photo", {
      p_listing_id: listingId,
      p_url: publicUrl,
      p_sort: sort,
    });

    if (photoErr) {
      console.error("[api/listings/photos] rpc", photoErr.message);
      await supabase.storage.from("listing-photos").remove([path]);
      return NextResponse.json({ ok: false, error: photoErr.message }, { status: 500 });
    }

    const pr = photoRpc as { ok?: boolean; error?: string } | null;
    if (!pr || pr.ok !== true) {
      await supabase.storage.from("listing-photos").remove([path]);
      return NextResponse.json(
        { ok: false, error: pr?.error ?? "Could not save photo." },
        { status: 500 },
      );
    }

    revalidatePath(`/app/listings/${listingId}`);
    revalidatePath("/app/home");
    revalidatePath("/app/profile/listings");
    return NextResponse.json({ ok: true, url: publicUrl, sort });
  } catch (e) {
    console.error("[api/listings/photos]", e);
    return NextResponse.json({ ok: false, error: "Unexpected server error." }, { status: 500 });
  }
}
