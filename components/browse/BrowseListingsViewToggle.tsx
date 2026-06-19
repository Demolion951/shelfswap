"use client";

/**
 * Instant Gallery/List switch for Browse with genre filter chips.
 * Location: components/browse/BrowseListingsViewToggle.tsx
 */
import { BrowseGenreFilter } from "@/components/browse/BrowseGenreFilter";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingMiniCard } from "@/components/listings/ListingMiniCard";
import {
  BOOK_CATEGORY_LABELS,
  type BookCategory,
  isBookCategory,
} from "@/lib/books/bookCategory";
import type { ListingWithRelations } from "@/lib/listings/queries";
import { Grid3X3, List } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ViewMode = "gallery" | "list";

type Props = {
  listings: ListingWithRelations[];
  initialView: ViewMode;
  initialGenre: BookCategory | null;
};

function buildBrowsePath(view: ViewMode, genre: BookCategory | null): string {
  const params = new URLSearchParams();
  if (view === "list") params.set("view", "list");
  if (genre) params.set("genre", genre);
  const q = params.toString();
  return q ? `/app/browse?${q}` : "/app/browse";
}

export function BrowseListingsViewToggle({ listings, initialView, initialGenre }: Props) {
  const [view, setView] = useState<ViewMode>(initialView);
  const [genre, setGenre] = useState<BookCategory | null>(initialGenre);

  useEffect(() => {
    setGenre(initialGenre);
  }, [initialGenre]);

  useEffect(() => {
    window.history.replaceState(null, "", buildBrowsePath(view, genre));
  }, [view, genre]);

  const genreCounts = useMemo(() => {
    const counts: Record<BookCategory | "all", number> = {
      all: listings.length,
      fiction: 0,
      non_fiction: 0,
      childrens: 0,
    };
    for (const l of listings) {
      const cat = l.book_category;
      if (isBookCategory(cat)) counts[cat] += 1;
    }
    return counts;
  }, [listings]);

  const filtered = useMemo(() => {
    if (!genre) return listings;
    return listings.filter((l) => l.book_category === genre);
  }, [listings, genre]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="shelfswap-heading text-xl font-semibold text-primary">
          Browse
        </h1>
        <div className="join" role="group" aria-label="Browse layout">
          <button
            type="button"
            className={`btn btn-xs join-item ${view === "gallery" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setView("gallery")}
            aria-pressed={view === "gallery"}
          >
            <Grid3X3 className="h-4 w-4" aria-hidden />
            Gallery
          </button>
          <button
            type="button"
            className={`btn btn-xs join-item ${view === "list" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
          >
            <List className="h-4 w-4" aria-hidden />
            List
          </button>
        </div>
      </div>

      <BrowseGenreFilter active={genre} onChange={setGenre} counts={genreCounts} />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-base-300/80 bg-base-100 p-8 text-center text-sm text-base-content/60">
          {genre ? (
            <p>
              No {BOOK_CATEGORY_LABELS[genre].toLowerCase()} listings nearby yet. Try{" "}
              <button type="button" className="link link-primary" onClick={() => setGenre(null)}>
                all genres
              </button>
              .
            </p>
          ) : (
            <p>No listings to browse yet.</p>
          )}
        </div>
      ) : view === "list" ? (
        <ul className="flex flex-col gap-3">
          {filtered.map((l, i) => (
            <li key={l.id}>
              <ListingCard listing={l} variant="row" priorityImage={i < 8} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-3 items-start gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
          {filtered.map((l, i) => (
            <ListingMiniCard key={l.id} listing={l} priorityImage={i < 18} />
          ))}
        </div>
      )}
    </div>
  );
}
