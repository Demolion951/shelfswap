"use client";

/**
 * Listing detail carousel — official catalogue first (with fallbacks), then seller photos.
 * Location: components/listings/ListingDetailCarousel.tsx
 */
import { firstSellerPhotoSrc, listingCoverCandidates, sortedListingPhotos } from "@/lib/listings/listingCover";
import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import type { ListingWithRelations } from "@/lib/listings/queries";
import { useMemo, useState } from "react";

type Props = {
  listing: ListingWithRelations;
};

function HeroCoverSlide({ candidates }: { candidates: string[] }) {
  const [index, setIndex] = useState(0);
  const src = candidates[index];

  if (!src || index >= candidates.length) {
    return (
      <div className="carousel-item flex min-h-[14rem] w-[85%] max-w-sm items-center justify-center rounded-lg bg-base-300/40 first:pl-0" aria-hidden />
    );
  }

  return (
    <div className="carousel-item w-[85%] max-w-sm first:pl-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="max-h-80 w-full rounded-lg object-contain bg-base-300/30"
        referrerPolicy="no-referrer"
        onError={() => setIndex((i) => i + 1)}
      />
    </div>
  );
}

export function ListingDetailCarousel({ listing }: Props) {
  const candidates = useMemo(() => {
    const chain = listingCoverCandidates(listing, "L");
    if (chain.length > 0) return chain;
    const fallback = firstSellerPhotoSrc(listing);
    return fallback ? [fallback] : [];
  }, [listing]);
  const photos = sortedListingPhotos(listing);

  if (candidates.length === 0 && photos.length === 0) {
    return (
      <div className="carousel carousel-center w-full gap-2 rounded-xl bg-base-200/50 p-2">
        <div className="carousel-item flex min-h-[14rem] w-full items-center justify-center rounded-lg bg-base-300/40" aria-hidden />
      </div>
    );
  }

  return (
    <div className="carousel carousel-center w-full gap-2 rounded-xl bg-base-200/50 p-2">
      {candidates.length > 0 ? <HeroCoverSlide candidates={candidates} /> : null}
      {photos.map((ph) => {
        if (!ph.url?.trim()) return null;
        const src = coverImageSrcForDisplay(ph.url) ?? ph.url;
        return (
          <div key={ph.id} className="carousel-item w-[85%] max-w-sm first:pl-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="max-h-80 w-full rounded-lg object-contain bg-base-300/30"
              referrerPolicy="no-referrer"
            />
          </div>
        );
      })}
    </div>
  );
}
