import { EmptyFeed } from "@/components/home/EmptyFeed";
import { FeedSection } from "@/components/home/FeedSection";
import { ListingCard } from "@/components/listings/ListingCard";
import { fetchRecentListings } from "@/lib/listings/queries";
import Link from "next/link";

export default async function HomePage() {
  const all = await fetchRecentListings(36);

  const byPhotos = [...all].sort(
    (a, b) => (b.listing_photos?.length ?? 0) - (a.listing_photos?.length ?? 0),
  );

  const newNear = all.slice(0, 12);
  const popular = byPhotos.slice(0, 12);
  const picked = all.slice(3, 15);

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
      <div>
        <h1 className="shelfswap-heading text-3xl font-semibold text-primary">Discover</h1>
        <p className="mt-1 text-sm text-base-content/65">
          Rule-based feeds for now — personalisation grows as you browse.
        </p>
      </div>

      <FeedSection
        title="Recommended for you"
        subtitle="Based on what’s new in your area"
        action={
          <Link href="/app/search" className="btn btn-ghost btn-xs text-primary">
            Search
          </Link>
        }
      >
        {picked.map((l) => (
          <div key={l.id} className="snap-start shrink-0 w-[14rem]">
            <ListingCard listing={l} />
          </div>
        ))}
      </FeedSection>

      <FeedSection title="Popular near you" subtitle="Listings with rich photos">
        {popular.map((l) => (
          <div key={l.id} className="snap-start shrink-0 w-[14rem]">
            <ListingCard listing={l} />
          </div>
        ))}
      </FeedSection>

      <FeedSection
        title="New near you"
        subtitle="Freshly listed"
        action={
          <Link href="/app/sell" className="btn btn-primary btn-xs">
            Sell
          </Link>
        }
      >
        {newNear.map((l) => (
          <div key={l.id} className="snap-start shrink-0 w-[min(100%,16rem)]">
            <ListingCard listing={l} variant="row" />
          </div>
        ))}
      </FeedSection>
    </div>
  );
}
