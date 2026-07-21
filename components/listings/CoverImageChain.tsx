"use client";

/**
 * Loads cover images in parallel (catalogue + seller), shows highest-priority success,
 * and upgrades if a better candidate finishes later. Session-caches wins for remounts.
 * Location: components/listings/CoverImageChain.tsx
 */
import {
  forgetCoverChainWin,
  getCoverChainWin,
  isCoverUrlOk,
  rememberCoverChainWin,
  rememberCoverUrlOk,
} from "@/lib/client/coverSessionCache";
import {
  catalogueCoverCandidatesForClient,
  isCatalogueCoverApiUrl,
} from "@/lib/listings/listingCover";
import { useEffect, useMemo, useState } from "react";

const MIN_COVER_BYTES = 500;
/** If preferred catalogue is still pending, show a ready fallback after this. */
const FALLBACK_SHOW_MS = 420;

type Props = {
  candidates: string[];
  className?: string;
  noCoverClassName?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "auto";
  onExhausted?: () => void;
};

function isAbsoluteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** Probe that a candidate works; returns the URL to put in <img src>. */
function probeCandidate(url: string): Promise<string> {
  // Already validated this session — skip network.
  if (isCoverUrlOk(url)) {
    return Promise.resolve(url);
  }

  if (isCatalogueCoverApiUrl(url) && !isAbsoluteHttpUrl(url)) {
    return fetch(url, { credentials: "same-origin", cache: "force-cache" }).then(
      async (res) => {
        if (!res.ok) throw new Error("cover fetch failed");
        const blob = await res.blob();
        if (blob.size < MIN_COVER_BYTES) throw new Error("cover too small");
        rememberCoverUrlOk(url);
        // Use the path itself — HTTP cache is warm; avoids revoked blob: URLs.
        return url;
      },
    );
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      rememberCoverUrlOk(url);
      resolve(url);
    };
    img.onerror = () => reject(new Error("img failed"));
    if (!isCatalogueCoverApiUrl(url)) {
      img.referrerPolicy = "no-referrer";
    }
    img.src = url;
  });
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
  const chainKey = candidates.join("\0");
  const cached = getCoverChainWin(chainKey);

  const [displaySrc, setDisplaySrc] = useState<string | null>(cached);
  const [loadingCover, setLoadingCover] = useState(!cached);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ok = new Map<number, string>();
    const failed = new Set<number>();
    let shownIndex = -1;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const hit = getCoverChainWin(chainKey);
    if (hit) {
      setDisplaySrc(hit);
      setLoadingCover(false);
      setExhausted(false);
      // Same cover already chosen — skip re-probing (big win on scroll/remount).
      return;
    }

    setDisplaySrc(null);
    setLoadingCover(true);
    setExhausted(false);

    if (candidates.length === 0) {
      setLoadingCover(false);
      setExhausted(true);
      return;
    }

    function publish(index: number, src: string, allowDowngrade = false) {
      if (cancelled) return;
      if (!allowDowngrade && shownIndex >= 0 && index > shownIndex) return;
      shownIndex = index;
      setDisplaySrc(src);
      setLoadingCover(false);
      setExhausted(false);
      rememberCoverChainWin(chainKey, src);
    }

    function pickBest(allowFallbackWhileWaiting: boolean) {
      if (cancelled) return;
      for (let i = 0; i < candidates.length; i++) {
        if (ok.has(i)) {
          publish(i, ok.get(i)!);
          return;
        }
        if (!failed.has(i)) {
          if (allowFallbackWhileWaiting) {
            for (let j = i + 1; j < candidates.length; j++) {
              if (ok.has(j)) {
                publish(j, ok.get(j)!, true);
                return;
              }
            }
          }
          return;
        }
      }
      if (shownIndex < 0) {
        setDisplaySrc(null);
        setLoadingCover(false);
        setExhausted(true);
      }
    }

    fallbackTimer = setTimeout(() => pickBest(true), FALLBACK_SHOW_MS);

    // Kick off every candidate at once — catalogue + seller photos race.
    candidates.forEach((url, i) => {
      void probeCandidate(url)
        .then((src) => {
          if (cancelled) return;
          ok.set(i, src);
          pickBest(false);
        })
        .catch(() => {
          if (cancelled) return;
          failed.add(i);
          pickBest(failed.size === candidates.length);
        });
    });

    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [chainKey, candidates]);

  useEffect(() => {
    if (exhausted) onExhausted?.();
  }, [exhausted, onExhausted]);

  if (exhausted || candidates.length === 0) {
    return <div className={noCoverClassName} aria-hidden />;
  }

  if (loadingCover || !displaySrc) {
    return <div className={`${noCoverClassName} animate-pulse bg-base-300/55`} aria-hidden />;
  }

  const catalogue = isCatalogueCoverApiUrl(displaySrc);

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
        forgetCoverChainWin(chainKey);
        setExhausted(true);
        setDisplaySrc(null);
      }}
    />
  );
}
