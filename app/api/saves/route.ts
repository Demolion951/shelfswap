import { setSaveListingCore } from "@/lib/saves/setSaveListingCore";
import { NextResponse } from "next/server";

/**
 * Toggle saved listing without server-action router refresh (feed hearts stay stable).
 * POST JSON: { listingId: string, shouldSave: boolean }
 * Location: app/api/saves/route.ts
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }

    const listingId =
      body && typeof body === "object" && "listingId" in body
        ? String((body as { listingId: unknown }).listingId ?? "").trim()
        : "";
    const shouldSave =
      body && typeof body === "object" && "shouldSave" in body
        ? Boolean((body as { shouldSave: unknown }).shouldSave)
        : false;

    if (!listingId) {
      return NextResponse.json({ ok: false, error: "Missing listing." }, { status: 400 });
    }

    const result = await setSaveListingCore(listingId, shouldSave);
    if (!result.ok) {
      const status = result.error.includes("Sign in") ? 401 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/saves]", e);
    return NextResponse.json({ ok: false, error: "Could not update saved." }, { status: 500 });
  }
}
