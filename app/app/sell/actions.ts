"use server";

import { createClient } from "@/lib/supabase/server";
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

  const { data: listing, error: insertErr } = await supabase
    .from("listings")
    .insert({
      user_id: user.id,
      title,
      author,
      isbn,
      cover_url: coverUrl,
      condition,
      price_cents: 0,
      unlock_credits: unlockCredits,
      open_to_swaps: openToSwaps,
      description,
      status: "active",
    })
    .select("id")
    .single();

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

  await supabase.from("events").insert({
    user_id: user.id,
    type: "create_listing",
    listing_id: listingId,
    payload: { title },
  });

  revalidatePath("/app/home");
  revalidatePath("/app/search");
  revalidatePath("/app/profile");
  return { ok: true, listingId };
}
