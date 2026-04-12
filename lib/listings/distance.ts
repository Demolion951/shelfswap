import { createClient } from "@/lib/supabase/server";
import type { ListingWithRelations } from "@/lib/listings/queries";

type DistanceRow = { listing_id: string; distance_km: number | null };

/**
 * Batch km from current user profile to listings (PostGIS). Null if either side has no point.
 * Location: lib/listings/distance.ts
 */
export async function attachDistanceKmToListings(
  listings: ListingWithRelations[],
): Promise<(ListingWithRelations & { distance_km: number | null })[]> {
  if (listings.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
): Promise<number | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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
