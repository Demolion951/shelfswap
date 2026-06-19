/**
 * JSON API for book synopsis by ISBN (Open Library + Google Books fallbacks).
 * Location: app/api/openlibrary-blurb/route.ts
 */
import { fetchBookBlurb } from "@/lib/books/openLibraryBlurb";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

const getCachedBlurb = unstable_cache(
  async (isbn: string | null, title: string | null, author: string | null) =>
    fetchBookBlurb(isbn, title, author),
  ["book-blurb"],
  { revalidate: 86_400 },
);

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const isbn = sp.get("isbn")?.trim() || null;
  const title = sp.get("title")?.trim() || null;
  const author = sp.get("author")?.trim() || null;

  if (!isbn && !title) {
    return NextResponse.json({ error: "Provide isbn or title" }, { status: 400 });
  }

  const blurb = await getCachedBlurb(isbn, title, author);
  if (!blurb) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  return NextResponse.json(
    {
      found: true,
      text: blurb.text,
      source: blurb.source,
      sourceUrl: blurb.sourceUrl,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
