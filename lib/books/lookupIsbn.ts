/**
 * Server-side ISBN lookup: Open Library first, Google Books fallback.
 * Used by the sell flow to prefill title, author, cover.
 * Location: lib/books/lookupIsbn.ts
 */
import { lookupGoogleBooksByIsbn } from "@/lib/books/googleBooksLookup";
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
  const coverUrl = fromApi ?? openLibraryIsbnCoverUrl(isbn);

  return {
    isbn,
    title: row.title,
    author,
    coverUrl: fromApi ?? openLibraryIsbnCoverUrl(isbn),
    apiCover: fromApi,
  };
}

export async function lookupIsbn(rawIsbn: string): Promise<IsbnLookupResult | null> {
  const isbn = cleanIsbn(rawIsbn);
  if (!isbn) return null;

  const ol = await lookupOpenLibrary(isbn);
  if (ol) {
    let coverUrl = ol.coverUrl;
    if (!ol.apiCover) {
      const google = await lookupGoogleBooksByIsbn(isbn);
      if (google?.coverUrl) coverUrl = google.coverUrl;
    }
    const { apiCover: _drop, ...rest } = ol;
    return { ...rest, coverUrl, source: "open_library" };
  }

  const google = await lookupGoogleBooksByIsbn(isbn);
  if (!google) return null;

  return {
    isbn,
    title: google.title,
    author: google.author,
    coverUrl: google.coverUrl ?? openLibraryIsbnCoverUrl(isbn),
    source: "google_books",
  };
}
