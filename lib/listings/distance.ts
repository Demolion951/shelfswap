import { createClient } from "@/lib/supabase/server";
import type { ListingWithRelations } from "@/lib/listings/queries";

type DistanceRow = { listing_id: string; distance_km: number | null };

type WithDistanceAndCreated = {
  distance_km?: number | null;
  created_at: string;
};

/**
 * Nearer listings first when km is known; unknown distance last; ties by newest first.
 * Location: lib/listings/distance.ts
 */
export function sortListingsByDistanceThenRecency<
  T extends WithDistanceAndCreated,
>(listings: T[]): T[] {
  return [...listings].sort((a, b) => {
    const ad = typeof a.distance_km === "number" ? a.distance_km : null;
    const bd = typeof b.distance_km === "number" ? b.distance_km : null;
    if (ad != null && bd != null && ad !== bd) return ad - bd;
    if (ad != null && bd == null) return -1;
    if (ad == null && bd != null) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/**
 * Batch km from current user profile to listings (PostGIS). Null if either side has no point.
 * Pass `viewerUserId` when the caller already resolved auth to skip an extra `getUser()` round trip.
 * Location: lib/listings/distance.ts
 */
export async function attachDistanceKmToListings(
  listings: ListingWithRelations[],
  viewerUserId?: string | null,
): Promise<(ListingWithRelations & { distance_km: number | null })[]> {
  if (listings.length === 0) {
    return [];
  }

  const supabase = await createClient();
  let userId: string | null;
  if (viewerUserId === undefined) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } else {
    userId = viewerUserId;
  }

  if (!userId) {
    return listings.map((l) => ({ ...l, distance_km: null }));
  }

  const ids = listings.map((l) => l.id);
  const { data, error } = await supabase.rpc("listing_distances_km", {
    p_listing_ids: ids,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (!msg.includes("does not exist") && !msg.includes("schema cache")) {
      console.error("[attachDistanceKmToListings]", error.message);
    }
    return listings.map((l) => ({ ...l, distance_km: null }));
  }

  const map = new Map<string, number | null>();
  for (const row of (data ?? []) as DistanceRow[]) {
    const km = row.distance_km;
    map.set(
      row.listing_id,
      typeof km === "number" && Number.isFinite(km) ? km : null,
    );
  }

  return listings.map((l) => ({
    ...l,
    distance_km: map.has(l.id) ? map.get(l.id)! : null,
  }));
}

export async function fetchDistanceKmForListing(
  listingId: string,
  viewerUserId?: string | null,
): Promise<number | null> {
  const supabase = await createClient();
  let userId: string | null;
  if (viewerUserId === undefined) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } else {
    userId = viewerUserId;
  }
  if (!userId) return null;

  const { data, error } = await supabase.rpc("listing_distances_km", {
    p_listing_ids: [listingId],
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (!msg.includes("does not exist") && !msg.includes("schema cache")) {
      console.error("[fetchDistanceKmForListing]", error.message);
    }
    return null;
  }

  const row = (data ?? [])[0] as DistanceRow | undefined;
  const km = row?.distance_km;
  return typeof km === "number" && Number.isFinite(km) ? km : null;
}
