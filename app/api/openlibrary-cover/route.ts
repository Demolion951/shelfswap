import { coverSuccessHeaders } from "@/lib/books/coverCacheHeaders";
import { unstable_cache } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Proxies Open Library cover images through our origin so mobile browsers load them reliably
 * (third-party hotlink / referrer / mixed-content issues).
 * Only allows covers.openlibrary.org paths we construct from validated isbn or id.
 * Location: app/api/openlibrary-cover/route.ts
 */

const SIZES = new Set(["S", "M", "L"]);

function upstreamUrl(isbn: string | null, id: string | null, size: string): string | null {
  if (isbn && (isbn.length === 10 || isbn.length === 13)) {
    return `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg`;
  }
  if (id && /^\d+$/.test(id) && id.length <= 12) {
    return `https://covers.openlibrary.org/b/id/${id}-${size}.jpg`;
  }
  return null;
}

type CachedOlCover = {
  bytesB64: string;
  contentType: string;
};

const getCachedOlCover = unstable_cache(
  async (target: string): Promise<CachedOlCover> => {
    const upstream = await fetch(target, {
      next: { revalidate: 604_800 },
      headers: { Accept: "image/*" },
    });
    if (!upstream.ok) {
      throw new Error(`ol-cover:${upstream.status}`);
    }
    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (bytes.byteLength < 500) {
      throw new Error("ol-cover:too-small");
    }
    return {
      bytesB64: bytes.toString("base64"),
      contentType: upstream.headers.get("content-type") ?? "image/jpeg",
    };
  },
  ["openlibrary-cover-bytes-v1"],
  { revalidate: 604_800 },
);

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const sizeRaw = (sp.get("size") ?? "L").toUpperCase();
  const size = SIZES.has(sizeRaw) ? sizeRaw : "L";
  const isbnRaw = sp.get("isbn");
  const idRaw = sp.get("id");
  const isbn = isbnRaw != null ? isbnRaw.replace(/\D/g, "") : null;
  const id = idRaw != null ? idRaw.replace(/\D/g, "") : null;

  const hasIsbn = Boolean(isbn && (isbn.length === 10 || isbn.length === 13));
  const hasId = Boolean(id && /^\d+$/.test(id) && id.length <= 12);

  if ((!hasIsbn && !hasId) || (hasIsbn && hasId)) {
    return NextResponse.json(
      { error: "Provide exactly one of: valid isbn (10 or 13 digits) or cover id" },
      { status: 400 },
    );
  }

  const target = upstreamUrl(hasIsbn ? isbn : null, hasId ? id : null, size);
  if (!target) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    const cached = await getCachedOlCover(target);
    const bytes = Buffer.from(cached.bytesB64, "base64");
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": cached.contentType,
        "Content-Length": String(bytes.byteLength),
        ...coverSuccessHeaders(),
      },
    });
  } catch {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
