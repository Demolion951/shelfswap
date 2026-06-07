/**
 * ISBN lookup fallback via Google Books (often has newer titles Open Library misses).
 * Location: lib/books/googleBooksLookup.ts
 */
import { normalizeCoverImageUrl } from "@/lib/books/openLibraryCover";

export type GoogleBooksLookup = {
  title: string;
  author: string | null;
  coverUrl: string | null;
};

function cleanIsbn(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 10 && d.length !== 13) return null;
  return d;
}

/** Prefer larger HTTPS cover from Google Books imageLinks. */
function pickCoverImage(links: Record<string, string> | undefined): string | null {
  if (!links) return null;
  const raw =
    links.extraLarge ??
    links.large ??
    links.medium ??
    links.small ??
    links.thumbnail ??
    links.smallThumbnail;
  if (!raw) return null;
  let url = normalizeCoverImageUrl(raw);
  if (!url) return null;
  if (url.includes("zoom=")) {
    url = url.replace(/zoom=\d/, "zoom=0");
  }
  return url;
}

export async function lookupGoogleBooksByIsbn(
  rawIsbn: string,
): Promise<GoogleBooksLookup | null> {
  const isbn = cleanIsbn(rawIsbn);
  if (!isbn) return null;

  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=1`;
  try {
    const res = await fetch(url, { next: { revalidate: 86_400 } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      items?: Array<{
        volumeInfo?: {
          title?: string;
          authors?: string[];
          imageLinks?: Record<string, string>;
        };
      }>;
    };
    const info = json.items?.[0]?.volumeInfo;
    if (!info?.title?.trim()) return null;
    return {
      title: info.title.trim(),
      author: info.authors?.[0]?.trim() ?? null,
      coverUrl: pickCoverImage(info.imageLinks),
    };
  } catch (e) {
    console.warn("[lookupGoogleBooksByIsbn]", e);
    return null;
  }
}

/** Title/author search when ISBN lookup misses (common for very new titles). */
export async function lookupGoogleBooksByTitleAuthor(
  title: string,
  author?: string | null,
): Promise<GoogleBooksLookup | null> {
  const t = title.trim();
  if (!t) return null;
  const parts = [`intitle:${t}`];
  const a = author?.trim();
  if (a) parts.push(`inauthor:${a}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(parts.join("+"))}&maxResults=3`;
  try {
    const res = await fetch(url, { next: { revalidate: 86_400 } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      items?: Array<{
        volumeInfo?: {
          title?: string;
          authors?: string[];
          imageLinks?: Record<string, string>;
        };
      }>;
    };
    for (const item of json.items ?? []) {
      const info = item.volumeInfo;
      if (!info?.title?.trim()) continue;
      const cover = pickCoverImage(info.imageLinks);
      if (!cover) continue;
      return {
        title: info.title.trim(),
        author: info.authors?.[0]?.trim() ?? null,
        coverUrl: cover,
      };
    }
    return null;
  } catch (e) {
    console.warn("[lookupGoogleBooksByTitleAuthor]", e);
    return null;
  }
}
