"use client";

/**
 * Compact “shelf” card: small cover + essential info for dense grids.
 * Location: components/listings/ListingMiniCard.tsx
 */
import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import {
  approxDistanceAlwaysVisibleLine,
  formatApproxDistanceKm,
} from "@/lib/geo/formatDistance";
import { formatUnlockCredits } from "@/lib/listings/format";
import type { ListingWithRelations } from "@/lib/listings/queries";
import Link from "next/link";

type Props = {
  listing: ListingWithRelations;
  /** Even denser grid (home shelf). */
  compact?: boolean;
};

export function ListingMiniCard({ listing, compact = false }: Props) {
  const photos = listing.listing_photos ?? [];
  const thumbRaw = photos[0]?.url ?? listing.cover_url;
  const thumb = thumbRaw ? coverImageSrcForDisplay(thumbRaw) ?? thumbRaw : null;
  const credits = listing.unlock_credits === 2 ? 2 : 1;
  const km = listing.distance_km ?? null;
  const distLine =
    formatApproxDistanceKm(km) ?? approxDistanceAlwaysVisibleLine(km);

  return (
    <Link
      href={`/app/listings/${listing.id}`}
      className="group rounded-lg border border-base-300/80 bg-base-100 shadow-sm transition hover:border-primary/30"
    >
      <div className={compact ? "p-1.5" : "p-2"}>
        <figure
          className={`aspect-[3/4] w-full overflow-hidden bg-base-300 ${compact ? "rounded" : "rounded-md"}`}
        >
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className={
                compact
                  ? "flex h-full items-center justify-center text-[9px] text-base-content/35 px-0.5 text-center"
                  : "flex h-full items-center justify-center text-[10px] text-base-content/35 px-1 text-center"
              }
            >
              No cover
            </div>
          )}
        </figure>

        <div className={compact ? "mt-1.5 space-y-0.5" : "mt-2 space-y-0.5"}>
          <h3
            className={
              compact
                ? "shelfswap-heading line-clamp-2 text-[10px] font-semibold leading-snug"
                : "shelfswap-heading line-clamp-1 text-[11px] font-semibold leading-snug"
            }
          >
            {listing.title}
          </h3>
          {listing.author ? (
            <p
              className={
                compact
                  ? "line-clamp-1 text-[9px] text-base-content/55"
                  : "line-clamp-1 text-[10px] text-base-content/55"
              }
            >
              {listing.author}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span
              className={
                compact
                  ? "text-[10px] font-semibold text-primary tabular-nums"
                  : "text-[11px] font-semibold text-primary tabular-nums"
              }
            >
              {formatUnlockCredits(credits)}
            </span>
          </div>
          <div
            className={
              compact
                ? "space-y-0.5 text-[9px] leading-snug text-base-content/50"
                : "space-y-0.5 text-[10px] leading-snug text-base-content/50"
            }
          >
            {listing.approx_area_text?.trim() ? (
              <p className="line-clamp-2">
                <span className="text-base-content/40">Area: </span>
                {listing.approx_area_text.trim()}
              </p>
            ) : null}
            <p className="line-clamp-2 text-base-content/55">
              <span className="text-base-content/40">Dist: </span>
              {distLine}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

