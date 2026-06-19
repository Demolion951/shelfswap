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

type OlSearchDoc = {
  key?: string;
  title?: string;
  first_sentence?: string[];
};

type WorkJson = {
  description?: OlDescription;
};

type IsbnJson = {
  works?: { key?: string }[];
};

const MIN_BLURB_CHARS = 20;

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

function fullDescriptionText(s: string, maxChars = 50_000): string | null {
  const cleaned = normalizeWhitespace(s);
  if (cleaned.length < MIN_BLURB_CHARS) return null;
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars - 1)}…`;
}

async function fetchJson<T>(
  url: string,
  revalidateSeconds: number,
  timeoutMs = 9000,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: revalidateSeconds },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const raw = await res.text();
    if (!raw.trim() || raw.startsWith("DEPRECATED")) return null;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn("[openLibraryBlurb] fetch failed", url, e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOpenLibraryWorkDescription(workKey: string): Promise<string | null> {
  if (!workKey.startsWith("/works/")) return null;
  const workJson = await fetchJson<WorkJson>(`https://openlibrary.org${workKey}.json`, 86_400);
  const rawDesc = descriptionText(workJson?.description);
  if (!rawDesc) return null;
  return fullDescriptionText(rawDesc);
}

async function fetchOpenLibraryBlurbFromSearch(
  params: URLSearchParams,
): Promise<BookBlurb | null> {
  params.set("limit", params.get("limit") ?? "3");
  const url = `https://openlibrary.org/search.json?${params.toString()}`;
  const json = await fetchJson<{ docs?: OlSearchDoc[] }>(url, 86_400);
  for (const doc of json?.docs ?? []) {
    const workKey = doc.key?.startsWith("/works/") ? doc.key : null;
    if (workKey) {
      const text = await fetchOpenLibraryWorkDescription(workKey);
      if (text) {
        return {
          text,
          source: "open_library",
          sourceUrl: `https://openlibrary.org${workKey}`,
        };
      }
    }
    const sentence = doc.first_sentence?.map((s) => s.trim()).filter(Boolean).join(" ");
    const fromSentence = sentence ? fullDescriptionText(sentence) : null;
    if (fromSentence) {
      return {
        text: fromSentence,
        source: "open_library",
        sourceUrl: workKey ? `https://openlibrary.org${workKey}` : null,
      };
    }
  }
  return null;
}

export async function fetchOpenLibraryBlurbByIsbn(rawIsbn: string): Promise<BookBlurb | null> {
  const isbn = cleanIsbn(rawIsbn);
  if (!isbn) return null;

  const isbnJson = await fetchJson<IsbnJson>(`https://openlibrary.org/isbn/${isbn}.json`, 86_400);
  const workKey = isbnJson?.works?.[0]?.key ?? null;
  if (workKey?.startsWith("/works/")) {
    const text = await fetchOpenLibraryWorkDescription(workKey);
    if (text) {
      return {
        text,
        source: "open_library",
        sourceUrl: `https://openlibrary.org${workKey}`,
      };
    }
  }

  const searchParams = new URLSearchParams({ isbn });
  return fetchOpenLibraryBlurbFromSearch(searchParams);
}

async function fetchOpenLibraryBlurbByTitleAuthor(
  title: string,
  author?: string | null,
): Promise<BookBlurb | null> {
  const t = title.trim();
  if (!t) return null;
  const params = new URLSearchParams({ title: t, limit: "5" });
  const a = author?.trim();
  if (a) params.set("author", a);
  return fetchOpenLibraryBlurbFromSearch(params);
}

async function fetchGoogleBlurbByIsbn(isbn: string): Promise<BookBlurb | null> {
  const hit = await lookupGoogleBooksByIsbn(isbn);
  if (hit?.description) {
    const text = fullDescriptionText(hit.description);
    if (text) {
      return {
        text,
        source: "google_books",
        sourceUrl: `https://books.google.com/books?isbn=${encodeURIComponent(isbn)}`,
      };
    }
  }
  if (hit?.title) {
    return fetchGoogleBlurbByTitleAuthor(hit.title, hit.author);
  }
  return null;
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
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(parts.join("+"))}&maxResults=8`;
  try {
    const res = await fetch(url, { next: { revalidate: 86_400 } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      items?: Array<{ volumeInfo?: { description?: string; title?: string } }>;
    };
    for (const item of json.items ?? []) {
      const raw = item.volumeInfo?.description?.replace(/\s+/g, " ").trim();
      const text = raw ? fullDescriptionText(raw) : null;
      if (text) {
        return { text, source: "google_books", sourceUrl: null };
      }
    }
  } catch (e) {
    console.warn("[fetchGoogleBlurbByTitleAuthor]", e);
  }
  return null;
}

/** Best-effort synopsis: Open Library (ISBN + search) → Google Books (ISBN + title/author). */
export async function fetchBookBlurb(
  rawIsbn: string | null | undefined,
  title?: string | null,
  author?: string | null,
): Promise<BookBlurb | null> {
  const isbn = rawIsbn ? cleanIsbn(rawIsbn) : null;

  if (isbn) {
    const olIsbn = await fetchOpenLibraryBlurbByIsbn(isbn);
    if (olIsbn) return olIsbn;
    const googleIsbn = await fetchGoogleBlurbByIsbn(isbn);
    if (googleIsbn) return googleIsbn;
  }

  if (title?.trim()) {
    const olTitle = await fetchOpenLibraryBlurbByTitleAuthor(title, author);
    if (olTitle) return olTitle;
    const googleTitle = await fetchGoogleBlurbByTitleAuthor(title, author);
    if (googleTitle) return googleTitle;
  }

  return null;
}
