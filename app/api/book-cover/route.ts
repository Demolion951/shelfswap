import { lookupGoogleBooksByIsbn } from "@/lib/books/googleBooksLookup";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Catalogue cover proxy: Open Library first, Google Books fallback when OL has no real image.
 * Location: app/api/book-cover/route.ts
 */

const SIZES = new Set(["S", "M", "L"]);

function openLibraryUrl(isbn: string, size: string): string {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg`;
}

/** OL returns a tiny placeholder (~1x1 or empty) with 200 when no cover exists. */
const MIN_USEFUL_BYTES = 2_000;

async function fetchImageBytes(url: string): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 86_400 },
      headers: { Accept: "image/*" },
    });
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    return { bytes, contentType };
  } catch (e) {
    console.warn("[book-cover] fetch failed", url, e);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const sizeRaw = (sp.get("size") ?? "L").toUpperCase();
  const size = SIZES.has(sizeRaw) ? sizeRaw : "L";
  const isbn = (sp.get("isbn") ?? "").replace(/\D/g, "");

  if (isbn.length !== 10 && isbn.length !== 13) {
    return NextResponse.json({ error: "Valid isbn required (10 or 13 digits)" }, { status: 400 });
  }

  const ol = await fetchImageBytes(openLibraryUrl(isbn, size));
  if (ol && ol.bytes.byteLength >= MIN_USEFUL_BYTES) {
    return new NextResponse(ol.bytes, {
      status: 200,
      headers: {
        "Content-Type": ol.contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  }

  const google = await lookupGoogleBooksByIsbn(isbn);
  if (google?.coverUrl) {
    const g = await fetchImageBytes(google.coverUrl);
    if (g && g.bytes.byteLength >= 500) {
      return new NextResponse(g.bytes, {
        status: 200,
        headers: {
          "Content-Type": g.contentType,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }
  }

  if (ol) {
    return new NextResponse(ol.bytes, {
      status: 200,
      headers: {
        "Content-Type": ol.contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return new NextResponse(null, { status: 404 });
}
