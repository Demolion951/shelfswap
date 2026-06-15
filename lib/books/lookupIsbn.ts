/**
 * Server-side ISBN lookup: Open Library first, extended cover fallbacks for newer books.
 * Used by the sell flow to prefill title, author, cover.
 * Location: lib/books/lookupIsbn.ts
 */
import {
  fetchOpenLibraryCoverIdByIsbn,
  openLibraryCoverIdImageUrl,
  openLibraryIsbnImageUrl,
  resolveCatalogueCoverBytes,
} from "@/lib/books/catalogueCoverResolve";
import { lookupGoogleBooksByIsbn, lookupGoogleBooksByTitleAuthor } from "@/lib/books/googleBooksLookup";
import {
  normalizeCoverImageUrl,
  openLibraryIsbnCoverUrl,
} from "@/lib/books/openLibraryCover";

export type IsbnLookupResult = {
  title: string;
  author: string | null;
  /** Catalogue cover URL when available. */
  coverUrl: string;
  isbn: string;
  /** Which catalogue supplied metadata (for debugging / UI hints). */
  source: "open_library" | "google_books";
};

function cleanIsbn(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 10 && d.length !== 13) return null;
  return d;
}

async function lookupOpenLibrary(
  isbn: string,
): Promise<(Omit<IsbnLookupResult, "source"> & { apiCover: string | null }) | null> {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;

  const json = (await res.json()) as Record<
    string,
    {
      title?: string;
      authors?: { name?: string }[];
      cover?: { small?: string; medium?: string; large?: string };
    }
  >;

  const row = json[`ISBN:${isbn}`];
  if (!row?.title) return null;

  const author = row.authors?.[0]?.name ?? null;
  const fromApi = normalizeCoverImageUrl(
    row.cover?.large ?? row.cover?.medium ?? row.cover?.small,
  );

  return {
    isbn,
    title: row.title,
    author,
    coverUrl: fromApi ?? openLibraryIsbnCoverUrl(isbn),
    apiCover: fromApi,
  };
}

/** Pick the best storable cover URL after extended resolution. */
async function resolveCoverUrlForIsbn(
  isbn: string,
  title: string,
  author: string | null,
  directApiCover: string | null,
): Promise<string> {
  if (directApiCover) return directApiCover;

  const resolved = await resolveCatalogueCoverBytes(isbn, { title, author, size: "L" });
  if (resolved?.source === "open_library_search") {
    const coverId = await fetchOpenLibraryCoverIdByIsbn(isbn);
    if (coverId != null) return openLibraryCoverIdImageUrl(coverId, "L");
  }
  if (resolved) {
    if (resolved.source.startsWith("google_books")) {
      const g =
        (await lookupGoogleBooksByIsbn(isbn)) ??
        (await lookupGoogleBooksByTitleAuthor(title, author));
      if (g?.coverUrl) return g.coverUrl;
    }
    if (resolved.source.startsWith("open_library")) {
      const coverId = await fetchOpenLibraryCoverIdByIsbn(isbn);
      if (coverId != null) return openLibraryCoverIdImageUrl(coverId, "L");
      return openLibraryIsbnImageUrl(isbn, "L");
    }
    return openLibraryIsbnImageUrl(isbn, "L");
  }

  const google =
    (await lookupGoogleBooksByIsbn(isbn)) ??
    (await lookupGoogleBooksByTitleAuthor(title, author));
  if (google?.coverUrl) return google.coverUrl;

  return openLibraryIsbnImageUrl(isbn, "L");
}

export async function lookupIsbn(rawIsbn: string): Promise<IsbnLookupResult | null> {
  const isbn = cleanIsbn(rawIsbn);
  if (!isbn) return null;

  const ol = await lookupOpenLibrary(isbn);
  if (ol) {
    const coverUrl = await resolveCoverUrlForIsbn(isbn, ol.title, ol.author, ol.apiCover);
    const { apiCover: _drop, ...rest } = ol;
    return { ...rest, coverUrl, source: "open_library" };
  }

  const google = await lookupGoogleBooksByIsbn(isbn);
  if (!google) return null;

  const coverUrl =
    google.coverUrl ??
    (await resolveCoverUrlForIsbn(isbn, google.title, google.author, null));

  return {
    isbn,
    title: google.title,
    author: google.author,
    coverUrl,
    source: "google_books",
  };
}
