/**
 * Rewrites covers.openlibrary.org URLs to same-origin /api/openlibrary-cover so images work on mobile.
 * Supabase and other URLs are returned unchanged.
 * Location: lib/books/openLibraryCoverDisplay.ts
 */

export function coverImageSrcForDisplay(url: string | null | undefined): string | null {
  if (url == null) return null;
  const raw = url.trim();
  if (!raw) return null;

  try {
    const href = raw.startsWith("//") ? `https:${raw}` : raw;
    const parsed = new URL(href);
    if (parsed.hostname !== "covers.openlibrary.org") return raw;

    const mIsbn = parsed.pathname.match(/^\/b\/isbn\/(\d+)-([SML])\.jpg$/i);
    if (mIsbn) {
      const isbn = mIsbn[1];
      const size = mIsbn[2].toUpperCase();
      return `/api/book-cover?isbn=${encodeURIComponent(isbn)}&size=${size}`;
    }

    const mId = parsed.pathname.match(/^\/b\/id\/(\d+)-([SML])\.jpg$/i);
    if (mId) {
      const id = mId[1];
      const size = mId[2].toUpperCase();
      return `/api/openlibrary-cover?id=${encodeURIComponent(id)}&size=${size}`;
    }

    return raw;
  } catch {
    return raw;
  }
}
