import { BrowseListingsViewToggle } from "@/components/browse/BrowseListingsViewToggle";
import {
  attachDistanceKmToListings,
  sortListingsByDistanceThenRecency,
} from "@/lib/listings/distance";
import { fetchRecentListings } from "@/lib/listings/queries";

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
  const all = sortListingsByDistanceThenRecency(
    await attachDistanceKmToListings(await fetchRecentListings(120)),
  );

  return (
    <div className="pb-8 pt-1">
      <BrowseListingsViewToggle listings={all} initialView={initialView} />
    </div>
  );
}
