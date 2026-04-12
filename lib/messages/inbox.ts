import { createClient } from "@/lib/supabase/server";

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

  const { data: unlockRows, error: uErr } = await supabase
    .from("listing_unlocks")
    .select("listing_id, created_at")
    .eq("buyer_id", userId);

  if (uErr) {
    console.error("[fetchInboxThreads] listing_unlocks", uErr.message);
  }

  const { data: ownedRows, error: oErr } = await supabase
    .from("listings")
    .select("id, title, cover_url, author, created_at")
    .eq("user_id", userId)
    .eq("status", "active");

  if (oErr) {
    console.error("[fetchInboxThreads] listings owned", oErr.message);
  }

  const ownedIds = (ownedRows ?? []).map((r) => r.id as string);
  const sellerActiveListingIds = new Set<string>();

  if (ownedIds.length > 0) {
    const { data: unlocksOnOwned } = await supabase
      .from("listing_unlocks")
      .select("listing_id")
      .in("listing_id", ownedIds);

    const { data: msgsOnOwned } = await supabase
      .from("listing_messages")
      .select("listing_id")
      .in("listing_id", ownedIds);

    for (const r of unlocksOnOwned ?? []) {
      sellerActiveListingIds.add(r.listing_id as string);
    }
    for (const r of msgsOnOwned ?? []) {
      sellerActiveListingIds.add(r.listing_id as string);
    }
  }

  const acc: ThreadAcc[] = [];

  for (const r of unlockRows ?? []) {
    acc.push({
      listingId: r.listing_id as string,
      role: "buyer",
      sortFallback: r.created_at as string,
      unlockCount: 1,
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

  const { data: listingsMeta, error: lErr } = await supabase
    .from("listings")
    .select("id, title, cover_url, author")
    .in("id", allIds)
    .eq("status", "active");

  if (lErr) {
    console.error("[fetchInboxThreads] listings meta", lErr.message);
    return [];
  }

  const metaMap = new Map((listingsMeta ?? []).map((row) => [row.id as string, row]));
  const filtered = acc.filter((a) => metaMap.has(a.listingId));

  const { data: msgs } = await supabase
    .from("listing_messages")
    .select("listing_id, body, created_at")
    .in("listing_id", allIds)
    .order("created_at", { ascending: false })
    .limit(400);

  const lastMsg = new Map<string, { at: string; preview: string }>();
  for (const m of msgs ?? []) {
    const lid = m.listing_id as string;
    if (lastMsg.has(lid)) continue;
    const body = (m.body as string) ?? "";
    lastMsg.set(lid, {
      at: m.created_at as string,
      preview: body.length > 72 ? `${body.slice(0, 72)}…` : body,
    });
  }

  return filtered
    .map((a) => {
      const meta = metaMap.get(a.listingId)!;
      const lm = lastMsg.get(a.listingId);
      const lastActivityAt = lm?.at ?? a.sortFallback;
      return {
        listingId: a.listingId,
        title: meta.title as string,
        coverUrl: (meta.cover_url as string | null) ?? null,
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
