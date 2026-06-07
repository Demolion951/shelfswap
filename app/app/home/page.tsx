import { EmptyFeed } from "@/components/home/EmptyFeed";
import { HomeSectionToggle } from "@/components/home/HomeSectionToggle";
import {
  attachDistanceKmToListings,
  sortListingsByDistanceThenRecency,
} from "@/lib/listings/distance";
import {
  fetchRecentListings,
  fetchSavedListingIdsForUser,
} from "@/lib/listings/queries";
import { recommendListingsForUser } from "@/lib/listings/recommendations";
import { createClient } from "@/lib/supabase/server";

/** Always fresh — feed sections depend on latest listings and viewer location. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const [recent, authRes] = await Promise.all([
    fetchRecentListings(120),
    supabase.auth.getUser(),
  ]);
  const user = authRes.data.user;

  const allWithDistance = await attachDistanceKmToListings(recent, user?.id ?? null);
  const all = sortListingsByDistanceThenRecency(allWithDistance);
  const newListings = all.slice(0, 12);

  const excludeNew = new Set(newListings.map((l) => l.id));
  const notInNew = all.filter((l) => !excludeNew.has(l.id));
  const recentIds = recent.map((l) => l.id);

  const [recommendedRaw, savedIdSet] = await Promise.all([
    user
      ? recommendListingsForUser(user.id, all, 12, excludeNew)
      : Promise.resolve(notInNew.slice(0, 12)),
    user
      ? fetchSavedListingIdsForUser(user.id, recentIds)
      : Promise.resolve(new Set<string>()),
  ]);
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
