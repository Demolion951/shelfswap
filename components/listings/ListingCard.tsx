"use client";

import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import {
  approxDistanceAlwaysVisibleLine,
  formatApproxDistanceKm,
} from "@/lib/geo/formatDistance";
import { CONDITION_LABELS, formatUnlockCredits } from "@/lib/listings/format";
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
};

function sortedPhotos(listing: ListingWithRelations) {
  const photos = listing.listing_photos ?? [];
  return [...photos].sort((a, b) => a.sort - b.sort);
}

export function ListingCard({ listing, variant = "grid" }: Props) {
  const photos = sortedPhotos(listing);
  const thumbRaw = photos[0]?.url ?? listing.cover_url;
  const thumb = thumbRaw ? coverImageSrcForDisplay(thumbRaw) ?? thumbRaw : null;
  const seller = listing.profiles?.display_name ?? "Seller";
  const cond = CONDITION_LABELS[listing.condition] ?? listing.condition;
  const credits = listing.unlock_credits === 2 ? 2 : 1;
  const distanceLine = approxDistanceAlwaysVisibleLine(listing.distance_km ?? null);
  const hasApproxKm = formatApproxDistanceKm(listing.distance_km ?? null) != null;

  const inner = (
    <>
      <figure
        className={
          variant === "row"
            ? "relative aspect-[3/4] w-full overflow-hidden rounded-l-[0.65rem] bg-base-300"
            : "relative aspect-[3/4] w-full overflow-hidden bg-base-300"
        }
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-base-content/40 px-1 text-center">
            No image
          </div>
        )}
      </figure>
      <div
        className={
          variant === "row"
            ? "flex h-full min-h-0 min-w-0 flex-col gap-1 py-0.5 pr-1"
            : "card-body gap-1.5 p-2.5"
        }
      >
        <div className={variant === "row" ? "min-w-0 space-y-0.5" : "contents"}>
          <h3
            className={
              variant === "row"
                ? "shelfswap-heading line-clamp-2 text-[0.92rem] font-semibold leading-tight text-base-content"
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
                  : "line-clamp-1 text-[0.72rem] leading-snug text-base-content/60"
              }
            >
              {listing.author}
            </p>
          ) : null}
        </div>
        <p
          className={
            variant === "row"
              ? "text-[0.9rem] font-semibold tabular-nums tracking-tight text-primary"
              : "text-[0.9rem] font-semibold tabular-nums text-primary"
          }
        >
          {formatUnlockCredits(credits)}
        </p>
        <div
          className={
            variant === "row"
              ? "flex flex-wrap items-center gap-1"
              : "flex flex-wrap items-center gap-1"
          }
        >
          <span className="badge badge-xs badge-ghost shrink-0 border-primary/20 text-primary">
            {cond}
          </span>
          {listing.open_to_swaps ? (
            <span className="badge badge-xs shrink-0 badge-accent badge-outline">Swaps</span>
          ) : null}
        </div>
        <p
          className={
            variant === "row"
              ? "mt-auto text-[0.68rem] leading-snug text-base-content/45"
              : "text-[0.7rem] leading-snug text-base-content/50"
          }
        >
          @{seller}
        </p>
        {listing.approx_area_text ? (
          <p className="text-[0.68rem] leading-snug text-base-content/50 line-clamp-1">
            {listing.approx_area_text} (approx.)
          </p>
        ) : null}
        <p
          className={
            variant === "row"
              ? `text-[0.68rem] leading-snug ${hasApproxKm ? "text-secondary" : "text-base-content/55"}`
              : `text-[0.68rem] leading-snug ${hasApproxKm ? "text-secondary" : "text-base-content/55"}`
          }
        >
          {distanceLine}
        </p>
      </div>
    </>
  );

  return (
    <Link
      href={`/app/listings/${listing.id}`}
      className={
        variant === "row"
          ? "card card-side card-compact bg-base-100 border border-base-300/80 shadow-sm transition hover:border-primary/30 hover:shadow-md"
          : "card card-compact bg-base-100 border border-base-300/80 shadow-sm transition hover:border-primary/30 hover:shadow-md"
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
