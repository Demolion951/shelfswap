"use client";

/**
 * Listing cover: official ISBN / catalogue art first; seller photo if catalogue fails.
 * Location: components/listings/ListingCoverImage.tsx
 */
import { isUsefulCoverDimensions } from "@/lib/client/probeImageUrl";
import {
  firstSellerPhotoSrc,
  listingCoverCandidatesForCard,
} from "@/lib/listings/listingCover";
import type { ListingWithRelations } from "@/lib/listings/queries";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  size = "M",
  className = "h-full w-full object-cover",
  loading = "lazy",
  fetchPriority = "auto",
  noCoverClassName = "h-full w-full bg-base-300/45",
}: Props) {
  const candidates = useMemo(() => {
    const chain = listingCoverCandidatesForCard(listing, size);
    if (chain.length > 0) return chain;
    const fallback = firstSellerPhotoSrc(listing);
    return fallback ? [fallback] : [];
  }, [listing, size]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidates]);

  const advance = useCallback(() => {
    setIndex((i) => (i + 1 < candidates.length ? i + 1 : -1));
  }, [candidates.length]);

  const displaySrc = index >= 0 ? (candidates[index] ?? null) : null;

  if (!displaySrc) {
    return <div className={noCoverClassName} aria-hidden />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={displaySrc}
      src={displaySrc}
      alt=""
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={(e) => {
        const img = e.currentTarget;
        if (!isUsefulCoverDimensions(img.naturalWidth, img.naturalHeight)) {
          advance();
        }
      }}
      onError={() => {
        advance();
      }}
    />
  );
}
