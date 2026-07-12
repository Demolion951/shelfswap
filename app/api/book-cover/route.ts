import { resolveCatalogueCoverBytes } from "@/lib/books/catalogueCoverResolve";
import { unstable_cache } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Catalogue cover proxy: OL ISBN → OL search cover_id → Google ISBN → Google title/author.
 * Only successful covers are cached (misses are not stored so OL search can succeed later).
 * Location: app/api/book-cover/route.ts
 */

const SIZES = new Set(["S", "M", "L"]);

type CachedCoverPayload = {
  bytesB64: string;
  contentType: string;
  source: string;
};

const getCachedCoverBytes = unstable_cache(
  async (
    isbn: string,
    size: "S" | "M" | "L",
    title: string | null,
    author: string | null,
  ): Promise<CachedCoverPayload> => {
    const result = await resolveCatalogueCoverBytes(isbn, { size, title, author });
    if (!result) {
      throw new Error(`no-cover:${isbn}:${size}`);
    }
    return {
      bytesB64: Buffer.from(result.bytes).toString("base64"),
      contentType: result.contentType,
      source: result.source,
    };
  },
  ["book-cover-bytes-v5"],
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

  try {
    const resolved = await getCachedCoverBytes(isbn, size, title, author);
    const bytes = Buffer.from(resolved.bytesB64, "base64");
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": resolved.contentType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Cover-Source": resolved.source,
      },
    });
  } catch {
    // Never cache misses — localhost was sticking on blank covers after one flake.
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
