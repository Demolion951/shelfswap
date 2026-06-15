"use client";

/**
 * Listing cover: probes candidates in priority order, then shows one image (no visible cascade).
 * Seller photos load immediately when catalogue art is unavailable.
 * Location: components/listings/ListingCoverImage.tsx
 */
import { probeImageUrl } from "@/lib/client/probeImageUrl";
import {
  firstSellerPhotoSrc,
  listingCoverCandidatesForCard,
} from "@/lib/listings/listingCover";
import type { ListingWithRelations } from "@/lib/listings/queries";
import { useEffect, useMemo, useState } from "react";

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

  const [src, setSrc] = useState<string | null>(null);
  const displaySrc = src ?? (candidates.length === 1 ? candidates[0] : null);

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
        const ok = await probeImageUrl(url);
        if (cancelled) return;
        if (ok) {
          setSrc(url);
          return;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [candidates]);

  if (!displaySrc) {
    return <div className={noCoverClassName} aria-hidden />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displaySrc}
      alt=""
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}
