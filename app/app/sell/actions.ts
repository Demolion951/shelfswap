"use server";

import { createClient } from "@/lib/supabase/server";
import { isUnlockCreditsColumnMissing } from "@/lib/listings/unlockCreditsPostgrest";
import { revalidatePath } from "next/cache";

const CONDITIONS = new Set(["new", "like_new", "good", "acceptable"]);

export type CreateListingResult =
  | { error: string }
  | { ok: true; listingId: string };

export async function createListing(
  formData: FormData,
): Promise<CreateListingResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { error: "You must be signed in to list a book." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim() || null;
  const isbnDigits = String(formData.get("isbn") ?? "").replace(/\D/g, "");
  const isbn = isbnDigits.length > 0 ? isbnDigits : null;
  const coverUrl = String(formData.get("cover_url") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const condition = String(formData.get("condition") ?? "");
  const unlockRaw = Number.parseInt(String(formData.get("unlock_credits") ?? "1"), 10);
  const unlockCredits = unlockRaw === 2 ? 2 : 1;
  const openToSwaps = formData.get("open_to_swaps") === "on";
  const pickupInstructions = String(formData.get("pickup_instructions") ?? "").trim();
  const contactHintRaw = String(formData.get("contact_hint") ?? "").trim();
  const contactHint = contactHintRaw.length > 0 ? contactHintRaw : null;

  const files = formData.getAll("photos") as File[];
  const imageFiles = files.filter(
    (f) => f instanceof File && f.size > 0 && f.type.startsWith("image/"),
  );

  if (!title) {
    return { error: "Title is required." };
  }
  if (!CONDITIONS.has(condition)) {
    return { error: "Pick a condition." };
  }

  const rowBase = {
    user_id: user.id,
    title,
    author,
    isbn,
    cover_url: coverUrl,
    condition,
    price_cents: 0,
    open_to_swaps: openToSwaps,
    description,
    status: "active" as const,
  };

  let insertRes = await supabase
    .from("listings")
    .insert({
      ...rowBase,
      unlock_credits: unlockCredits,
    })
    .select("id")
    .single();

  if (isUnlockCreditsColumnMissing(insertRes.error?.message)) {
    console.warn(
      "[createListing] listings.unlock_credits missing — retry without column. Run database/migrations/20260410_listing_unlock_credits.sql",
    );
    insertRes = await supabase.from("listings").insert(rowBase).select("id").single();
  }

  const { data: listing, error: insertErr } = insertRes;

  if (insertErr || !listing) {
    console.error("[createListing] insert", insertErr?.message);
    return { error: insertErr?.message ?? "Could not create listing." };
  }

  const listingId = listing.id as string;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
    const path = `${user.id}/${listingId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("listing-photos")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "image/jpeg",
      });

    if (upErr) {
      console.error("[createListing] upload", upErr.message);
      await supabase.from("listings").delete().eq("id", listingId);
      return { error: `Photo upload failed: ${upErr.message}` };
    }

    const publicUrl = `${baseUrl}/storage/v1/object/public/listing-photos/${path}`;
    const { error: photoErr } = await supabase.from("listing_photos").insert({
      listing_id: listingId,
      url: publicUrl,
      sort: i,
    });

    if (photoErr) {
      console.error("[createListing] listing_photos", photoErr.message);
      await supabase.from("listings").delete().eq("id", listingId);
      return { error: "Could not save photo records." };
    }
  }

  if (pickupInstructions.length > 0 || contactHint) {
    const { error: pickupErr } = await supabase.from("listing_pickup").insert({
      listing_id: listingId,
      pickup_instructions: pickupInstructions,
      contact_hint: contactHint,
    });
    if (pickupErr) {
      console.warn("[createListing] listing_pickup", pickupErr.message);
    }
  }

  const useProfileArea = formData.get("use_profile_area") === "on";
  const approxLat = Number.parseFloat(String(formData.get("approx_lat") ?? ""));
  const approxLng = Number.parseFloat(String(formData.get("approx_lng") ?? ""));
  if (Number.isFinite(approxLat) && Number.isFinite(approxLng)) {
    const { error: geoErr } = await supabase.rpc("set_listing_approx_geo", {
      p_listing_id: listingId,
      p_lat: approxLat,
      p_lng: approxLng,
    });
    if (geoErr) {
      console.warn("[createListing] set_listing_approx_geo", geoErr.message);
    }
  } else if (useProfileArea) {
    const { error: copyErr } = await supabase.rpc("copy_listing_geo_from_profile", {
      p_listing_id: listingId,
    });
    if (copyErr) {
      console.warn("[createListing] copy_listing_geo_from_profile", copyErr.message);
    }
  }

  await supabase.from("events").insert({
    user_id: user.id,
    type: "create_listing",
    listing_id: listingId,
    payload: { title },
  });

  revalidatePath("/app/home");
  revalidatePath("/app/search");
  revalidatePath("/app/profile");
  revalidatePath("/app/activity");
  return { ok: true, listingId };
}
