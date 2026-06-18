/**
 * Fetches a book blurb (description) from Open Library by ISBN.
 * Falls back to Google Books when Open Library has no synopsis.
 * Location: lib/books/openLibraryBlurb.ts
 */
import {
  lookupGoogleBooksByIsbn,
  lookupGoogleBooksByTitleAuthor,
} from "@/lib/books/googleBooksLookup";

type OlDescription = string | { value?: string } | null | undefined;

export type BookBlurb = {
  text: string;
  source: "open_library" | "google_books";
  sourceUrl: string | null;
};

function cleanIsbn(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 10 && d.length !== 13) return null;
  return d;
}

function descriptionText(desc: OlDescription): string | null {
  if (!desc) return null;
  if (typeof desc === "string") return desc;
  if (typeof desc === "object" && typeof desc.value === "string") return desc.value;
  return null;
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Full synopsis for listing detail (cap only to protect against pathological payloads). */
function fullDescriptionText(s: string, maxChars = 50_000): string {
  const cleaned = normalizeWhitespace(s);
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars - 1)}…`;
}

async function fetchJson<T>(url: string, revalidateSeconds: number): Promise<T | null> {
  const res = await fetch(url, {
    next: { revalidate: revalidateSeconds },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

type BooksApiRow = {
  works?: { key?: string }[];
};

type WorkJson = {
  description?: OlDescription;
};

type IsbnJson = {
  works?: { key?: string }[];
};

/**
 * Best-effort:
 * - Books API (jscmd=data) → work key → work.json description
 * - Fallback: /isbn/:isbn.json → work key → work.json description
 */
export async function fetchOpenLibraryBlurbByIsbn(rawIsbn: string): Promise<BookBlurb | null> {
  const isbn = cleanIsbn(rawIsbn);
  if (!isbn) return null;

  const bookUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
  const bookJson = await fetchJson<Record<string, BooksApiRow>>(bookUrl, 86_400);
  const bookRow = bookJson?.[`ISBN:${isbn}`];
  const workKeyFromBooks = bookRow?.works?.[0]?.key ?? null;

  let workKey = workKeyFromBooks;
  if (!workKey) {
    const isbnUrl = `https://openlibrary.org/isbn/${isbn}.json`;
    const isbnJson = await fetchJson<IsbnJson>(isbnUrl, 86_400);
    workKey = isbnJson?.works?.[0]?.key ?? null;
  }

  if (!workKey || typeof workKey !== "string" || !workKey.startsWith("/works/")) {
    return null;
  }

  const workUrl = `https://openlibrary.org${workKey}.json`;
  const workJson = await fetchJson<WorkJson>(workUrl, 86_400);
  const rawDesc = descriptionText(workJson?.description);
  if (!rawDesc) return null;

  const text = fullDescriptionText(rawDesc);
  if (text.length < 40) return null;

  return {
    text,
    source: "open_library",
    sourceUrl: `https://openlibrary.org${workKey}`,
  };
}

async function fetchGoogleBlurbByIsbn(isbn: string): Promise<BookBlurb | null> {
  const hit = await lookupGoogleBooksByIsbn(isbn);
  if (!hit?.description) return null;
  return {
    text: fullDescriptionText(hit.description),
    source: "google_books",
    sourceUrl: `https://books.google.com/books?isbn=${encodeURIComponent(isbn)}`,
  };
}

async function fetchGoogleBlurbByTitleAuthor(
  title: string,
  author?: string | null,
): Promise<BookBlurb | null> {
  const t = title.trim();
  if (!t) return null;
  const parts = [`intitle:${t}`];
  const a = author?.trim();
  if (a) parts.push(`inauthor:${a}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(parts.join("+"))}&maxResults=5`;
  try {
    const res = await fetch(url, { next: { revalidate: 86_400 } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      items?: Array<{ volumeInfo?: { description?: string; title?: string } }>;
    };
    for (const item of json.items ?? []) {
      const raw = item.volumeInfo?.description?.replace(/\s+/g, " ").trim();
      if (!raw || raw.length < 40) continue;
      return {
        text: fullDescriptionText(raw),
        source: "google_books",
        sourceUrl: null,
      };
    }
  } catch (e) {
    console.warn("[fetchGoogleBlurbByTitleAuthor]", e);
  }
  return null;
}

/** Best-effort synopsis: Open Library → Google Books (ISBN, then title/author). */
export async function fetchBookBlurb(
  rawIsbn: string | null | undefined,
  title?: string | null,
  author?: string | null,
): Promise<BookBlurb | null> {
  const isbn = rawIsbn ? cleanIsbn(rawIsbn) : null;
  if (isbn) {
    const ol = await fetchOpenLibraryBlurbByIsbn(isbn);
    if (ol) return ol;
    const googleIsbn = await fetchGoogleBlurbByIsbn(isbn);
    if (googleIsbn) return googleIsbn;
  }
  if (title?.trim()) {
    return fetchGoogleBlurbByTitleAuthor(title, author);
  }
  return null;
}

