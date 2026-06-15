/**
 * Lightweight listing activity snapshot for client polling (messages, unlock, deal).
 * Location: lib/listings/fetchListingActivitySnapshot.ts
 */
import type { UnlockDeal } from "@/components/listings/DealPanel";
import type { PendingUnlockRequest } from "@/components/listings/UnlockRequestsPanel";
import { fetchListingMessagesIfAllowed } from "@/lib/listings/queries";
import { normalizeUnlockCredits } from "@/lib/listings/swapCredits";
import { createClient } from "@/lib/supabase/server";
import { pickSellerUnlockRow } from "@/lib/listings/unlockDeal";

export type ListingActivitySnapshot = {
  messages: Awaited<ReturnType<typeof fetchListingMessagesIfAllowed>>;
  pendingRequests: PendingUnlockRequest[];
  viewerUnlocked: boolean;
  viewerPendingUnlock: boolean;
  creditsPendingSellerReply: boolean;
  unlockDeal: UnlockDeal | null;
};

function parseCreditsSpent(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 1);
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

function parseSwapCreditsRefunded(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

async function buildUnlockDeal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listingId: string,
  row: NonNullable<ReturnType<typeof pickSellerUnlockRow>>,
): Promise<UnlockDeal> {
  let offeredTitle: string | null = null;
  let offeredCredits: number | null = null;
  if (row.offered_listing_id) {
    const { data: ol } = await supabase
      .from("listings")
      .select("title, unlock_credits")
      .eq("id", row.offered_listing_id)
      .maybeSingle();
    offeredTitle = (ol?.title as string | null) ?? null;
    if (ol) offeredCredits = normalizeUnlockCredits(ol.unlock_credits);
  }
  return {
    buyerId: String(row.buyer_id),
    dealType: row.deal_type === "swap" ? "swap" : "pickup",
    swapStatus: (row.swap_status as UnlockDeal["swapStatus"]) ?? null,
    offeredListingId: (row.offered_listing_id as string | null) ?? null,
    offeredTitle,
    offeredCredits,
    creditsSpent: parseCreditsSpent(row.credits_spent),
    swapCreditsRefunded: parseSwapCreditsRefunded(row.swap_credits_refunded),
    buyerConfirmedAt: (row.buyer_confirmed_at as string | null) ?? null,
    sellerConfirmedAt: (row.seller_confirmed_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    unlockCreatedAt: (row.created_at as string | null) ?? null,
    buyerMutualCancelAt: (row.buyer_mutual_cancel_at as string | null) ?? null,
    sellerMutualCancelAt: (row.seller_mutual_cancel_at as string | null) ?? null,
  };
}

export async function fetchListingActivitySnapshot(
  listingId: string,
  userId: string,
  isOwner: boolean,
): Promise<ListingActivitySnapshot | null> {
  const supabase = await createClient();

  const messages = await fetchListingMessagesIfAllowed(listingId);

  let viewerUnlocked = false;
  let viewerPendingUnlock = false;
  let creditsPendingSellerReply = false;
  let unlockDeal: UnlockDeal | null = null;
  let pendingRequests: PendingUnlockRequest[] = [];

  if (!isOwner) {
    const [unlockRes, pendingReqRes] = await Promise.all([
      supabase
        .from("listing_unlocks")
        .select("id, balance_captured_at")
        .eq("buyer_id", userId)
        .eq("listing_id", listingId)
        .maybeSingle(),
      supabase
        .from("listing_unlock_requests")
        .select("id")
        .eq("buyer_id", userId)
        .eq("listing_id", listingId)
        .eq("status", "pending")
        .maybeSingle(),
    ]);
    viewerUnlocked = !!unlockRes.data;
    viewerPendingUnlock = !viewerUnlocked && !!pendingReqRes.data;
    const meta = unlockRes.data as { balance_captured_at?: string | null } | null;
    creditsPendingSellerReply =
      !!viewerUnlocked && !!meta && meta.balance_captured_at == null;

    if (viewerUnlocked) {
      const { data: u } = await supabase
        .from("listing_unlocks")
        .select(
          "buyer_id, deal_type, swap_status, offered_listing_id, buyer_confirmed_at, seller_confirmed_at, completed_at, credits_spent, swap_credits_refunded, created_at, buyer_mutual_cancel_at, seller_mutual_cancel_at",
        )
        .eq("listing_id", listingId)
        .eq("buyer_id", userId)
        .maybeSingle();
      if (u) unlockDeal = await buildUnlockDeal(supabase, listingId, u);
    }
  } else {
    const { data: unlockRows } = await supabase
      .from("listing_unlocks")
      .select(
        "buyer_id, deal_type, swap_status, offered_listing_id, buyer_confirmed_at, seller_confirmed_at, completed_at, credits_spent, swap_credits_refunded, created_at, buyer_mutual_cancel_at, seller_mutual_cancel_at",
      )
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false })
      .limit(24);
    const u = pickSellerUnlockRow(unlockRows ?? null);
    if (u) unlockDeal = await buildUnlockDeal(supabase, listingId, u);

    const { data: reqs } = await supabase
      .from("listing_unlock_requests")
      .select("id, buyer_id, credits_held, created_at")
      .eq("listing_id", listingId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    const rows = (reqs ?? []) as Array<{
      id: string;
      buyer_id: string;
      credits_held: number;
      created_at: string;
    }>;
    const buyerIds = rows.map((r) => r.buyer_id);
    let buyerMap = new Map<string, string>();
    if (buyerIds.length > 0) {
      const { data: profs } = await supabase.rpc("profiles_public_batch", {
        p_user_ids: buyerIds,
      });
      const pr = (profs ?? []) as Array<{ id: string; display_name: string | null }>;
      buyerMap = new Map(pr.map((p) => [String(p.id), (p.display_name ?? "").trim() || "member"]));
    }
    pendingRequests = rows.map((r) => ({
      id: r.id,
      buyerId: r.buyer_id,
      buyerHandle: buyerMap.get(r.buyer_id) ?? "member",
      creditsHeld: r.credits_held,
      createdAt: r.created_at,
    }));
  }

  return {
    messages,
    pendingRequests,
    viewerUnlocked,
    viewerPendingUnlock,
    creditsPendingSellerReply,
    unlockDeal,
  };
}
