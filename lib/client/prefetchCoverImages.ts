/**
 * Warm browser + HTTP cache for listing cover URLs (above-the-fold grids).
 * Catalogue API paths use fetch(force-cache) so CoverImageChain probes hit warm cache.
 * Location: lib/client/prefetchCoverImages.ts
 */
import { isCoverUrlOk, rememberCoverUrlOk } from "@/lib/client/coverSessionCache";
import { isCatalogueCoverApiUrl } from "@/lib/listings/listingCover";

const MIN_COVER_BYTES = 500;

function isAbsoluteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function warmOne(url: string) {
  if (isCoverUrlOk(url)) return;

  if (isCatalogueCoverApiUrl(url) && !isAbsoluteHttpUrl(url)) {
    void fetch(url, { credentials: "same-origin", cache: "force-cache" })
      .then(async (res) => {
        if (!res.ok) return;
        const blob = await res.blob();
        if (blob.size < MIN_COVER_BYTES) return;
        rememberCoverUrlOk(url);
      })
      .catch(() => {});
    return;
  }

  const img = new window.Image();
  img.decoding = "async";
  img.onload = () => rememberCoverUrlOk(url);
  if (!isCatalogueCoverApiUrl(url)) {
    img.referrerPolicy = "no-referrer";
  }
  img.src = url;
}

export function prefetchCoverImages(urls: (string | null | undefined)[], limit = 28): void {
  if (typeof window === "undefined") return;
  const seen = new Set<string>();
  for (const raw of urls) {
    if (!raw?.trim() || seen.has(raw) || seen.size >= limit) continue;
    seen.add(raw);
    warmOne(raw);
  }
}
