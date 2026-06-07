"use client";

/**
 * Listing cover with catalogue-first chain; steps through seller photos on error; never shows broken icon.
 * Location: components/listings/ListingCoverImage.tsx
 */
import { listingCoverCandidates } from "@/lib/listings/listingCover";
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
  noCoverClassName = "flex h-full items-center justify-center text-[10px] text-base-content/35 px-1 text-center",
}: Props) {
  const candidates = useMemo(() => listingCoverCandidates(listing, size), [listing, size]);
  const [index, setIndex] = useState(0);

  const src = candidates[index];
  if (!src || index >= candidates.length) {
    return <div className={noCoverClassName}>No cover</div>;
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
