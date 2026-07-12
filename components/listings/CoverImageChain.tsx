"use client";

/**
 * Loads cover images: fetch+blob for same-origin catalogue APIs; direct img for
 * absolute catalogue URLs (localhost → production) and seller photos.
 * Location: components/listings/CoverImageChain.tsx
 */
import {
  catalogueCoverCandidatesForClient,
  isCatalogueCoverApiUrl,
} from "@/lib/listings/listingCover";
import { useEffect, useMemo, useState } from "react";

const MIN_COVER_BYTES = 500;

type Props = {
  candidates: string[];
  className?: string;
  noCoverClassName?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "auto";
  /** Called when every candidate failed (e.g. hide catalogue slide on detail page). */
  onExhausted?: () => void;
};

function isAbsoluteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function CoverImageChain({
  candidates: rawCandidates,
  className = "h-full w-full object-cover",
  noCoverClassName = "h-full w-full bg-base-300/45",
  loading = "lazy",
  fetchPriority = "auto",
  onExhausted,
}: Props) {
  const candidates = useMemo(
    () => catalogueCoverCandidatesForClient(rawCandidates),
    [rawCandidates],
  );
  const [index, setIndex] = useState(0);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [loadingCover, setLoadingCover] = useState(true);
  const chainKey = candidates.join("\0");
  const current = index >= 0 && index < candidates.length ? candidates[index] : null;

  useEffect(() => {
    setIndex(0);
  }, [chainKey]);

  useEffect(() => {
    if (index < 0 && candidates.length > 0) {
      onExhausted?.();
    }
  }, [index, candidates.length, onExhausted]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    if (!current) {
      setDisplaySrc(null);
      setLoadingCover(false);
      return;
    }

    setLoadingCover(true);
    setDisplaySrc(null);

    const advance = () => {
      setIndex((i) => (i + 1 < candidates.length ? i + 1 : -1));
    };

    const finishDirect = (url: string) => {
      if (!cancelled) {
        setDisplaySrc(url);
        setLoadingCover(false);
      }
    };

    // Absolute catalogue URL (e.g. https://shelfswap.net/api/...) — use <img> directly.
    // Same Cloudflare-cached bytes as production; no local Open Library round-trip.
    if (isCatalogueCoverApiUrl(current) && isAbsoluteHttpUrl(current)) {
      finishDirect(current);
      return () => {
        cancelled = true;
      };
    }

    if (isCatalogueCoverApiUrl(current)) {
      void fetch(current, { credentials: "same-origin", cache: "default" })
        .then(async (res) => {
          if (!res.ok) throw new Error("cover fetch failed");
          const blob = await res.blob();
          if (blob.size < MIN_COVER_BYTES) throw new Error("cover too small");
          objectUrl = URL.createObjectURL(blob);
          finishDirect(objectUrl);
        })
        .catch(() => {
          if (!cancelled) advance();
        });
    } else {
      finishDirect(current);
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [current, candidates.length]);

  if (index < 0 || !current) {
    return <div className={noCoverClassName} aria-hidden />;
  }

  if (loadingCover || !displaySrc) {
    return <div className={`${noCoverClassName} animate-pulse bg-base-300/55`} aria-hidden />;
  }

  const catalogue = isCatalogueCoverApiUrl(current);

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
      referrerPolicy={catalogue ? undefined : "no-referrer"}
      onError={() => {
        setIndex((i) => (i + 1 < candidates.length ? i + 1 : -1));
      }}
    />
  );
}
