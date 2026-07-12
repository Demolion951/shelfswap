"use client";

/**
 * Listing card cover — catalogue API first, seller photos only on fallback.
 * Location: components/listings/ListingCoverImage.tsx
 */
import { CoverImageChain } from "@/components/listings/CoverImageChain";
import {
  firstSellerPhotoSrc,
  listingCoverCandidatesForCard,
} from "@/lib/listings/listingCover";
import type { ListingWithRelations } from "@/lib/listings/queries";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  listing: ListingWithRelations;
  size?: "S" | "M" | "L";
  className?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "auto";
  noCoverClassName?: string;
};

export function ListingCoverImage({
  listing,
  size = "L",
  className = "h-full w-full object-cover",
  loading = "lazy",
  fetchPriority = "auto",
  noCoverClassName = "h-full w-full bg-base-300/45",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const candidates = useMemo(() => {
    const chain = listingCoverCandidatesForCard(listing, size);
    if (chain.length > 0) return chain;
    const fallback = firstSellerPhotoSrc(listing);
    return fallback ? [fallback] : [];
  }, [listing, size]);

  const [nearViewport, setNearViewport] = useState(
    loading === "eager" || fetchPriority === "high",
  );

  useEffect(() => {
    if (nearViewport || candidates.length === 0) return;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "280px 0px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nearViewport, candidates.length]);

  if (!nearViewport) {
    return (
      <div
        ref={rootRef}
        className={`${noCoverClassName} animate-pulse bg-base-300/55`}
        aria-hidden
      />
    );
  }

  // Absolute fill keeps the cover inside the card's aspect box (avoids overflow with object-contain).
  return (
    <div ref={rootRef} className="absolute inset-0 h-full w-full">
      <CoverImageChain
        candidates={candidates}
        className={className}
        noCoverClassName={noCoverClassName}
        loading={loading}
        fetchPriority={fetchPriority}
      />
    </div>
  );
}
