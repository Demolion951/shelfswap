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

type PublicProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
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

/** Supabase occasionally returns sparse arrays; never pass null entries to normalizeListingRow. */
function listingRowsFromQueryData(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data.filter((r): r is Record<string, unknown> => r != null && typeof r === "object");
}

async function attachPublicProfilesToListings<T extends ListingWithRelations>(
  listings: T[],
): Promise<T[]> {
  if (listings.length === 0) return listings;
  const supabase = await createClient();
  const ids = Array.from(new Set(listings.map((l) => l.user_id).filter(Boolean)));
  if (ids.length === 0) return listings;

  const { data, error } = await supabase.rpc("profiles_public_batch", {
    p_user_ids: ids,
  });
  if (error) {
    console.warn("[attachPublicProfilesToListings] profiles_public_batch", error.message);
    return listings;
  }

  const rows = (data ?? []) as unknown[];
  const byId = new Map<string, PublicProfileRow>();
  for (const r of rows) {
    if (!r || typeof r !== "object" || !("id" in r)) continue;
    const row = r as PublicProfileRow;
    byId.set(String(row.id), row);
  }

  return listings.map((l) => {
    const r = byId.get(String(l.user_id));
    if (!r) return l;
    return {
      ...l,
      profiles: {
        display_name: (r.display_name ?? "").trim(),
        avatar_url: r.avatar_url ?? null,
      },
    };
  });
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myUserId = user?.id ?? null;

  const run = (selectClause: string) => {
    let q = supabase
      .from("listings")
      .select(selectClause)
      .eq("status", "active");
    if (myUserId) q = q.neq("user_id", myUserId);
    return q.order("created_at", { ascending: false }).limit(limit);
  };

  const res = await withUnlockCreditsRetry(
    () =>
      run(listingSelectWithUnlockCredits),
    () =>
      run(listingSelectNoUnlockCredits),
  );

  if (res.error) {
    console.error("[fetchRecentListings]", res.error.message);
    return [] as ListingWithRelations[];
  }
  const rows = listingRowsFromQueryData(res.data);
  return attachPublicProfilesToListings(rows.map((r) => normalizeListingRow(r)));
}

export async function searchListingsByText(
  q: string,
  limit = 30,
): Promise<ListingWithRelations[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myUserId = user?.id ?? null;

  const safe = q.trim().replace(/[^\w\s-]/g, "").trim();
  if (!safe) return [] as ListingWithRelations[];

  // Type-ahead UX: full-text search matches whole words only; partial tokens like "Fift" won't hit
  // "Fifty". Use ILIKE for shorter queries so substring matches work (pg_trgm indexes back this).
  // Switch to full-text for longer phrases where ranking / multi-word behavior matters more.
  const qLen = safe.replace(/\s+/g, " ").length;
  const like = `%${safe}%`;

  const runIlike = (selectClause: string) => {
    let q = supabase
      .from("listings")
      .select(selectClause)
      .eq("status", "active")
      .or(`title.ilike.${like},author.ilike.${like},isbn.ilike.${like}`);
    if (myUserId) q = q.neq("user_id", myUserId);
    return q.order("created_at", { ascending: false }).limit(limit);
  };

  const runText = (selectClause: string) => {
    let q = supabase
      .from("listings")
      .select(selectClause)
      .eq("status", "active")
      .textSearch("search_tsv", safe, {
        type: "websearch",
        config: "simple",
      });
    if (myUserId) q = q.neq("user_id", myUserId);
    return q.order("created_at", { ascending: false }).limit(limit);
  };

  const res = await withUnlockCreditsRetry(
    () =>
      qLen < 8
        ? runIlike(listingSelectWithUnlockCredits)
        : runText(listingSelectWithUnlockCredits),
    () =>
      qLen < 8
        ? runIlike(listingSelectNoUnlockCredits)
        : runText(listingSelectNoUnlockCredits),
  );

  if (res.error) {
    console.error("[searchListingsByText]", res.error.message);
    return [] as ListingWithRelations[];
  }
  const normalized = (res.data ?? [])
    .map((r) => {
      if (!r || typeof r !== "object") return null;
      return normalizeListingRow(r as unknown as Record<string, unknown>);
    })
    .filter((x): x is ListingWithRelations => !!x);
  return attachPublicProfilesToListings(normalized);
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
  if (!res.data || typeof res.data !== "object") return null;
  const one = normalizeListingRow(res.data as Record<string, unknown>) as ListingWithRelationsAndStatus;
  const [withProfile] = await attachPublicProfilesToListings([one]);
  return withProfile ?? one;
}

export type ListingMessageRow = {
  id: string;
  listing_id: string;
  sender_id: string;
  sender_display_name: string;
  body: string;
  created_at: string;
};

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

export async function getSavedListingsCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("saved_listings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    const msg = error.message.toLowerCase();
    if (!msg.includes("relation") && !msg.includes("does not exist") && !msg.includes("schema cache")) {
      console.error("[getSavedListingsCount]", error.message);
    }
    return 0;
  }
  return count ?? 0;
}

export async function fetchSavedListings(
  userId: string,
  limit = 80,
): Promise<ListingWithRelations[]> {
  const supabase = await createClient();
  const { data: saves, error: sErr } = await supabase
    .from("saved_listings")
    .select("listing_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (sErr) {
    const msg = sErr.message.toLowerCase();
    if (!msg.includes("relation") && !msg.includes("does not exist") && !msg.includes("schema cache")) {
      console.error("[fetchSavedListings] saves", sErr.message);
    }
    return [] as ListingWithRelations[];
  }

  const ids = [...new Set((saves ?? []).map((r) => r.listing_id as string))];
  if (ids.length === 0) return [] as ListingWithRelations[];

  const res = await withUnlockCreditsRetry(
    () =>
      supabase
        .from("listings")
        .select(listingSelectWithUnlockCredits)
        .in("id", ids)
        .eq("status", "active"),
    () =>
      supabase
        .from("listings")
        .select(listingSelectNoUnlockCredits)
        .in("id", ids)
        .eq("status", "active"),
  );

  if (res.error) {
    console.error("[fetchSavedListings] listings", res.error.message);
    return [] as ListingWithRelations[];
  }

  const byId = new Map<string, ListingWithRelations>();
  for (const r of listingRowsFromQueryData(res.data)) {
    const row = normalizeListingRow(r);
    byId.set(row.id, row);
  }

  const ordered: ListingWithRelations[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (row) ordered.push(row);
  }

  return attachPublicProfilesToListings(ordered);
}

export type RehomedListing = ListingWithRelations & { rehomedAt: string };

function mergeRehomedCompletedAt(
  map: Map<string, string>,
  listingId: unknown,
  completedAt: unknown,
) {
  const id = String(listingId ?? "");
  const at = typeof completedAt === "string" ? completedAt : null;
  if (!id || !at) return;
  const prev = map.get(id);
  if (!prev || at > prev) map.set(id, at);
}

function unlockRowIsCompleted(row: {
  completed_at?: string | null;
  buyer_confirmed_at?: string | null;
  seller_confirmed_at?: string | null;
}): boolean {
  if (row.completed_at) return true;
  return !!(row.buyer_confirmed_at && row.seller_confirmed_at);
}

function completedAtFromUnlockRow(row: {
  completed_at?: string | null;
  buyer_confirmed_at?: string | null;
  seller_confirmed_at?: string | null;
}): string | null {
  if (typeof row.completed_at === "string" && row.completed_at) return row.completed_at;
  const seller = row.seller_confirmed_at;
  const buyer = row.buyer_confirmed_at;
  if (typeof seller === "string" && seller && typeof buyer === "string" && buyer) {
    return seller > buyer ? seller : buyer;
  }
  return null;
}

/**
 * Your archived books after a completed deal: sold on your listing, or offered in a completed swap.
 */
export async function fetchMyRehomedListings(
  userId: string,
  limit = 50,
): Promise<RehomedListing[]> {
  const supabase = await createClient();
  const rehomedAtByListingId = new Map<string, string>();

  const { data: archivedRows, error: archivedErr } = await supabase
    .from("listings")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "archived");

  if (archivedErr) {
    console.error("[fetchMyRehomedListings] archived", archivedErr.message);
    return [];
  }

  const archivedIds = (archivedRows ?? []).map((r) => String(r.id)).filter(Boolean);
  if (archivedIds.length === 0) return [];

  const unlockSelect =
    "listing_id, offered_listing_id, completed_at, buyer_confirmed_at, seller_confirmed_at";

  const [{ data: soldUnlocks, error: soldErr }, { data: swapAwayUnlocks, error: swapErr }] =
    await Promise.all([
      supabase
        .from("listing_unlocks")
        .select(unlockSelect)
        .in("listing_id", archivedIds),
      supabase
        .from("listing_unlocks")
        .select(unlockSelect)
        .in("offered_listing_id", archivedIds)
        .eq("buyer_id", userId),
    ]);

  if (soldErr) {
    console.error("[fetchMyRehomedListings] sold unlocks", soldErr.message);
  }
  if (swapErr) {
    console.error("[fetchMyRehomedListings] swap-away unlocks", swapErr.message);
  }

  for (const row of [...(soldUnlocks ?? []), ...(swapAwayUnlocks ?? [])]) {
    if (!unlockRowIsCompleted(row)) continue;
    const at = completedAtFromUnlockRow(row);
    if (!at) continue;
    const soldId = row.listing_id;
    const offeredId = row.offered_listing_id;
    if (soldId && archivedIds.includes(String(soldId))) {
      mergeRehomedCompletedAt(rehomedAtByListingId, soldId, at);
    }
    if (offeredId && archivedIds.includes(String(offeredId))) {
      mergeRehomedCompletedAt(rehomedAtByListingId, offeredId, at);
    }
  }

  const listingIds = [...rehomedAtByListingId.keys()];
  if (listingIds.length === 0) return [];

  const res = await withUnlockCreditsRetry(
    () =>
      supabase
        .from("listings")
        .select(listingSelectWithUnlockCredits)
        .eq("user_id", userId)
        .in("id", listingIds),
    () =>
      supabase
        .from("listings")
        .select(listingSelectNoUnlockCredits)
        .eq("user_id", userId)
        .in("id", listingIds),
  );

  if (res.error) {
    console.error("[fetchMyRehomedListings] listings", res.error.message);
    return [];
  }

  const deduped: RehomedListing[] = listingRowsFromQueryData(res.data)
    .map((row) => {
      const id = String(row.id ?? "");
      const rehomedAt = rehomedAtByListingId.get(id);
      if (!rehomedAt) return null;
      return { ...normalizeListingRow(row), rehomedAt };
    })
    .filter((row): row is RehomedListing => row != null);

  deduped.sort((a, b) => (a.rehomedAt < b.rehomedAt ? 1 : -1));
  return attachPublicProfilesToListings(deduped.slice(0, limit));
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
  const rows = listingRowsFromQueryData(res.data);
  const normalized = rows.map((r) => normalizeListingRow(r));
  return attachPublicProfilesToListings(normalized);
}
