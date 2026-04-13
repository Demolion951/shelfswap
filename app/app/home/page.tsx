import { EmptyFeed } from "@/components/home/EmptyFeed";
import { HomeSectionToggle } from "@/components/home/HomeSectionToggle";
import {
  attachDistanceKmToListings,
  sortListingsByDistanceThenRecency,
} from "@/lib/listings/distance";
import { fetchRecentListings } from "@/lib/listings/queries";
import { recommendListingsForUser } from "@/lib/listings/recommendations";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  // Nearest-first among the latest listings (signed-in + rough areas); falls back to newest-only when no km.
  const all = sortListingsByDistanceThenRecency(
    await attachDistanceKmToListings(await fetchRecentListings(60)),
  );
  const newListings = all.slice(0, 12);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const excludeNew = new Set(newListings.map((l) => l.id));
  const notInNew = all.filter((l) => !excludeNew.has(l.id));
  const recommendedRaw = user
    ? await recommendListingsForUser(user.id, all, 12, excludeNew)
    : notInNew.slice(0, 12);
  // Small catalog: everything can be in "New", leaving nothing for recommendations — fall back so the row isn’t blank.
  let recommendedFilled =
    recommendedRaw.length > 0
      ? recommendedRaw
      : notInNew.length > 0
        ? notInNew.slice(0, 12)
        : all.slice(0, 12);
  recommendedFilled = sortListingsByDistanceThenRecency(recommendedFilled);

  const excludeRecommended = new Set([
    ...excludeNew,
    ...recommendedFilled.map((l) => l.id),
  ]);
  // `all` is already distance → recency; explore skips rows already in New / Recommended.
  const exploreUnique = all
    .filter((l) => !excludeRecommended.has(l.id))
    .slice(0, 24);
  const explore = exploreUnique.length > 0 ? exploreUnique : all.slice(0, 24);

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
      />

      <HomeSectionToggle
        title="Recommended for you"
        listings={recommendedFilled}
        actionHref="/app/search"
        actionLabel="Search"
        emptyMessage="Nothing to recommend yet — use Search or Browse to explore."
      />

      <HomeSectionToggle
        title="Explore all books"
        listings={explore}
        actionHref="/app/browse"
        actionLabel="View all"
        defaultMode="shelf"
      />
    </div>
  );
}
