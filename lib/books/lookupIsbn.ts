/**
 * Server-side ISBN lookup via Open Library (no API key).
 * Used by the sell flow to prefill title, author, cover.
 */

export type IsbnLookupResult = {
  title: string;
  author: string | null;
  coverUrl: string | null;
  isbn: string;
};

function cleanIsbn(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 10 && d.length !== 13) return null;
  return d;
}

export async function lookupIsbn(
  rawIsbn: string,
): Promise<IsbnLookupResult | null> {
  const isbn = cleanIsbn(rawIsbn);
  if (!isbn) return null;

  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;

  const json = (await res.json()) as Record<
    string,
    {
      title?: string;
      authors?: { name?: string }[];
      cover?: { medium?: string; large?: string };
    }
  >;

  const row = json[`ISBN:${isbn}`];
  if (!row?.title) return null;

  const author = row.authors?.[0]?.name ?? null;
  const coverUrl = row.cover?.medium ?? row.cover?.large ?? null;

  return {
    isbn,
    title: row.title,
    author,
    coverUrl,
  };
}
