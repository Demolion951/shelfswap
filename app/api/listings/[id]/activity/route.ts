/**
 * GET listing activity snapshot for live UI sync (messages, unlock, deal state).
 * Location: app/api/listings/[id]/activity/route.ts
 */
import { fetchListingActivitySnapshot } from "@/lib/listings/fetchListingActivitySnapshot";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id: listingId } = await context.params;
  const threadBuyerId = new URL(request.url).searchParams.get("threadBuyerId");
  const dealBuyerId = new URL(request.url).searchParams.get("dealBuyerId");
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("user_id")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const isOwner = listing.user_id === user.id;
  const snapshot = await fetchListingActivitySnapshot(
    listingId,
    user.id,
    isOwner,
    threadBuyerId,
    dealBuyerId,
  );
  if (!snapshot) {
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }

  return NextResponse.json(snapshot);
}
