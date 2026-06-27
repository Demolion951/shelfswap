"use server";

import { createClient } from "@/lib/supabase/server";
import { classifyBookCategory } from "@/lib/books/bookCategory";
import { fetchOpenLibraryEnrichmentByIsbn } from "@/lib/books/openLibraryEnrichment";
import { reverseGeocodeAreaText } from "@/lib/geo/reverseGeocode";
import { isUnlockCreditsColumnMissing } from "@/lib/listings/unlockCreditsPostgrest";
import { revalidatePath } from "next/cache";

const CONDITIONS = new Set(["new", "like_new", "good", "acceptable"]);

export type CreateListingResult =
  | { error: string }
  | { ok: true; listingId: string };

export type UpdateListingResult =
  | { error: string }
  | { ok: true; listingId: string };

export type DeleteListingResult = { error: string } | { ok: true };

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
  const binding = String(formData.get("binding") ?? "paperback").trim();
  const unlockCredits = binding === "hardback" ? 2 : 1;
  const openToSwaps = formData.get("open_to_swaps") === "on";
  const bookCategory = classifyBookCategory([], title, author ?? "");

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
    approx_area_text: null as string | null,
    status: "active" as const,
  };

  let insertRes = await supabase
    .from("listings")
    .insert({
      ...rowBase,
      unlock_credits: unlockCredits,
      book_category: bookCategory,
    })
    .select("id")
    .single();

  if (isUnlockCreditsColumnMissing(insertRes.error?.message)) {
    console.warn(
      "[createListing] listings.unlock_credits missing — retry without column. Run database/migrations/20260410_listing_unlock_credits.sql",
    );
    insertRes = await supabase.from("listings").insert(rowBase).select("id").single();
  }

  if (
    insertRes.error?.message?.includes("book_category") &&
    (insertRes.error.message.includes("column") || insertRes.error.message.includes("schema cache"))
  ) {
    console.warn("[createListing] book_category missing — retry without column.");
    insertRes = await supabase
      .from("listings")
      .insert({ ...rowBase, unlock_credits: unlockCredits })
      .select("id")
      .single();
  }

  const { data: listing, error: insertErr } = insertRes;

  if (insertErr || !listing) {
    console.error("[createListing] insert", insertErr?.message);
    return { error: insertErr?.message ?? "Could not create listing." };
  }

  const listingId = listing.id as string;

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
    } else {
      try {
        const areaText = await reverseGeocodeAreaText(approxLat, approxLng);
        if (areaText) {
          await supabase
            .from("listings")
            .update({ approx_area_text: areaText })
            .eq("id", listingId);
        }
      } catch (e) {
        console.warn("[createListing] reverse geocode listing area", e);
      }
    }
  } else if (useProfileArea) {
    const { error: copyErr } = await supabase.rpc("copy_listing_geo_from_profile", {
      p_listing_id: listingId,
    });
    if (copyErr) {
      console.warn("[createListing] copy_listing_geo_from_profile", copyErr.message);
    } else {
      const { data: prof } = await supabase
        .from("profiles")
        .select("home_approx_area_text, approx_area_text")
        .eq("id", user.id)
        .maybeSingle();
      const at =
        (prof?.home_approx_area_text as string | null)?.trim() ||
        (prof?.approx_area_text as string | null)?.trim();
      if (at) {
        await supabase.from("listings").update({ approx_area_text: at }).eq("id", listingId);
      }
    }
  }

  if (isbn) {
    try {
      const enrich = await fetchOpenLibraryEnrichmentByIsbn(isbn);
      if (enrich && enrich.subjects.length > 0) {
        const category = classifyBookCategory(enrich.subjects, title, author ?? "");
        const { data: row, error: metaErr } = await supabase
          .from("listings")
          .select("metadata")
          .eq("id", listingId)
          .maybeSingle();
        if (metaErr) {
          console.warn("[createListing] fetch metadata", metaErr.message);
        }
        const prev = (row?.metadata as Record<string, unknown> | null) ?? {};
        const nextMeta = {
          ...prev,
          openlibrary: { workKey: enrich.workKey, sourceUrl: enrich.sourceUrl },
          subjects: enrich.subjects,
          binding,
        };
        const { error: upErr } = await supabase
          .from("listings")
          .update({ metadata: nextMeta, book_category: category })
          .eq("id", listingId);
        if (upErr) {
          console.warn("[createListing] update metadata subjects", upErr.message);
        }
      } else {
        await supabase
          .from("listings")
          .update({ metadata: { binding } })
          .eq("id", listingId);
      }
    } catch (e) {
      console.warn("[createListing] open library enrichment", e);
      await supabase
        .from("listings")
        .update({ metadata: { binding } })
        .eq("id", listingId);
    }
  } else {
    await supabase
      .from("listings")
      .update({ metadata: { binding } })
      .eq("id", listingId);
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

export async function updateListing(formData: FormData): Promise<UpdateListingResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { error: "You must be signed in to edit a listing." };
  }

  const listingId = String(formData.get("listing_id") ?? "").trim();
  if (!listingId) {
    return { error: "Missing listing." };
  }

  const { data: existing, error: exErr } = await supabase
    .from("listings")
    .select("id, user_id")
    .eq("id", listingId)
    .maybeSingle();

  if (exErr || !existing || (existing.user_id as string) !== user.id) {
    return { error: "You can only edit your own listings." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim() || null;
  const isbnDigits = String(formData.get("isbn") ?? "").replace(/\D/g, "");
  const isbn = isbnDigits.length > 0 ? isbnDigits : null;
  const coverUrl = String(formData.get("cover_url") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const condition = String(formData.get("condition") ?? "");
  const binding = String(formData.get("binding") ?? "paperback").trim();
  const unlockCredits = binding === "hardback" ? 2 : 1;
  const openToSwaps = formData.get("open_to_swaps") === "on";

  if (!title) {
    return { error: "Title is required." };
  }
  if (!CONDITIONS.has(condition)) {
    return { error: "Pick a condition." };
  }

  const patch = {
    title,
    author,
    isbn,
    cover_url: coverUrl,
    condition,
    open_to_swaps: openToSwaps,
    description,
    unlock_credits: unlockCredits,
  };

  let upRes = await supabase.from("listings").update(patch).eq("id", listingId).eq("user_id", user.id);

  if (isUnlockCreditsColumnMissing(upRes.error?.message)) {
    const { unlock_credits: _u, ...withoutUnlock } = patch;
    upRes = await supabase.from("listings").update(withoutUnlock).eq("id", listingId).eq("user_id", user.id);
  }

  if (upRes.error) {
    console.error("[updateListing]", upRes.error.message);
    return { error: upRes.error.message ?? "Could not update listing." };
  }

  const { data: metaRow } = await supabase
    .from("listings")
    .select("metadata")
    .eq("id", listingId)
    .maybeSingle();
  const prevMeta = (metaRow?.metadata as Record<string, unknown> | null) ?? {};
  await supabase
    .from("listings")
    .update({ metadata: { ...prevMeta, binding } })
    .eq("id", listingId);

  if (isbn) {
    const enrich = await fetchOpenLibraryEnrichmentByIsbn(isbn);
    if (enrich && enrich.subjects.length > 0) {
      const category = classifyBookCategory(enrich.subjects, title, author ?? "");
      const nextMeta = {
        ...prevMeta,
        binding,
        openlibrary: { workKey: enrich.workKey, sourceUrl: enrich.sourceUrl },
        subjects: enrich.subjects,
      };
      const { error: upMetaErr } = await supabase
        .from("listings")
        .update({ metadata: nextMeta, book_category: category })
        .eq("id", listingId);
      if (upMetaErr) {
        console.warn("[updateListing] update metadata subjects", upMetaErr.message);
      }
    }
  } else {
    const category = classifyBookCategory([], title, author ?? "");
    await supabase.from("listings").update({ book_category: category }).eq("id", listingId);
  }

  revalidatePath("/app/home");
  revalidatePath("/app/search");
  revalidatePath("/app/profile");
  revalidatePath("/app/profile/listings");
  revalidatePath(`/app/listings/${listingId}`);
  revalidatePath(`/app/sell/edit/${listingId}`);
  revalidatePath("/app/activity");
  return { ok: true, listingId };
}

export async function deleteMyListing(listingId: string): Promise<DeleteListingResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("listings")
    .update({ status: "archived" })
    .eq("id", listingId)
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) {
    console.error("[deleteMyListing]", error.message);
    return { error: error.message };
  }

  revalidatePath("/app/home");
  revalidatePath("/app/search");
  revalidatePath("/app/browse");
  revalidatePath("/app/profile");
  revalidatePath("/app/profile/listings");
  revalidatePath("/app/profile/saved");
  revalidatePath(`/app/listings/${listingId}`);
  revalidatePath("/app/activity");
  revalidatePath("/app/messages");
  return { ok: true };
}
