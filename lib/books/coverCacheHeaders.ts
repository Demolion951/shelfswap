/**
 * Shared Cache-Control for successful catalogue cover responses (browser + Vercel CDN).
 * Location: lib/books/coverCacheHeaders.ts
 */

/** 7 days fresh, 30 days SWR — same image bytes, faster repeats / popular ISBNs. */
export const COVER_SUCCESS_CACHE_CONTROL =
  "public, max-age=604800, s-maxage=604800, stale-while-revalidate=2592000, stale-if-error=86400";

/** Vercel edge cache independently of the browser. */
export const COVER_VERCEL_CDN_CACHE_CONTROL =
  "public, s-maxage=604800, stale-while-revalidate=2592000";

export function coverSuccessHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Cache-Control": COVER_SUCCESS_CACHE_CONTROL,
    "Vercel-CDN-Cache-Control": COVER_VERCEL_CDN_CACHE_CONTROL,
    "CDN-Cache-Control": COVER_VERCEL_CDN_CACHE_CONTROL,
    ...extra,
  };
}
