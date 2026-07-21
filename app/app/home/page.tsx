import { EmptyFeed } from "@/components/home/EmptyFeed";
import { HomeSectionToggle } from "@/components/home/HomeSectionToggle";
import { getCachedAuthUser } from "@/lib/auth/session";
import {
  attachDistanceKmToListings,
  sortListingsByDistanceThenRecency,
} from "@/lib/listings/distance";
import {
  fetchRecentListings,
  fetchSavedListingIdsForUser,
} from "@/lib/listings/queries";
import {
  fetchRecommendEventsForUser,
  recommendListingsForUser,
} from "@/lib/listings/recommendations";

/** Always fresh on full load — client staleTimes still softens tab switches. */
export const dynamic = "force-dynamic";

const HOME_POOL_LIMIT = 64;

/**
 * Home feed. Parallelizes distance, saves, and recommend-events after the listing pool loads.
 * Location: app/app/home/page.tsx
 */
export default async function HomePage() {
  const user = await getCachedAuthUser();
  const userId = user?.id ?? null;
  const recent = await fetchRecentListings(HOME_POOL_LIMIT, userId);
  const recentIds = recent.map((l) => l.id);

  // Distance + saves + recommend events in one wave (was sequential before recommend).
  const [allWithDistance, savedIdSet, recommendEvents] = await Promise.all([
    attachDistanceKmToListings(recent, userId),
    userId
      ? fetchSavedListingIdsForUser(userId, recentIds)
      : Promise.resolve(new Set<string>()),
    userId ? fetchRecommendEventsForUser(userId) : Promise.resolve(null),
  ]);

  const all = sortListingsByDistanceThenRecency(allWithDistance);
  const newListings = all.slice(0, 12);

  const excludeNew = new Set(newListings.map((l) => l.id));
  const notInNew = all.filter((l) => !excludeNew.has(l.id));

  let recommendedRaw: typeof all;
  if (!userId) {
    recommendedRaw = notInNew.slice(0, 12);
  } else if (recommendEvents !== null) {
    recommendedRaw = await recommendListingsForUser(
      userId,
      all,
      12,
      excludeNew,
      recommendEvents,
    );
  } else {
    recommendedRaw = await recommendListingsForUser(userId, all, 12, excludeNew);
  }

  // Small catalog: if nothing left after New, still show picks from the full pool (may overlap New).
  let recommendedFilled =
    recommendedRaw.length > 0
      ? recommendedRaw
      : notInNew.length > 0
        ? notInNew.slice(0, 12)
        : all.slice(0, 12);
  recommendedFilled = sortListingsByDistanceThenRecency(recommendedFilled);

  // Shelf preview of the full local catalog (same order as Browse). Overlap with rows above is fine —
  // New/Recommended are curated carousels; Explore is “see everything nearby”.
  const exploreListings = all.slice(0, 24);

  const savedListingIds = [...savedIdSet];
  const showSaveHearts = !!user;

  if (all.length === 0) {
    return (
      <div className="space-y-6 pt-2">
        <div>
          <h1 className="shelfswap-heading text-3xl font-semibold text-primary">
            Good to see you
          </h1>
          <p className="mt-1 text-sm text-base-content/65">
            Discover books around you — list one in under a minute.
          </p>
        </div>
        <EmptyFeed />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-2">
      <HomeSectionToggle
        title="New Listings"
        listings={newListings}
        actionHref="/app/browse"
        actionLabel="View all"
        defaultMode="shelf"
        showStar={true}
        showSaveHearts={showSaveHearts}
        savedListingIds={savedListingIds}
      />

      <HomeSectionToggle
        title="Recommended for you"
        listings={recommendedFilled}
        emptyMessage="Nothing to recommend yet — use Search or Browse to explore."
        showSaveHearts={showSaveHearts}
        savedListingIds={savedListingIds}
      />

      <HomeSectionToggle
        title="Explore all books"
        listings={exploreListings}
        actionHref="/app/browse"
        actionLabel="View all"
        defaultMode="shelf"
        showSaveHearts={showSaveHearts}
        savedListingIds={savedListingIds}
      />
    </div>
  );
}
