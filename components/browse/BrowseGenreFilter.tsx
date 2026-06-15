"use client";

/**
 * Genre chips for Browse (Fiction / Non-fiction / Children's) — syncs ?genre= in the URL.
 * Location: components/browse/BrowseGenreFilter.tsx
 */
import {
  BOOK_CATEGORIES,
  BOOK_CATEGORY_LABELS,
  type BookCategory,
} from "@/lib/books/bookCategory";

type Props = {
  active: BookCategory | null;
  onChange: (genre: BookCategory | null) => void;
  counts: Record<BookCategory | "all", number>;
};

export function BrowseGenreFilter({ active, onChange, counts }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by genre">
      <button
        type="button"
        className={`btn btn-xs ${active === null ? "btn-primary" : "btn-ghost border border-base-300/80"}`}
        onClick={() => onChange(null)}
        aria-pressed={active === null}
      >
        All
        <span className="ml-1 tabular-nums opacity-70">{counts.all}</span>
      </button>
      {BOOK_CATEGORIES.map((genre) => (
        <button
          key={genre}
          type="button"
          className={`btn btn-xs ${active === genre ? "btn-primary" : "btn-ghost border border-base-300/80"}`}
          onClick={() => onChange(genre)}
          aria-pressed={active === genre}
        >
          {BOOK_CATEGORY_LABELS[genre]}
          <span className="ml-1 tabular-nums opacity-70">{counts[genre]}</span>
        </button>
      ))}
    </div>
  );
}
