import { resolveCatalogueCoverBytes } from "@/lib/books/catalogueCoverResolve";
import { unstable_cache } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Catalogue cover proxy: OL ISBN → OL search cover_id → Google ISBN → Google title/author.
 * Location: app/api/book-cover/route.ts
 */

const SIZES = new Set(["S", "M", "L"]);

const getCachedCoverBytes = unstable_cache(
  async (isbn: string, size: "S" | "M" | "L", title: string | null, author: string | null) =>
    resolveCatalogueCoverBytes(isbn, { size, title, author }),
  ["book-cover-bytes"],
  { revalidate: 86_400 },
);

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const sizeRaw = (sp.get("size") ?? "L").toUpperCase();
  const size = SIZES.has(sizeRaw) ? (sizeRaw as "S" | "M" | "L") : "L";
  const isbn = (sp.get("isbn") ?? "").replace(/\D/g, "");
  const title = sp.get("title")?.trim() || null;
  const author = sp.get("author")?.trim() || null;

  if (isbn.length !== 10 && isbn.length !== 13) {
    return NextResponse.json({ error: "Valid isbn required (10 or 13 digits)" }, { status: 400 });
  }

  const resolved = await getCachedCoverBytes(isbn, size, title, author);
  if (resolved) {
    return new NextResponse(resolved.bytes, {
      status: 200,
      headers: {
        "Content-Type": resolved.contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Cover-Source": resolved.source,
      },
    });
  }

  return new NextResponse(null, { status: 404 });
}
