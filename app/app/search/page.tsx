import { ListingCard } from "@/components/listings/ListingCard";
import { SearchBar } from "@/components/search/SearchBar";
import { attachDistanceKmToListings } from "@/lib/listings/distance";
import { searchListingsByText } from "@/lib/listings/queries";
import { Suspense } from "react";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query
    ? await attachDistanceKmToListings(await searchListingsByText(query))
    : [];

  return (
    <div className="space-y-5 pt-2">
      <div>
        <h1 className="shelfswap-heading text-2xl font-semibold text-primary">Search</h1>
      </div>

      <Suspense
        fallback={
          <div className="skeleton h-12 w-full rounded-lg bg-base-200" />
        }
      >
        <SearchBar />
      </Suspense>

      {!query ? (
        <p className="text-center text-sm text-base-content/55 py-8">
          Find books nearby.
        </p>
      ) : results.length === 0 ? (
        <div className="card bg-base-100 border border-base-300/60">
          <div className="card-body items-center py-10 text-center">
            <p className="text-sm text-base-content/65">No matches for “{query}”.</p>
            <p className="text-xs text-base-content/45">Try another keyword or list this book yourself.</p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {results.map((l) => (
            <li key={l.id}>
              <ListingCard listing={l} variant="row" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
