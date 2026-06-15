import { BrowseListingsViewToggle } from "@/components/browse/BrowseListingsViewToggle";
import { getCachedAuthUser } from "@/lib/auth/session";
import { isBookCategory } from "@/lib/books/bookCategory";
import {
  attachDistanceKmToListings,
  sortListingsByDistanceThenRecency,
} from "@/lib/listings/distance";
import { backfillMissingBookCategories } from "@/lib/listings/backfillBookCategories";
import { fetchRecentListings } from "@/lib/listings/queries";
import { after } from "next/server";

const BROWSE_POOL_LIMIT = 72;

/**
 * Browse page: non-swipe discovery with genre filter and instant client-side Gallery/List toggle.
 * Location: app/app/browse/page.tsx
 */
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; genre?: string }>;
}) {
  const sp = await searchParams;
  const initialView = sp.view === "list" ? "list" : "gallery";
  const initialGenre = isBookCategory(sp.genre) ? sp.genre : null;
  const user = await getCachedAuthUser();
  const recent = await fetchRecentListings(BROWSE_POOL_LIMIT, user?.id ?? null);
  const all = sortListingsByDistanceThenRecency(
    await attachDistanceKmToListings(recent, user?.id ?? null),
  );

  after(async () => {
    await backfillMissingBookCategories();
  });

  return (
    <div className="pb-8 pt-1">
      <BrowseListingsViewToggle
        listings={all}
        initialView={initialView}
        initialGenre={initialGenre}
      />
    </div>
  );
}
