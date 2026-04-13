"use client";

/**
 * Instant Gallery/List switch for Browse: keeps listings in memory (no navigation).
 * Optionally syncs ?view= to the address bar via replaceState for sharing/bookmarks.
 * Location: components/browse/BrowseListingsViewToggle.tsx
 */
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingMiniCard } from "@/components/listings/ListingMiniCard";
import type { ListingWithRelations } from "@/lib/listings/queries";
import { Grid3X3, List } from "lucide-react";
import { useEffect, useState } from "react";

type ViewMode = "gallery" | "list";

type Props = {
  listings: ListingWithRelations[];
  initialView: ViewMode;
};

export function BrowseListingsViewToggle({ listings, initialView }: Props) {
  const [view, setView] = useState<ViewMode>(initialView);

  useEffect(() => {
    const path =
      view === "list" ? "/app/browse?view=list" : "/app/browse";
    window.history.replaceState(null, "", path);
  }, [view]);

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

      {view === "list" ? (
        <ul className="flex flex-col gap-3">
          {listings.map((l) => (
            <li key={l.id}>
              <ListingCard listing={l} variant="row" />
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
          {listings.map((l) => (
            <ListingMiniCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
