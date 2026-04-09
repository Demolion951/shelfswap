/**
 * Helpers for Open Library cover URLs: HTTPS normalization (mobile mixed-content),
 * protocol-relative URLs, and ISBN-based fallbacks when the books API omits sizes.
 * Location: lib/books/openLibraryCover.ts
 */

export function normalizeCoverImageUrl(url: string | null | undefined): string | null {
  if (url == null || typeof url !== "string") return null;
  const t = url.trim();
  if (!t) return null;
  if (t.startsWith("//")) return `https:${t}`;
  if (t.startsWith("http://")) return `https://${t.slice(7)}`;
  return t;
}

/** Static cover endpoint; use when jscmd=data has no usable cover.* URLs. */
export function openLibraryIsbnCoverUrl(isbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
}
