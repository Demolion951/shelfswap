/**
 * Helpers for picking the active listing_unlocks row on seller listing detail.
 * Location: lib/listings/unlockDeal.ts
 */

export function pickSellerUnlockRow(
  rows:
    | Array<{
        buyer_id: string;
        deal_type: string | null;
        swap_status: string | null;
        offered_listing_id: string | null;
        credits_spent: number | null;
        swap_credits_refunded: number | null;
        buyer_confirmed_at: string | null;
        seller_confirmed_at: string | null;
        completed_at: string | null;
        created_at: string | null;
        buyer_mutual_cancel_at: string | null;
        seller_mutual_cancel_at: string | null;
      }>
    | null,
) {
  if (!rows?.length) return null;
  const proposed = rows.find((r) => r.deal_type === "swap" && r.swap_status === "proposed");
  if (proposed) return proposed;
  const accepted = rows.find((r) => r.deal_type === "swap" && r.swap_status === "accepted");
  if (accepted) return accepted;
  const anySwap = rows.find((r) => r.deal_type === "swap");
  if (anySwap) return anySwap;
  return rows[0];
}

export function pickSellerUnlockRowForBuyer(
  rows: Parameters<typeof pickSellerUnlockRow>[0],
  buyerId: string | null | undefined,
) {
  if (!rows?.length) return null;
  if (buyerId) {
    const match = rows.find((r) => String(r.buyer_id) === buyerId);
    if (match) return match;
  }
  return pickSellerUnlockRow(rows);
}
