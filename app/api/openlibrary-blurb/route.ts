/**
 * JSON API for Open Library synopsis by ISBN (cached upstream via fetchOpenLibraryBlurbByIsbn).
 * Lets listing detail render without blocking on external Open Library latency.
 * Location: app/api/openlibrary-blurb/route.ts
 */
import { fetchOpenLibraryBlurbByIsbn } from "@/lib/books/openLibraryBlurb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const isbn = new URL(req.url).searchParams.get("isbn")?.trim();
  if (!isbn) {
    return NextResponse.json({ error: "missing isbn" }, { status: 400 });
  }
  const blurb = await fetchOpenLibraryBlurbByIsbn(isbn);
  if (!blurb) {
    return NextResponse.json(null, { status: 404 });
  }
  return NextResponse.json({ text: blurb.text, sourceUrl: blurb.sourceUrl });
}
