/**
 * Resolve the first working cover URL from a candidate chain (cached + throttled).
 * Location: lib/client/resolveListingCover.ts
 */
import {
  getListingCoverCache,
  getUrlProbeResult,
  isTrustedCoverUrl,
  setListingCoverCache,
  setUrlProbeResult,
} from "@/lib/client/coverProbeCache";
import { withCoverProbeSlot } from "@/lib/client/coverProbeQueue";
import { probeImageUrl } from "@/lib/client/probeImageUrl";

function isCatalogueApiUrl(url: string): boolean {
  return url.includes("/api/book-cover") || url.includes("/api/openlibrary-cover");
}

export async function resolveListingCoverUrl(
  listingId: string,
  candidates: string[],
  timeoutMs = 2800,
): Promise<string | null> {
  const cached = getListingCoverCache(listingId);
  if (cached) return cached;

  for (const url of candidates) {
    if (!url.trim()) continue;

    if (isTrustedCoverUrl(url)) {
      setUrlProbeResult(url, true);
      return url;
    }

    const known = getUrlProbeResult(url);
    if (known === false && !isCatalogueApiUrl(url)) continue;
    if (known === true) {
      setListingCoverCache(listingId, url);
      return url;
    }

    const ok = await withCoverProbeSlot(() => probeImageUrl(url, timeoutMs));
    setUrlProbeResult(url, ok);
    if (ok) {
      setListingCoverCache(listingId, url);
      return url;
    }
  }

  return null;
}
