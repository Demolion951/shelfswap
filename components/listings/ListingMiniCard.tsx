"use client";

/**
 * Compact “shelf” card: small cover + essential info for dense grids.
 * Location: components/listings/ListingMiniCard.tsx
 */
import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import { formatUnlockCredits } from "@/lib/listings/format";
import type { ListingWithRelations } from "@/lib/listings/queries";
import Link from "next/link";

type Props = {
  listing: ListingWithRelations;
};

export function ListingMiniCard({ listing }: Props) {
  const photos = listing.listing_photos ?? [];
  const thumbRaw = photos[0]?.url ?? listing.cover_url;
  const thumb = thumbRaw ? coverImageSrcForDisplay(thumbRaw) ?? thumbRaw : null;
  const credits = listing.unlock_credits === 2 ? 2 : 1;

  return (
    <Link
      href={`/app/listings/${listing.id}`}
      className="group rounded-lg border border-base-300/80 bg-base-100 shadow-sm transition hover:border-primary/30"
    >
      <div className="p-2">
        <figure className="aspect-[3/4] w-full overflow-hidden rounded-md bg-base-300">
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
            <div className="flex h-full items-center justify-center text-[10px] text-base-content/35 px-1 text-center">
              No cover
            </div>
          )}
        </figure>

        <div className="mt-2 space-y-0.5">
          <h3 className="shelfswap-heading line-clamp-1 text-[11px] font-semibold leading-snug">
            {listing.title}
          </h3>
          {listing.author ? (
            <p className="line-clamp-1 text-[10px] text-base-content/55">
              {listing.author}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-[11px] font-semibold text-primary tabular-nums">
              {formatUnlockCredits(credits)}
            </span>
            {listing.approx_area_text ? (
              <span className="line-clamp-1 text-[10px] text-base-content/50">
                {listing.approx_area_text}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

