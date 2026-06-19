/**
 * In-memory cache for cover URL probe results and resolved listing covers (session speed).
 * Location: lib/client/coverProbeCache.ts
 */

const urlResults = new Map<string, boolean>();
const listingCovers = new Map<string, string>();

const MAX_URL_ENTRIES = 400;
const MAX_LISTING_ENTRIES = 200;

export function isSellerPhotoUrl(url: string): boolean {
  return url.includes("/storage/v1/object/public/listing-photos");
}

/** Seller photos load reliably but must never beat catalogue URLs in the chain. */
export function isTrustedCoverUrl(url: string): boolean {
  return isSellerPhotoUrl(url);
}

export function getUrlProbeResult(url: string): boolean | undefined {
  return urlResults.get(url);
}

export function setUrlProbeResult(url: string, ok: boolean): void {
  if (!ok && (url.includes("/api/book-cover") || url.includes("/api/openlibrary-cover"))) {
    return;
  }
  if (urlResults.size >= MAX_URL_ENTRIES) {
    const first = urlResults.keys().next().value;
    if (first) urlResults.delete(first);
  }
  urlResults.set(url, ok);
}

export function getListingCoverCache(listingId: string): string | null {
  return listingCovers.get(listingId) ?? null;
}

export function setListingCoverCache(listingId: string, url: string): void {
  if (isSellerPhotoUrl(url)) return;
  if (listingCovers.size >= MAX_LISTING_ENTRIES) {
    const first = listingCovers.keys().next().value;
    if (first) listingCovers.delete(first);
  }
  listingCovers.set(listingId, url);
}
