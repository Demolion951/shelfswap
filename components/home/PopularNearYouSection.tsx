"use client";

/**
 * Popular section with Card/List toggle.
 * Location: components/home/PopularNearYouSection.tsx
 */
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingMiniCard } from "@/components/listings/ListingMiniCard";
import type { ListingWithRelations } from "@/lib/listings/queries";
import { useState } from "react";

type Props = {
  listings: ListingWithRelations[];
};

export function PopularNearYouSection({ listings }: Props) {
  const [mode, setMode] = useState<"cards" | "shelf">("cards");

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-2 px-0.5">
        <h2 className="shelfswap-heading text-lg font-semibold text-base-content">
          Popular near you
        </h2>
        <div className="join">
          <button
            type="button"
            className={`btn btn-xs join-item ${mode === "cards" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setMode("cards")}
          >
            Cards
          </button>
          <button
            type="button"
            className={`btn btn-xs join-item ${mode === "shelf" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setMode("shelf")}
          >
            Shelf
          </button>
        </div>
      </div>

      {mode === "cards" ? (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-thin snap-x snap-mandatory">
          {listings.map((l) => (
            <div key={l.id} className="snap-start shrink-0 w-[12.5rem]">
              <ListingCard listing={l} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 items-start gap-2 sm:grid-cols-4">
          {listings.map((l) => (
            <ListingMiniCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </section>
  );
}

