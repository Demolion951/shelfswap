"use client";

/**
 * Compact “shelf” card: small cover + essential info for dense grids.
 * Location: components/listings/ListingMiniCard.tsx
 */
import { ListingCardSaveHeart } from "@/components/listings/ListingCardSaveHeart";
import { ListingCoverImage } from "@/components/listings/ListingCoverImage";
import { listingAreaLine } from "@/lib/listings/areaDisplay";
import { formatBindingType } from "@/lib/listings/format";
import type { ListingWithRelations } from "@/lib/listings/queries";
import Link from "next/link";

type Props = {
  listing: ListingWithRelations;
  /** Even denser grid (home shelf). */
  compact?: boolean;
  showSaveHeart?: boolean;
  initiallySaved?: boolean;
  priorityImage?: boolean;
};

export function ListingMiniCard({
  listing,
  compact = false,
  showSaveHeart = false,
  initiallySaved = false,
  priorityImage = false,
}: Props) {
  const binding = formatBindingType(listing.unlock_credits === 2 ? 2 : 1);
  const areaLine = listingAreaLine(listing.approx_area_text);

  return (
    <Link
      prefetch
      href={`/app/listings/${listing.id}`}
      className="group block w-full self-start rounded-lg border border-base-300/80 bg-base-100 shadow-sm transition hover:border-primary/30"
    >
      <div className={compact ? "p-1.5" : "p-2"}>
        <figure
          className={`relative aspect-[2/3] w-full overflow-hidden bg-base-300 ${compact ? "rounded" : "rounded-md"}`}
        >
          <ListingCoverImage
            listing={listing}
            size="L"
            className="h-full w-full object-cover object-center transition-transform duration-200 group-hover:scale-[1.02]"
            loading={priorityImage ? "eager" : "lazy"}
            fetchPriority={priorityImage ? "high" : "auto"}
            noCoverClassName={
              compact
                ? "absolute inset-0 flex items-center justify-center text-[9px] text-base-content/35 px-0.5 text-center"
                : "absolute inset-0 flex items-center justify-center text-[10px] text-base-content/35 px-1 text-center"
            }
          />
        </figure>

        <div className={`min-h-0 ${compact ? "mt-1.5" : "mt-2"}`}>
          <h3
            className={
              compact
                ? "shelfswap-heading line-clamp-2 text-[10px] font-semibold leading-snug"
                : "shelfswap-heading line-clamp-2 text-[11px] font-semibold leading-snug"
            }
          >
            {listing.title}
          </h3>
          {listing.author ? (
            <p
              className={
                compact
                  ? "mt-0.5 line-clamp-1 text-[9px] text-base-content/55"
                  : "mt-0.5 line-clamp-1 text-[10px] text-base-content/55"
              }
            >
              {listing.author}
            </p>
          ) : null}
          <div className="mt-0.5 flex items-end justify-between gap-1">
            <div className="min-w-0 flex-1 space-y-0.5">
              <span
                className={
                  compact
                    ? "block text-[10px] font-medium text-base-content/70 leading-none"
                    : "block text-[11px] font-medium text-base-content/70 leading-none"
                }
              >
                {binding}
              </span>
              {areaLine ? (
                <p
                  className={
                    compact
                      ? "line-clamp-2 text-[9px] leading-snug text-base-content/60"
                      : "line-clamp-2 text-[10px] leading-snug text-base-content/60"
                  }
                >
                  {areaLine}
                </p>
              ) : null}
            </div>
            {showSaveHeart ? (
              <ListingCardSaveHeart
                listingId={listing.id}
                initiallySaved={initiallySaved}
                compact={compact}
              />
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
