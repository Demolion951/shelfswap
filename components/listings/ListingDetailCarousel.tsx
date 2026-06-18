"use client";

/**
 * Listing detail carousel — catalogue cover first, then every seller photo as its own slide.
 * Location: components/listings/ListingDetailCarousel.tsx
 */
import {
  listingCatalogueCoverCandidates,
  sortedListingPhotos,
} from "@/lib/listings/listingCover";
import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import type { ListingWithRelations } from "@/lib/listings/queries";
import { useEffect, useMemo, useState } from "react";

type Props = {
  listing: ListingWithRelations;
};

function HeroCoverSlide({ candidates }: { candidates: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidates]);

  const advance = () => {
    setIndex((i) => (i + 1 < candidates.length ? i + 1 : -1));
  };

  const src = index >= 0 ? (candidates[index] ?? null) : null;

  if (!src) {
    return (
      <div className="carousel-item flex justify-center first:pl-0">
        <div className="h-56 w-36 rounded-lg bg-base-300/30" aria-hidden />
      </div>
    );
  }

  return (
    <div className="carousel-item flex justify-center first:pl-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        src={src}
        alt=""
        className="max-h-80 max-w-[min(85vw,20rem)] w-auto rounded-lg shadow-md"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth < 20 || img.naturalHeight < 20) {
            advance();
          }
        }}
        onError={() => {
          advance();
        }}
      />
    </div>
  );
}

export function ListingDetailCarousel({ listing }: Props) {
  const catalogueCandidates = useMemo(
    () => listingCatalogueCoverCandidates(listing, "L"),
    [listing],
  );

  const sellerPhotos = useMemo(() => {
    return sortedListingPhotos(listing)
      .filter((ph) => ph.url?.trim())
      .map((ph) => ({
        id: ph.id,
        src: coverImageSrcForDisplay(ph.url) ?? ph.url.trim(),
      }));
  }, [listing]);

  const slideCount =
    (catalogueCandidates.length > 0 ? 1 : 0) + sellerPhotos.length;

  if (slideCount === 0) {
    return (
      <div className="flex justify-center py-1">
        <div className="h-56 w-36 rounded-lg bg-base-300/30" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="carousel carousel-center w-full gap-3 py-1">
        {catalogueCandidates.length > 0 ? (
          <HeroCoverSlide candidates={catalogueCandidates} />
        ) : null}
        {sellerPhotos.map((ph) => (
          <div key={ph.id} className="carousel-item flex justify-center first:pl-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ph.src}
              alt=""
              className="max-h-80 max-w-[min(85vw,20rem)] w-auto rounded-lg shadow-md"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          </div>
        ))}
      </div>
      {slideCount > 1 ? (
        <p className="text-center text-[11px] text-base-content/45">
          Swipe for {catalogueCandidates.length > 0 ? "seller photos" : "more photos"}
        </p>
      ) : null}
    </div>
  );
}
