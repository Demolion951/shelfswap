import { createClient } from "@/lib/supabase/server";
import { isUnlockCreditsColumnMissing } from "@/lib/listings/unlockCreditsPostgrest";

export type ListingPhotoRow = {
  id: string;
  url: string;
  sort: number;
};

export type ListingWithRelations = {
  id: string;
  user_id: string;
  isbn: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  condition: string;
  price_cents: number;
  unlock_credits: number;
  open_to_swaps: boolean;
  description: string | null;
  approx_area_text?: string | null;
  created_at: string;
  listing_photos: ListingPhotoRow[] | null;
  profiles: { display_name: string; avatar_url: string | null } | null;
  /** Straight-line km from viewer profile to listing; set by attachDistanceKmToListings. */
  distance_km?: number | null;
};

const listingSelectNoUnlockCredits = `
      id,
      user_id,
      isbn,
      title,
      author,
      cover_url,
      condition,
      price_cents,
      approx_area_text,
      open_to_swaps,
      description,
      created_at,
      listing_photos ( id, url, sort ),
      profiles!listings_user_id_fkey ( display_name, avatar_url )
    `;

const listingSelectWithUnlockCredits = `
      id,
      user_id,
      isbn,
      title,
      author,
      cover_url,
      condition,
      price_cents,
      unlock_credits,
      approx_area_text,
      open_to_swaps,
      description,
      created_at,
      listing_photos ( id, url, sort ),
      profiles!listings_user_id_fkey ( display_name, avatar_url )
    `;

const listingDetailSelectNoUnlockCredits = `
      id,
      user_id,
      isbn,
      title,
      author,
      cover_url,
      condition,
      price_cents,
      approx_area_text,
      open_to_swaps,
      description,
      created_at,
      status,
      listing_photos ( id, url, sort ),
      profiles!listings_user_id_fkey ( display_name, avatar_url )
    `;

const listingDetailSelectWithUnlockCredits = `
      id,
      user_id,
      isbn,
      title,
      author,
      cover_url,
      condition,
      price_cents,
      unlock_credits,
      approx_area_text,
      open_to_swaps,
      description,
      created_at,
      status,
      listing_photos ( id, url, sort ),
      profiles!listings_user_id_fkey ( display_name, avatar_url )
    `;

export function normalizeListingRow(
  row: Record<string, unknown>,
): ListingWithRelations {
  const uc = row.unlock_credits;
  const unlock_credits = uc === 2 || uc === "2" ? 2 : 1;
  return { ...row, unlock_credits } as ListingWithRelations;
}

async function withUnlockCreditsRetry<T>(
  primary: () => PromiseLike<{ data: T; error: { message: string } | null }>,
  fallback: () => PromiseLike<{ data: T; error: { message: string } | null }>,
): Promise<{ data: T; error: { message: string } | null }> {
  const first = await primary();
  if (isUnlockCreditsColumnMissing(first.error?.message)) {
    return fallback();
  }
  return first;
}

export async function fetchRecentListings(
  limit = 24,
): Promise<ListingWithRelations[]> {
  const supabase = await createClient();
  const res = await withUnlockCreditsRetry(
    () =>
      supabase
        .from("listings")
        .select(listingSelectWithUnlockCredits)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(limit),
    () =>
      supabase
        .from("listings")
        .select(listingSelectNoUnlockCredits)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(limit),
  );

  if (res.error) {
    console.error("[fetchRecentListings]", res.error.message);
    return [] as ListingWithRelations[];
  }
  return (res.data ?? []).map((r) =>
    normalizeListingRow(r as Record<string, unknown>),
  );
}

export async function searchListingsByText(
  q: string,
  limit = 30,
): Promise<ListingWithRelations[]> {
  const supabase = await createClient();
  const safe = q.trim().replace(/[^\w\s-]/g, "").trim();
  if (!safe) return [] as ListingWithRelations[];

  // Type-ahead UX: for short queries, full-text search can feel too strict.
  // Use ILIKE to support partial matches; keep full-text for longer queries.
  const qLen = safe.replace(/\s+/g, " ").length;
  const like = `%${safe}%`;

  const runIlike = (selectClause: string) =>
    supabase
      .from("listings")
      .select(selectClause)
      .eq("status", "active")
      .or(`title.ilike.${like},author.ilike.${like},isbn.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(limit);

  const runText = (selectClause: string) =>
    supabase
      .from("listings")
      .select(selectClause)
      .eq("status", "active")
      .textSearch("search_tsv", safe, {
        type: "websearch",
        config: "simple",
      })
      .order("created_at", { ascending: false })
      .limit(limit);

  const res = await withUnlockCreditsRetry(
    () =>
      qLen < 4
        ? runIlike(listingSelectWithUnlockCredits)
        : runText(listingSelectWithUnlockCredits),
    () =>
      qLen < 4
        ? runIlike(listingSelectNoUnlockCredits)
        : runText(listingSelectNoUnlockCredits),
  );

  if (res.error) {
    console.error("[searchListingsByText]", res.error.message);
    return [] as ListingWithRelations[];
  }
  return (res.data ?? [])
    .map((r) => {
      if (!r || typeof r !== "object") return null;
      return normalizeListingRow(r as unknown as Record<string, unknown>);
    })
    .filter((x): x is ListingWithRelations => !!x);
}

export type ListingWithRelationsAndStatus = ListingWithRelations & {
  status: string;
};

export async function fetchListingById(
  id: string,
): Promise<ListingWithRelationsAndStatus | null> {
  const supabase = await createClient();
  const res = await withUnlockCreditsRetry(
    () =>
      supabase
        .from("listings")
        .select(listingDetailSelectWithUnlockCredits)
        .eq("id", id)
        .maybeSingle(),
    () =>
      supabase
        .from("listings")
        .select(listingDetailSelectNoUnlockCredits)
        .eq("id", id)
        .maybeSingle(),
  );

  if (res.error) {
    console.error("[fetchListingById]", res.error.message);
    return null;
  }
  if (!res.data) return null;
  return normalizeListingRow(
    res.data as Record<string, unknown>,
  ) as ListingWithRelationsAndStatus;
}

/** Pickup row; only returned when RLS allows (owner or unlocked buyer). */
export type ListingPickupRow = {
  listing_id: string;
  pickup_instructions: string;
  contact_hint: string | null;
};

export type ListingMessageRow = {
  id: string;
  listing_id: string;
  sender_id: string;
  sender_display_name: string;
  body: string;
  created_at: string;
};

export async function fetchListingPickupIfAllowed(
  listingId: string,
): Promise<ListingPickupRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listing_pickup")
    .select("listing_id, pickup_instructions, contact_hint")
    .eq("listing_id", listingId)
    .maybeSingle();

  if (error) {
    console.error("[fetchListingPickupIfAllowed]", error.message);
    return null;
  }
  return data as ListingPickupRow | null;
}

export async function fetchListingMessagesIfAllowed(
  listingId: string,
  limit = 200,
): Promise<ListingMessageRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listing_messages")
    .select("id, listing_id, sender_id, sender_display_name, body, created_at")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[fetchListingMessagesIfAllowed]", error.message);
    return [];
  }
  return (data ?? []) as ListingMessageRow[];
}

export async function fetchMyListings(
  userId: string,
  limit = 50,
): Promise<ListingWithRelations[]> {
  const supabase = await createClient();
  const res = await withUnlockCreditsRetry(
    () =>
      supabase
        .from("listings")
        .select(listingSelectWithUnlockCredits)
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(limit),
    () =>
      supabase
        .from("listings")
        .select(listingSelectNoUnlockCredits)
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(limit),
  );

  if (res.error) {
    console.error("[fetchMyListings]", res.error.message);
    return [] as ListingWithRelations[];
  }
  return (res.data ?? []).map((r) =>
    normalizeListingRow(r as Record<string, unknown>),
  );
}
