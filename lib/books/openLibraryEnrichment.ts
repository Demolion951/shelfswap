/**
 * Fetches enrichment signals from Open Library by ISBN.
 * Writes are not done here; this is a pure fetcher for listing metadata and recommendations.
 * Location: lib/books/openLibraryEnrichment.ts
 */

type OlDescription = string | { value?: string } | null | undefined;
type OlSubjects = unknown;

export type OpenLibraryEnrichment = {
  workKey: string;
  sourceUrl: string;
  description?: string;
  subjects: string[];
};

function cleanIsbn(raw: string): string | null {
  const d = raw.replace(/\\D/g, "");
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
  return s.replace(/\\s+/g, " ").trim();
}

function clamp(s: string, maxChars: number): string {
  const cleaned = normalizeWhitespace(s);
  if (cleaned.length <= maxChars) return cleaned;
  const sliced = cleaned.slice(0, maxChars - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const safe = lastSpace > 180 ? sliced.slice(0, lastSpace) : sliced;
  return `${safe}…`;
}

function normalizeSubject(s: string): string {
  return normalizeWhitespace(s).replace(/^\\W+|\\W+$/g, "");
}

function subjectsFromUnknown(raw: OlSubjects): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    const out: string[] = [];
    for (const item of raw) {
      if (typeof item === "string") out.push(item);
      else if (item && typeof item === "object" && typeof (item as any).name === "string") {
        out.push(String((item as any).name));
      }
    }
    return out;
  }
  return [];
}

async function fetchJson<T>(url: string, revalidateSeconds: number, timeoutMs: number): Promise<T | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: revalidateSeconds },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

type BooksApiRow = { works?: { key?: string }[] };
type IsbnJson = { works?: { key?: string }[] };
type WorkJson = { description?: OlDescription; subjects?: OlSubjects };

export async function fetchOpenLibraryEnrichmentByIsbn(
  rawIsbn: string,
): Promise<OpenLibraryEnrichment | null> {
  const isbn = cleanIsbn(rawIsbn);
  if (!isbn) return null;

  const timeoutMs = 1500;
  const bookUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
  const bookJson = await fetchJson<Record<string, BooksApiRow>>(bookUrl, 86_400, timeoutMs);
  const bookRow = bookJson?.[`ISBN:${isbn}`];
  const workKeyFromBooks = bookRow?.works?.[0]?.key ?? null;

  let workKey = workKeyFromBooks;
  if (!workKey) {
    const isbnUrl = `https://openlibrary.org/isbn/${isbn}.json`;
    const isbnJson = await fetchJson<IsbnJson>(isbnUrl, 86_400, timeoutMs);
    workKey = isbnJson?.works?.[0]?.key ?? null;
  }

  if (!workKey || typeof workKey !== "string" || !workKey.startsWith("/works/")) return null;

  const workUrl = `https://openlibrary.org${workKey}.json`;
  const workJson = await fetchJson<WorkJson>(workUrl, 86_400, timeoutMs);
  if (!workJson) return null;

  const subjects = subjectsFromUnknown(workJson.subjects)
    .map(normalizeSubject)
    .filter((s) => s.length >= 3 && s.length <= 40)
    .slice(0, 16);

  const desc = descriptionText(workJson.description);
  const description = desc ? clamp(desc, 520) : undefined;

  return {
    workKey,
    sourceUrl: `https://openlibrary.org${workKey}`,
    description,
    subjects,
  };
}

