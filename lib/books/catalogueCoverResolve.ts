/**
 * Resolve catalogue cover images: OL ISBN → OL search cover_id → Google ISBN → Google title/author.
 * Location: lib/books/catalogueCoverResolve.ts
 */
import { lookupGoogleBooksByIsbn, lookupGoogleBooksByTitleAuthor } from "@/lib/books/googleBooksLookup";

export const MIN_USEFUL_COVER_BYTES = 2_000;

export type CoverSize = "S" | "M" | "L";

export function openLibraryIsbnImageUrl(isbn: string, size: CoverSize): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg`;
}

export function openLibraryCoverIdImageUrl(coverId: number, size: CoverSize): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

/** Same-origin proxy path used in listings and sell preview. */
export function bookCoverApiPath(isbn: string, size: CoverSize = "L"): string {
  return `/api/book-cover?isbn=${encodeURIComponent(isbn)}&size=${size}`;
}

export async function fetchImageBytes(
  url: string,
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 86_400 },
      headers: { Accept: "image/*" },
    });
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    return { bytes, contentType };
  } catch (e) {
    console.warn("[catalogueCoverResolve] fetch failed", url, e);
    return null;
  }
}

export function isUsefulCover(bytes: ArrayBuffer, minBytes = MIN_USEFUL_COVER_BYTES): boolean {
  return bytes.byteLength >= minBytes;
}

/** OL search often has cover_i when the ISBN cover endpoint is still blank (newer books). */
export async function fetchOpenLibraryCoverIdByIsbn(isbn: string): Promise<number | null> {
  try {
    const url = `https://openlibrary.org/search.json?isbn=${encodeURIComponent(isbn)}&limit=1`;
    const res = await fetch(url, { next: { revalidate: 86_400 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { docs?: Array<{ cover_i?: number }> };
    const id = json.docs?.[0]?.cover_i;
    return typeof id === "number" && id > 0 ? id : null;
  } catch (e) {
    console.warn("[catalogueCoverResolve] OL search", e);
    return null;
  }
}

/** Title/author search when ISBN endpoints have no cover yet. */
export async function fetchOpenLibraryCoverIdByTitleAuthor(
  title: string,
  author?: string | null,
): Promise<number | null> {
  try {
    const params = new URLSearchParams({ title: title.trim(), limit: "1" });
    if (author?.trim()) params.set("author", author.trim());
    const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { docs?: Array<{ cover_i?: number }> };
    const id = json.docs?.[0]?.cover_i;
    return typeof id === "number" && id > 0 ? id : null;
  } catch (e) {
    console.warn("[catalogueCoverResolve] OL title search", e);
    return null;
  }
}

type ResolveOpts = {
  size?: CoverSize;
  title?: string | null;
  author?: string | null;
};

async function tryUrl(url: string, minBytes = MIN_USEFUL_COVER_BYTES) {
  const img = await fetchImageBytes(url);
  if (!img || !isUsefulCover(img.bytes, minBytes)) return null;
  return img;
}

/**
 * Fetch the best available cover bytes for an ISBN (display proxy + sell verification).
 */
export async function resolveCatalogueCoverBytes(
  isbn: string,
  opts: ResolveOpts = {},
): Promise<{ bytes: ArrayBuffer; contentType: string; source: string } | null> {
  const size = opts.size ?? "L";
  const title = opts.title?.trim() || null;
  const author = opts.author?.trim() || null;

  const olIsbn = await tryUrl(openLibraryIsbnImageUrl(isbn, size));
  if (olIsbn) return { ...olIsbn, source: "open_library_isbn" };

  const coverId = await fetchOpenLibraryCoverIdByIsbn(isbn);
  if (coverId != null) {
    const olId = await tryUrl(openLibraryCoverIdImageUrl(coverId, size));
    if (olId) return { ...olId, source: "open_library_search" };
  }

  if (title) {
    const coverByTitle = await fetchOpenLibraryCoverIdByTitleAuthor(title, author);
    if (coverByTitle != null) {
      const olTitle = await tryUrl(openLibraryCoverIdImageUrl(coverByTitle, size));
      if (olTitle) return { ...olTitle, source: "open_library_title_search" };
    }
  }

  const googleIsbn = await lookupGoogleBooksByIsbn(isbn);
  if (googleIsbn?.coverUrl) {
    const g = await tryUrl(googleIsbn.coverUrl, 500);
    if (g) return { ...g, source: "google_books_isbn" };
  }

  if (title) {
    const googleTitle = await lookupGoogleBooksByTitleAuthor(title, author);
    if (googleTitle?.coverUrl) {
      const g = await tryUrl(googleTitle.coverUrl, 500);
      if (g) return { ...g, source: "google_books_title" };
    }
  }

  return null;
}

/** Best cover URL to store or display (proxied API path when ISBN is known). */
export function catalogueCoverUrlForListing(isbn: string, size: CoverSize = "L"): string {
  return bookCoverApiPath(isbn, size);
}
