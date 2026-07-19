/**
 * Warm browser cache for listing cover URLs (above-the-fold grids).
 * Fires many Image() loads at once so catalogue + seller photos race together.
 * Location: lib/client/prefetchCoverImages.ts
 */

export function prefetchCoverImages(urls: (string | null | undefined)[], limit = 28): void {
  if (typeof window === "undefined") return;
  const seen = new Set<string>();
  for (const raw of urls) {
    if (!raw?.trim() || seen.has(raw) || seen.size >= limit) continue;
    seen.add(raw);
    const img = new window.Image();
    img.decoding = "async";
    img.src = raw;
  }
}
