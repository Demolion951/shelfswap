"use client";

import { ListingCardSaveHeart } from "@/components/listings/ListingCardSaveHeart";
import { ListingCoverImage } from "@/components/listings/ListingCoverImage";
import { listingAreaLine } from "@/lib/listings/areaDisplay";
import { CONDITION_LABELS, formatBindingType } from "@/lib/listings/format";
import type { ListingWithRelations } from "@/lib/listings/queries";
import Link from "next/link";

/**
 * Compact listing preview for feeds and search — links to detail.
 * Location: components/listings/ListingCard.tsx
 */
type Props = {
  listing: ListingWithRelations;
  /** When true, uses horizontal layout for carousel rows */
  variant?: "grid" | "row";
  /** Tighter typography and padding (e.g. home carousel). */
  compact?: boolean;
  /** Show save heart overlay (signed-in home/browse). */
  showSaveHeart?: boolean;
  initiallySaved?: boolean;
  /** Eager-load cover for above-the-fold carousel items. */
  priorityImage?: boolean;
};


export function ListingCard({
  listing,
  variant = "grid",
  compact = false,
  showSaveHeart = false,
  initiallySaved = false,
  priorityImage = false,
}: Props) {
  const cond = CONDITION_LABELS[listing.condition] ?? listing.condition;
  const binding = formatBindingType(listing.unlock_credits === 2 ? 2 : 1);
  const areaLine = listingAreaLine(listing.approx_area_text);

  const inner = (
    <>
      <figure
        className={
          variant === "row"
            ? "relative aspect-[3/4] w-full overflow-hidden rounded-l-[0.65rem] bg-base-300"
            : "relative aspect-[3/4] w-full overflow-hidden bg-base-300"
        }
      >
        <ListingCoverImage
          listing={listing}
          size="M"
          className="h-full w-full object-cover"
          loading={priorityImage ? "eager" : "lazy"}
          fetchPriority={priorityImage ? "high" : "auto"}
          noCoverClassName={
            compact
              ? "flex h-full items-center justify-center text-[10px] text-base-content/40 px-1 text-center"
              : "flex h-full items-center justify-center text-xs text-base-content/40 px-1 text-center"
          }
        />
      </figure>
      <div
        className={
          variant === "row"
            ? "flex h-full min-h-0 min-w-0 flex-col gap-1 py-0.5 pr-1"
            : compact
              ? "card-body gap-1 p-2"
              : "card-body gap-1.5 p-2.5"
        }
      >
        <div className={variant === "row" ? "min-w-0 space-y-0.5" : "contents"}>
          <h3
            className={
              variant === "row"
                ? "shelfswap-heading line-clamp-2 text-[0.92rem] font-semibold leading-tight text-base-content"
                : compact
                  ? "shelfswap-heading line-clamp-2 text-[0.8rem] font-semibold leading-tight text-base-content"
                  : "shelfswap-heading line-clamp-2 text-[0.95rem] font-semibold leading-tight text-base-content"
            }
          >
            {listing.title}
          </h3>
          {listing.author ? (
            <p
              className={
                variant === "row"
                  ? "line-clamp-1 text-[0.78rem] leading-snug text-base-content/60"
                  : compact
                    ? "line-clamp-1 text-[0.65rem] leading-snug text-base-content/60"
                    : "line-clamp-1 text-[0.72rem] leading-snug text-base-content/60"
              }
            >
              {listing.author}
            </p>
          ) : null}
        </div>
        {variant === "row" ? (
          <>
            <p className="text-[0.9rem] font-medium text-base-content/75">{binding}</p>
            <div className="flex flex-wrap items-center gap-1">
              <span className="badge badge-xs badge-ghost shrink-0 border-primary/20 text-primary">
                {cond}
              </span>
              {listing.open_to_swaps ? (
                <span className="badge badge-xs shrink-0 badge-accent badge-outline">Swaps</span>
              ) : null}
            </div>
            {areaLine || showSaveHeart ? (
              <div className="mt-auto flex items-end justify-between gap-1">
                {areaLine ? (
                  <p className="min-w-0 flex-1 text-[0.68rem] leading-snug line-clamp-2 text-base-content/65">
                    {areaLine}
                  </p>
                ) : (
                  <span className="flex-1" aria-hidden />
                )}
                {showSaveHeart ? (
                  <ListingCardSaveHeart
                    listingId={listing.id}
                    initiallySaved={initiallySaved}
                    compact={compact}
                  />
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <p
              className={
                compact
                  ? "text-[0.78rem] font-semibold tabular-nums text-primary"
                  : "text-[0.9rem] font-semibold tabular-nums text-primary"
              }
            >
              {binding}
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <span className="badge badge-xs badge-ghost shrink-0 border-primary/20 text-primary">
                {cond}
              </span>
              {listing.open_to_swaps ? (
                <span className="badge badge-xs shrink-0 badge-accent badge-outline">Swaps</span>
              ) : null}
            </div>
            {(areaLine || showSaveHeart) ? (
              <div className="flex items-end justify-between gap-1">
                {areaLine ? (
                  <p
                    className={
                      compact
                        ? "min-w-0 flex-1 line-clamp-2 text-[0.6rem] leading-snug text-base-content/65"
                        : "min-w-0 flex-1 line-clamp-2 text-[0.68rem] leading-snug text-base-content/65"
                    }
                  >
                    {areaLine}
                  </p>
                ) : (
                  <span className="flex-1" aria-hidden />
                )}
                {showSaveHeart ? (
                  <ListingCardSaveHeart
                    listingId={listing.id}
                    initiallySaved={initiallySaved}
                    compact={compact}
                  />
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );

  return (
    <Link
      prefetch
      href={`/app/listings/${listing.id}`}
      className={
        variant === "row"
          ? "card card-side card-compact self-start bg-base-100 border border-base-300/80 shadow-sm transition hover:border-primary/30 hover:shadow-md"
          : "card card-compact self-start bg-base-100 border border-base-300/80 shadow-sm transition hover:border-primary/30 hover:shadow-md"
      }
    >
      {variant === "row" ? (
        <div className="grid w-full grid-cols-[5.75rem_1fr] items-stretch gap-2.5 p-2.5">
          {inner}
        </div>
      ) : (
        <div className="flex flex-col">{inner}</div>
      )}
    </Link>
  );
}
