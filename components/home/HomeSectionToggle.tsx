"use client";

/**
 * Shared home section with Cards/Shelf toggle.
 * Location: components/home/HomeSectionToggle.tsx
 */
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingMiniCard } from "@/components/listings/ListingMiniCard";
import type { ListingWithRelations } from "@/lib/listings/queries";
import { Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Props = {
  title: string;
  /** Optional muted line under the title (e.g. how recommendations work). */
  subtitle?: string;
  listings: ListingWithRelations[];
  actionHref?: string;
  actionLabel?: string;
  defaultMode?: "cards" | "shelf";
  showStar?: boolean;
  /** Shown when `listings` is empty (rare after server fallbacks). */
  emptyMessage?: string;
};

export function HomeSectionToggle({
  title,
  subtitle,
  listings,
  actionHref,
  actionLabel,
  defaultMode = "cards",
  showStar = false,
  emptyMessage = "Nothing to show here yet.",
}: Props) {
  const [mode, setMode] = useState<"cards" | "shelf">(defaultMode);
  const isEmpty = listings.length === 0;

  return (
    <section className="space-y-3">
      <div className="space-y-1.5 px-0.5">
        <div className="flex items-end justify-between gap-2">
          <h2 className="shelfswap-heading flex items-center gap-2 text-lg font-semibold text-base-content">
            {showStar ? <Star className="h-4 w-4 text-warning" aria-hidden /> : null}
            {title}
          </h2>
          <div className="flex items-center gap-2">
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
        </div>
        {subtitle ? (
          <p className="text-[11px] leading-snug text-base-content/50 pr-4">{subtitle}</p>
        ) : null}
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-base-300/80 bg-base-100/80 px-4 py-6 text-center text-sm text-base-content/60">
          {emptyMessage}
        </div>
      ) : mode === "cards" ? (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-thin snap-x snap-mandatory">
          {listings.map((l) => (
            <div key={l.id} className="snap-start shrink-0 w-[9.75rem] sm:w-[10.25rem]">
              <ListingCard listing={l} compact />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 sm:gap-2">
          {listings.map((l) => (
            <ListingMiniCard key={l.id} listing={l} compact />
          ))}
        </div>
      )}

      {actionHref && actionLabel ? (
        <div className="flex justify-end">
          <Link href={actionHref} className="link link-primary text-xs">
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </section>
  );
}

