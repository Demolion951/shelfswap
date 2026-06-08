import { BrowseListingsViewToggle } from "@/components/browse/BrowseListingsViewToggle";
import { getCachedAuthUser } from "@/lib/auth/session";
import {
  attachDistanceKmToListings,
  sortListingsByDistanceThenRecency,
} from "@/lib/listings/distance";
import { fetchRecentListings } from "@/lib/listings/queries";

const BROWSE_POOL_LIMIT = 72;

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
  const user = await getCachedAuthUser();
  const recent = await fetchRecentListings(BROWSE_POOL_LIMIT, user?.id ?? null);
  const all = sortListingsByDistanceThenRecency(
    await attachDistanceKmToListings(recent, user?.id ?? null),
  );

  return (
    <div className="pb-8 pt-1">
      <BrowseListingsViewToggle listings={all} initialView={initialView} />
    </div>
  );
}
