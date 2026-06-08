"use client";

/**
 * Listing cover with catalogue-first chain; steps through seller photos on error.
 * Location: components/listings/ListingCoverImage.tsx
 */
import { firstSellerPhotoSrc, listingCoverCandidates } from "@/lib/listings/listingCover";
import type { ListingWithRelations } from "@/lib/listings/queries";
import { useMemo, useState } from "react";

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
    const chain = listingCoverCandidates(listing, size);
    if (chain.length > 0) return chain;
    const fallback = firstSellerPhotoSrc(listing);
    return fallback ? [fallback] : [];
  }, [listing, size]);
  const [index, setIndex] = useState(0);

  const src = candidates[index];
  if (!src || index >= candidates.length) {
    return <div className={noCoverClassName} aria-hidden />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      referrerPolicy="no-referrer"
      onError={() => {
        setIndex((i) => i + 1);
      }}
    />
  );
}
