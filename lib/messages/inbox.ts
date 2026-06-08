import { createClient } from "@/lib/supabase/server";
import { primaryListingCoverSrc } from "@/lib/listings/listingCover";
import type { ListingWithRelations } from "@/lib/listings/queries";

export type InboxThread = {
  listingId: string;
  title: string;
  coverUrl: string | null;
  author: string | null;
  role: "buyer" | "seller";
  lastActivityAt: string;
  preview: string | null;
  /** Seller: number of buyers who unlocked (same shared thread). */
  unlockCount: number;
};

type ThreadAcc = {
  listingId: string;
  role: "buyer" | "seller";
  sortFallback: string;
  unlockCount: number;
};

/**
 * Inbox rows: listings the user is coordinating on (unlocked as buyer, or selling with unlocks/messages).
 * Location: lib/messages/inbox.ts
 */
export async function fetchInboxThreads(userId: string): Promise<InboxThread[]> {
  const supabase = await createClient();

  const [
    { data: unlockRows, error: uErr },
    { data: pendingBuyerReqs, error: pbErr },
    { data: ownedRows, error: oErr },
  ] = await Promise.all([
    supabase
      .from("listing_unlocks")
      .select("listing_id, created_at")
      .eq("buyer_id", userId),
    supabase
      .from("listing_unlock_requests")
      .select("listing_id, created_at")
      .eq("buyer_id", userId)
      .eq("status", "pending"),
    supabase
      .from("listings")
      .select("id, title, cover_url, author, created_at, listing_photos ( id, url, sort )")
      .eq("user_id", userId)
      .eq("status", "active"),
  ]);

  if (uErr) {
    console.error("[fetchInboxThreads] listing_unlocks", uErr.message);
  }
  if (pbErr) {
    console.error("[fetchInboxThreads] listing_unlock_requests buyer", pbErr.message);
  }
  if (oErr) {
    console.error("[fetchInboxThreads] listings owned", oErr.message);
  }

  const ownedIds = (ownedRows ?? []).map((r) => r.id as string);
  const sellerActiveListingIds = new Set<string>();

  if (ownedIds.length > 0) {
    const [
      { data: unlocksOnOwned },
      { data: pendingOnOwned },
      { data: msgsOnOwned },
    ] = await Promise.all([
      supabase.from("listing_unlocks").select("listing_id").in("listing_id", ownedIds),
      supabase
        .from("listing_unlock_requests")
        .select("listing_id")
        .in("listing_id", ownedIds)
        .eq("status", "pending"),
      supabase.from("listing_messages").select("listing_id").in("listing_id", ownedIds).neq("sender_id", userId),
    ]);

    for (const r of unlocksOnOwned ?? []) {
      sellerActiveListingIds.add(r.listing_id as string);
    }
    for (const r of pendingOnOwned ?? []) {
      sellerActiveListingIds.add(r.listing_id as string);
    }
    for (const r of msgsOnOwned ?? []) {
      sellerActiveListingIds.add(r.listing_id as string);
    }
  }

  const acc: ThreadAcc[] = [];

  const buyerListingSeen = new Set<string>();
  for (const r of unlockRows ?? []) {
    const lid = r.listing_id as string;
    buyerListingSeen.add(lid);
    acc.push({
      listingId: lid,
      role: "buyer",
      sortFallback: r.created_at as string,
      unlockCount: 1,
    });
  }

  for (const r of pendingBuyerReqs ?? []) {
    const lid = r.listing_id as string;
    if (buyerListingSeen.has(lid)) continue;
    buyerListingSeen.add(lid);
    acc.push({
      listingId: lid,
      role: "buyer",
      sortFallback: r.created_at as string,
      unlockCount: 0,
    });
  }

  const ownedById = new Map((ownedRows ?? []).map((row) => [row.id as string, row]));

  for (const id of sellerActiveListingIds) {
    const row = ownedById.get(id);
    if (!row) continue;
    acc.push({
      listingId: id,
      role: "seller",
      sortFallback: (row.created_at as string) ?? new Date(0).toISOString(),
      unlockCount: 0,
    });
  }

  const unlockCounts = new Map<string, number>();
  if (sellerActiveListingIds.size > 0) {
    const ids = [...sellerActiveListingIds];
    const { data: cntRows } = await supabase
      .from("listing_unlocks")
      .select("listing_id")
      .in("listing_id", ids);

    for (const r of cntRows ?? []) {
      const lid = r.listing_id as string;
      unlockCounts.set(lid, (unlockCounts.get(lid) ?? 0) + 1);
    }
  }

  for (const item of acc) {
    if (item.role === "seller") {
      item.unlockCount = unlockCounts.get(item.listingId) ?? 0;
    }
  }

  const allIds = [...new Set(acc.map((a) => a.listingId))];
  if (allIds.length === 0) return [];

  const [{ data: listingsMeta, error: lErr }, { data: msgs }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, title, cover_url, author, listing_photos ( id, url, sort )")
      .in("id", allIds)
      .eq("status", "active"),
    supabase
      .from("listing_messages")
      .select("listing_id, body, image_url, created_at")
      .in("listing_id", allIds)
      .order("created_at", { ascending: false })
      .limit(Math.min(allIds.length * 3, 120)),
  ]);

  if (lErr) {
    console.error("[fetchInboxThreads] listings meta", lErr.message);
    return [];
  }

  const metaMap = new Map((listingsMeta ?? []).map((row) => [row.id as string, row]));
  const filtered = acc.filter((a) => metaMap.has(a.listingId));

  const lastMsg = new Map<string, { at: string; preview: string }>();
  for (const m of msgs ?? []) {
    const lid = m.listing_id as string;
    if (lastMsg.has(lid)) continue;
    const body = (m.body as string) ?? "";
    const imageUrl = (m.image_url as string | null) ?? null;
    const preview =
      body.length > 0
        ? body.length > 72
          ? `${body.slice(0, 72)}…`
          : body
        : imageUrl
          ? "Photo"
          : "";
    lastMsg.set(lid, {
      at: m.created_at as string,
      preview,
    });
  }

  return filtered
    .map((a) => {
      const meta = metaMap.get(a.listingId)!;
      const lm = lastMsg.get(a.listingId);
      const lastActivityAt = lm?.at ?? a.sortFallback;
      const coverSrc = primaryListingCoverSrc(meta as ListingWithRelations, "S");
      return {
        listingId: a.listingId,
        title: meta.title as string,
        coverUrl: coverSrc,
        author: (meta.author as string | null) ?? null,
        role: a.role,
        lastActivityAt,
        preview: lm?.preview ?? null,
        unlockCount: a.unlockCount,
      };
    })
    .sort(
      (x, y) =>
        new Date(y.lastActivityAt).getTime() - new Date(x.lastActivityAt).getTime(),
    );
}
