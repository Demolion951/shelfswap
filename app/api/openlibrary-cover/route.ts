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

  const upstream = await fetch(target, {
    next: { revalidate: 86_400 },
    headers: { Accept: "image/*" },
  });

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status === 404 ? 404 : 502 });
  }

  const bytes = await upstream.arrayBuffer();
  if (bytes.byteLength < 500) {
    return new NextResponse(null, { status: 404 });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
