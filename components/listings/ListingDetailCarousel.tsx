"use client";

/**
 * Listing detail carousel — reliable cover first, seller photos; no visible image cascade.
 * Location: components/listings/ListingDetailCarousel.tsx
 */
import { probeImageUrl } from "@/lib/client/probeImageUrl";
import {
  firstSellerPhotoSrc,
  hasReliableCatalogueCover,
  listingCoverCandidates,
  sortedListingPhotos,
} from "@/lib/listings/listingCover";
import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import type { ListingWithRelations } from "@/lib/listings/queries";
import { useEffect, useMemo, useState } from "react";

type Props = {
  listing: ListingWithRelations;
};

function normalizeKey(url: string): string {
  try {
    const u = new URL(url, "https://shelfswap.net");
    return u.pathname;
  } catch {
    return url;
  }
}

function HeroCoverSlide({ candidates }: { candidates: string[] }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    if (candidates.length === 0) return;
    if (candidates.length === 1) {
      setSrc(candidates[0]);
      return;
    }
    void (async () => {
      for (const url of candidates) {
        if (cancelled) return;
        if (await probeImageUrl(url, 6000)) {
          if (!cancelled) setSrc(url);
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [candidates]);

  if (!src) {
    return (
      <div className="carousel-item flex justify-center first:pl-0">
        <div
          className="h-56 w-36 animate-pulse rounded-lg bg-base-300/30"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="carousel-item flex justify-center first:pl-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="max-h-80 max-w-[min(85vw,20rem)] w-auto rounded-lg shadow-md"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export function ListingDetailCarousel({ listing }: Props) {
  const heroCandidates = useMemo(() => {
    const seller = firstSellerPhotoSrc(listing);
    if (seller && !hasReliableCatalogueCover(listing)) {
      return [seller];
    }
    const chain = listingCoverCandidates(listing, "L");
    if (chain.length > 0) return chain;
    return seller ? [seller] : [];
  }, [listing]);

  const photos = sortedListingPhotos(listing);
  const heroKeys = new Set(heroCandidates.map(normalizeKey));

  const extraPhotos = photos.filter((ph) => {
    if (!ph.url?.trim()) return false;
    const src = coverImageSrcForDisplay(ph.url) ?? ph.url;
    return !heroKeys.has(normalizeKey(src));
  });

  if (heroCandidates.length === 0 && extraPhotos.length === 0) {
    return (
      <div className="flex justify-center py-1">
        <div className="h-56 w-36 rounded-lg bg-base-300/30" aria-hidden />
      </div>
    );
  }

  return (
    <div className="carousel carousel-center w-full gap-3 py-1">
      {heroCandidates.length > 0 ? <HeroCoverSlide candidates={heroCandidates} /> : null}
      {extraPhotos.map((ph) => {
        const src = coverImageSrcForDisplay(ph.url) ?? ph.url;
        return (
          <div key={ph.id} className="carousel-item flex justify-center first:pl-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="max-h-80 max-w-[min(85vw,20rem)] w-auto rounded-lg shadow-md"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          </div>
        );
      })}
    </div>
  );
}
