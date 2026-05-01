import { BrowseListingsViewToggle } from "@/components/browse/BrowseListingsViewToggle";
import {
  attachDistanceKmToListings,
  sortListingsByDistanceThenRecency,
} from "@/lib/listings/distance";
import { fetchRecentListings } from "@/lib/listings/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * Browse page: non-swipe discovery with instant client-side Gallery/List toggle.
 * Location: app/app/browse/page.tsx
 */
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const initialView = sp.view === "list" ? "list" : "gallery";
  const supabase = await createClient();
  const [recent, authRes] = await Promise.all([
    fetchRecentListings(120),
    supabase.auth.getUser(),
  ]);
  const all = sortListingsByDistanceThenRecency(
    await attachDistanceKmToListings(recent, authRes.data.user?.id ?? null),
  );

  return (
    <div className="pb-8 pt-1">
      <BrowseListingsViewToggle listings={all} initialView={initialView} />
    </div>
  );
}
