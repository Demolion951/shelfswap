/**
 * Fetches a book blurb (description) from Open Library by ISBN.
 * Returns a trimmed paragraph-length blurb and a source URL for attribution.
 * Location: lib/books/openLibraryBlurb.ts
 */

type OlDescription = string | { value?: string } | null | undefined;

export type OpenLibraryBlurb = {
  text: string;
  sourceUrl: string;
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

function clampBlurb(s: string, maxChars = 520): string {
  const cleaned = normalizeWhitespace(s);
  if (cleaned.length <= maxChars) return cleaned;
  const sliced = cleaned.slice(0, maxChars - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const safe = lastSpace > 180 ? sliced.slice(0, lastSpace) : sliced;
  return `${safe}…`;
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
export async function fetchOpenLibraryBlurbByIsbn(rawIsbn: string): Promise<OpenLibraryBlurb | null> {
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

  const text = clampBlurb(rawDesc, 520);
  if (text.length < 40) return null;

  return { text, sourceUrl: `https://openlibrary.org${workKey}` };
}

