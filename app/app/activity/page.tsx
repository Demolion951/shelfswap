import { LocalDateTimeText } from "@/components/messages/LocalDateTimeText";
import { createClient } from "@/lib/supabase/server";
import { Bell, Gift, Library, Lock, MessageCircle, Shuffle, Sparkles, Timer } from "lucide-react";
import Link from "next/link";

type EventRow = {
  id: string;
  type: string;
  listing_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type NotifRow = {
  id: string;
  type: string;
  listing_id: string | null;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

type TimelineItem =
  | {
      key: string;
      createdAt: string;
      kind: "buyer_unlock";
      listingId: string;
      credits: number;
    }
  | {
      key: string;
      createdAt: string;
      kind: "create_listing";
      listingId: string | null;
      titleHint: string | null;
    }
  | {
      key: string;
      createdAt: string;
      kind: "seller_unlock";
      listingId: string;
      credits: number;
    }
  | {
      key: string;
      createdAt: string;
      kind: "conversation_started";
      listingId: string;
      payload: Record<string, unknown>;
      wasUnread: boolean;
    }
  | {
      key: string;
      createdAt: string;
      kind: "unlock_request";
      listingId: string;
      buyerId: string;
      credits: number;
      wasUnread: boolean;
    }
  | {
      key: string;
      createdAt: string;
      kind: "unlock_decision";
      listingId: string;
      outcome: "accepted" | "declined";
      credits: number;
      wasUnread: boolean;
    }
  | {
      key: string;
      createdAt: string;
      kind: "swap_offer_decision";
      listingId: string;
      outcome: "accepted" | "declined";
      offeredListingId: string | null;
      listingTitleHint: string | null;
      offeredTitleHint: string | null;
      wasUnread: boolean;
    }
  | {
      key: string;
      createdAt: string;
      kind: "deal_completed";
      listingId: string;
      wasUnread: boolean;
    }
  | {
      key: string;
      createdAt: string;
      kind: "seller_reward";
      listingId: string | null;
      earned: number;
      completedSales: number | null;
      wasUnread: boolean;
    };

function listingTitle(
  id: string | null,
  map: Record<string, string>,
  hint: string | null | undefined,
): string {
  if (id && map[id]) return map[id];
  if (hint && hint.trim()) return hint.trim();
  if (id) return "A listing";
  return "ShelfSwap";
}

/**
 * Activity feed: notifications (messages, unlock requests), listing events, and unlocks.
 * Opening this page also marks in-app notifications read (bell may already be cleared when opened from the header).
 * Location: app/app/activity/page.tsx
 */
export default async function ActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-2">
        <div className="rounded-full bg-accent/15 p-5 text-accent">
          <Bell className="h-10 w-10" strokeWidth={1.5} aria-hidden />
        </div>
        <p className="text-sm text-base-content/65 max-w-xs">
          Sign in to see unlocks, new listings, and buyer activity.
        </p>
        <Link href="/auth/sign-in?next=%2Fapp%2Factivity" className="btn btn-primary">
          Sign in
        </Link>
      </div>
    );
  }

  const { data: events, error: evErr } = await supabase
    .from("events")
    .select("id, type, listing_id, payload, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (evErr) {
    console.error("[ActivityPage] events", evErr.message);
  }

  const { data: ownedListings } = await supabase
    .from("listings")
    .select("id")
    .eq("user_id", user.id);

  const ownedIds = (ownedListings ?? []).map((r) => r.id as string);

  let sellerUnlocks: Array<{
    id: string;
    created_at: string;
    credits_spent: number;
    listing_id: string;
  }> = [];

  if (ownedIds.length > 0) {
    const { data: uRows, error: uErr } = await supabase
      .from("listing_unlocks")
      .select("id, created_at, credits_spent, listing_id")
      .in("listing_id", ownedIds)
      .order("created_at", { ascending: false })
      .limit(50);

    if (uErr) {
      console.error("[ActivityPage] listing_unlocks", uErr.message);
    } else {
      sellerUnlocks = uRows ?? [];
    }
  }

  const { data: notifRows, error: notifErr } = await supabase
    .from("notifications")
    .select("id, type, listing_id, payload, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  if (notifErr) {
    const m = notifErr.message.toLowerCase();
    if (!m.includes("relation") && !m.includes("does not exist") && !m.includes("schema cache")) {
      console.error("[ActivityPage] notifications", notifErr.message);
    }
  }

  const listingIdSet = new Set<string>();
  for (const e of (events ?? []) as EventRow[]) {
    if (e.listing_id) listingIdSet.add(e.listing_id);
  }
  for (const u of sellerUnlocks) {
    listingIdSet.add(u.listing_id);
  }
  for (const n of (notifRows ?? []) as NotifRow[]) {
    if (n.listing_id) listingIdSet.add(n.listing_id);
    if (n.type === "swap_accepted" || n.type === "swap_declined") {
      const sp = (n.payload ?? {}) as Record<string, unknown>;
      const oid = sp.offered_listing_id;
      if (typeof oid === "string" && oid.length > 0) listingIdSet.add(oid);
    }
  }

  const listingIds = [...listingIdSet];
  const titleById: Record<string, string> = {};
  if (listingIds.length > 0) {
    const { data: listings, error: lErr } = await supabase
      .from("listings")
      .select("id, title")
      .in("id", listingIds);

    if (lErr) {
      console.error("[ActivityPage] listings", lErr.message);
    } else {
      for (const row of listings ?? []) {
        const id = row.id as string;
        const t = row.title as string;
        titleById[id] = t;
      }
    }
  }

  const items: TimelineItem[] = [];

  for (const e of (events ?? []) as EventRow[]) {
    if (e.type === "unlock_listing" && e.listing_id) {
      const credits = Number(
        (e.payload as { credits_spent?: number } | null)?.credits_spent ?? 1,
      );
      items.push({
        key: `event-unlock-${e.id}`,
        createdAt: e.created_at,
        kind: "buyer_unlock",
        listingId: e.listing_id,
        credits: Number.isFinite(credits) ? credits : 1,
      });
    } else if (e.type === "create_listing") {
      const hint = (e.payload as { title?: string } | null)?.title ?? null;
      items.push({
        key: `event-create-${e.id}`,
        createdAt: e.created_at,
        kind: "create_listing",
        listingId: e.listing_id,
        titleHint: hint,
      });
    }
  }

  for (const u of sellerUnlocks) {
    items.push({
      key: `seller-unlock-${u.id}`,
      createdAt: u.created_at,
      kind: "seller_unlock",
      listingId: u.listing_id,
      credits: u.credits_spent,
    });
  }

  for (const n of (notifRows ?? []) as NotifRow[]) {
    if (!n.listing_id) continue;
    const payload = (n.payload ?? {}) as Record<string, unknown>;
    if (n.type === "swap_accepted" || n.type === "swap_declined") {
      const oid = payload.offered_listing_id;
      const offeredListingId =
        typeof oid === "string" ? oid : oid != null ? String(oid) : null;
      const lt = payload.listing_title;
      const ot = payload.offered_title;
      items.push({
        key: `notif-swap-${n.id}`,
        createdAt: n.created_at,
        kind: "swap_offer_decision",
        listingId: n.listing_id,
        outcome: n.type === "swap_accepted" ? "accepted" : "declined",
        offeredListingId,
        listingTitleHint: typeof lt === "string" ? lt : null,
        offeredTitleHint: typeof ot === "string" ? ot : null,
        wasUnread: n.read_at == null,
      });
      continue;
    }
    if (n.type === "conversation_started") {
      items.push({
        key: `notif-${n.id}`,
        createdAt: n.created_at,
        kind: "conversation_started",
        listingId: n.listing_id,
        payload,
        wasUnread: n.read_at == null,
      });
    }
    if (n.type === "new_message") {
      items.push({
        key: `notif-msg-${n.id}`,
        createdAt: n.created_at,
        kind: "conversation_started",
        listingId: n.listing_id,
        payload: { ...payload, _is_message: true },
        wasUnread: n.read_at == null,
      });
    }
    if (n.type === "unlock_request") {
      const buyerRaw = payload.buyer_id;
      const buyerId = typeof buyerRaw === "string" ? buyerRaw : "";
      const credits = Number(payload.credits ?? 1);
      items.push({
        key: `notif-unlock-req-${n.id}`,
        createdAt: n.created_at,
        kind: "unlock_request",
        listingId: n.listing_id,
        buyerId,
        credits: Number.isFinite(credits) ? credits : 1,
        wasUnread: n.read_at == null,
      });
    }
    if (n.type === "unlock_accepted" || n.type === "unlock_declined") {
      const credits = Number(payload.credits ?? 1);
      items.push({
        key: `notif-unlock-decision-${n.id}`,
        createdAt: n.created_at,
        kind: "unlock_decision",
        listingId: n.listing_id,
        outcome: n.type === "unlock_accepted" ? "accepted" : "declined",
        credits: Number.isFinite(credits) ? credits : 1,
        wasUnread: n.read_at == null,
      });
    }
    if (n.type === "deal_completed") {
      items.push({
        key: `notif-deal-completed-${n.id}`,
        createdAt: n.created_at,
        kind: "deal_completed",
        listingId: n.listing_id,
        wasUnread: n.read_at == null,
      });
    }
    if (n.type === "seller_reward") {
      const earned = Number(payload.earned ?? 1);
      const completedSales = Number(payload.completed_sales ?? payload.completedSales ?? null);
      items.push({
        key: `notif-seller-reward-${n.id}`,
        createdAt: n.created_at,
        kind: "seller_reward",
        listingId: n.listing_id,
        earned: Number.isFinite(earned) ? earned : 1,
        completedSales: Number.isFinite(completedSales) ? completedSales : null,
        wasUnread: n.read_at == null,
      });
    }
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const unlockRequestBuyerIds = [
    ...new Set(
      items
        .filter((i): i is Extract<TimelineItem, { kind: "unlock_request" }> => i.kind === "unlock_request")
        .map((i) => i.buyerId)
        .filter((id) => id.length > 0),
    ),
  ];

  const buyerDisplayById: Record<string, string> = {};
  if (unlockRequestBuyerIds.length > 0) {
    const { data: publicProfiles, error: ppErr } = await supabase.rpc("profiles_public_batch", {
      p_user_ids: unlockRequestBuyerIds,
    });
    if (ppErr) {
      console.error("[ActivityPage] profiles_public_batch", ppErr.message);
    } else {
      for (const row of publicProfiles ?? []) {
        const id = row.id as string;
        const dn = (row.display_name as string | null)?.trim();
        buyerDisplayById[id] = dn && dn.length > 0 ? dn : "A reader";
      }
    }
  }

  const { error: markReadErr } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (markReadErr) {
    const m = markReadErr.message.toLowerCase();
    if (!m.includes("relation") && !m.includes("does not exist") && !m.includes("schema cache")) {
      console.error("[ActivityPage] mark notifications read", markReadErr.message);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-2">
        <div className="rounded-full bg-accent/15 p-5 text-accent">
          <Bell className="h-10 w-10" strokeWidth={1.5} aria-hidden />
        </div>
        <div className="space-y-2 max-w-xs">
          <h1 className="shelfswap-heading text-xl font-semibold">No activity yet</h1>
          <p className="text-sm text-base-content/65">
            List a book, unlock a title, get a message, or wait for a buyer — it will show up here.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-base-content/45">
          <Sparkles className="h-4 w-4" aria-hidden />
          <span>Live feed</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-10 pt-2">
      <div className="flex items-center gap-2">
        <Bell className="h-6 w-6 text-primary" aria-hidden />
        <h1 className="shelfswap-heading text-xl font-semibold">Activity</h1>
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          if (item.kind === "buyer_unlock") {
            const title = listingTitle(item.listingId, titleById, null);
            return (
              <li key={item.key}>
                <div className="card card-border bg-base-100 border-base-300/80 shadow-sm">
                  <div className="card-body gap-1 py-4">
                    <div className="flex items-start gap-2">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-base-content">
                          You unlocked{" "}
                          <span className="font-medium">{title}</span> for{" "}
                          {item.credits} credit{item.credits === 1 ? "" : "s"}.
                        </p>
                        <p className="text-xs text-base-content/50 mt-1">
                          <LocalDateTimeText iso={item.createdAt} />
                        </p>
                        <Link
                          href={`/app/listings/${item.listingId}`}
                          className="link link-primary text-xs mt-2 inline-block"
                        >
                          Open listing
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          }

          if (item.kind === "seller_unlock") {
            const title = listingTitle(item.listingId, titleById, null);
            return (
              <li key={item.key}>
                <div className="card card-border bg-base-100 border-base-300/80 shadow-sm">
                  <div className="card-body gap-1 py-4">
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-base-content">
                          Someone unlocked{" "}
                          <span className="font-medium">{title}</span> ({item.credits} credit
                          {item.credits === 1 ? "" : "s"}).
                        </p>
                        <p className="text-xs text-base-content/50 mt-1">
                          <LocalDateTimeText iso={item.createdAt} />
                        </p>
                        <Link
                          href={`/app/listings/${item.listingId}`}
                          className="link link-primary text-xs mt-2 inline-block"
                        >
                          Open listing
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          }

          if (item.kind === "unlock_request") {
            const title = listingTitle(item.listingId, titleById, null);
            const who =
              item.buyerId && buyerDisplayById[item.buyerId]
                ? buyerDisplayById[item.buyerId]
                : "Someone";
            return (
              <li key={item.key}>
                <div
                  className={`card card-border bg-base-100 shadow-sm ${
                    item.wasUnread ? "border-primary/35" : "border-base-300/80"
                  }`}
                >
                  <div className="card-body gap-1 py-4">
                    <div className="flex items-start gap-2">
                      <Timer className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm text-base-content">
                            <span className="font-medium">{who}</span> requested to unlock{" "}
                            <span className="font-medium">{title}</span>
                            {" — "}
                            {item.credits} credit{item.credits === 1 ? "" : "s"} on hold for 24h.
                          </p>
                          {item.wasUnread ? (
                            <span className="badge badge-primary badge-xs">New</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-base-content/50 mt-1">
                          <LocalDateTimeText iso={item.createdAt} />
                        </p>
                        <Link
                          href={`/app/listings/${item.listingId}`}
                          className="link link-primary text-xs mt-2 inline-block"
                        >
                          Open listing to accept or decline
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          }

          if (item.kind === "unlock_decision") {
            const title = listingTitle(item.listingId, titleById, null);
            return (
              <li key={item.key}>
                <div
                  className={`card card-border bg-base-100 shadow-sm ${
                    item.wasUnread ? "border-primary/35" : "border-base-300/80"
                  }`}
                >
                  <div className="card-body gap-1 py-4">
                    <div className="flex items-start gap-2">
                      <Lock
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          item.outcome === "accepted" ? "text-primary" : "text-base-content/45"
                        }`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm text-base-content">
                            Unlock request{" "}
                            <span className="font-medium">
                              {item.outcome === "accepted" ? "accepted" : "declined"}
                            </span>{" "}
                            for <span className="font-medium">{title}</span> ({item.credits} credit
                            {item.credits === 1 ? "" : "s"}).
                          </p>
                          {item.wasUnread ? (
                            <span className="badge badge-primary badge-xs">New</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-base-content/50 mt-1">
                          <LocalDateTimeText iso={item.createdAt} />
                        </p>
                        <Link
                          href={`/app/listings/${item.listingId}`}
                          className="link link-primary text-xs mt-2 inline-block"
                        >
                          Open listing
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          }

          if (item.kind === "swap_offer_decision") {
            const theirs = listingTitle(item.listingId, titleById, item.listingTitleHint);
            const yours = item.offeredTitleHint?.trim()
              ? item.offeredTitleHint.trim()
              : item.offeredListingId
                ? listingTitle(item.offeredListingId, titleById, null)
                : "your offered book";
            return (
              <li key={item.key}>
                <div
                  className={`card card-border bg-base-100 shadow-sm ${
                    item.wasUnread ? "border-primary/35" : "border-base-300/80"
                  }`}
                >
                  <div className="card-body gap-1 py-4">
                    <div className="flex items-start gap-2">
                      <Shuffle
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          item.outcome === "accepted" ? "text-success" : "text-warning"
                        }`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm text-base-content">
                            Swap{" "}
                            <span className="font-medium">
                              {item.outcome === "accepted" ? "accepted" : "declined"}
                            </span>
                            : their <span className="font-medium">{theirs}</span> for your{" "}
                            <span className="font-medium">{yours}</span>.
                          </p>
                          {item.wasUnread ? (
                            <span className="badge badge-primary badge-xs">New</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-base-content/50 mt-1">
                          <LocalDateTimeText iso={item.createdAt} />
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                          <Link
                            href={`/app/listings/${item.listingId}`}
                            className="link link-primary text-xs inline-block"
                          >
                            Their listing
                          </Link>
                          {item.offeredListingId ? (
                            <Link
                              href={`/app/listings/${item.offeredListingId}`}
                              className="link link-secondary text-xs inline-block"
                            >
                              Your offered listing
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          }

          if (item.kind === "deal_completed") {
            const title = listingTitle(item.listingId, titleById, null);
            return (
              <li key={item.key}>
                <div
                  className={`card card-border bg-base-100 shadow-sm ${
                    item.wasUnread ? "border-primary/35" : "border-base-300/80"
                  }`}
                >
                  <div className="card-body gap-1 py-4">
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm text-base-content">
                            Deal completed for <span className="font-medium">{title}</span>.
                          </p>
                          {item.wasUnread ? (
                            <span className="badge badge-primary badge-xs">New</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-base-content/50 mt-1">
                          <LocalDateTimeText iso={item.createdAt} />
                        </p>
                        <Link
                          href={`/app/listings/${item.listingId}`}
                          className="link link-primary text-xs mt-2 inline-block"
                        >
                          Open listing
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          }

          if (item.kind === "seller_reward") {
            const title = item.listingId ? listingTitle(item.listingId, titleById, null) : "ShelfSwap";
            return (
              <li key={item.key}>
                <div
                  className={`card card-border bg-base-100 shadow-sm ${
                    item.wasUnread ? "border-primary/35" : "border-base-300/80"
                  }`}
                >
                  <div className="card-body gap-1 py-4">
                    <div className="flex items-start gap-2">
                      <Gift className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm text-base-content">
                            You earned{" "}
                            <span className="font-medium">
                              {item.earned} credit{item.earned === 1 ? "" : "s"}
                            </span>{" "}
                            for selling books on ShelfSwap.
                            {item.completedSales ? (
                              <>
                                {" "}
                                ({item.completedSales} completed sale
                                {item.completedSales === 1 ? "" : "s"})
                              </>
                            ) : null}
                          </p>
                          {item.wasUnread ? (
                            <span className="badge badge-primary badge-xs">New</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-base-content/50 mt-1">
                          <LocalDateTimeText iso={item.createdAt} />
                        </p>
                        {item.listingId ? (
                          <Link
                            href={`/app/listings/${item.listingId}`}
                            className="link link-primary text-xs mt-2 inline-block"
                          >
                            View the sale ({title})
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          }

          if (item.kind === "conversation_started") {
            const isMessage = Boolean(item.payload._is_message);
            const role = String(item.payload.role ?? "");
            const payloadTitle = String(item.payload.listing_title ?? "").trim();
            const title =
              payloadTitle ||
              listingTitle(item.listingId, titleById, null);
            const senderName = String(item.payload.sender_display_name ?? "Someone").trim();
            const preview = String(item.payload.preview ?? "").trim();
            return (
              <li key={item.key}>
                <div
                  className={`card card-border bg-base-100 shadow-sm ${
                    item.wasUnread ? "border-primary/35" : "border-base-300/80"
                  }`}
                >
                  <div className="card-body gap-1 py-4">
                    <div className="flex items-start gap-2">
                      <MessageCircle
                        className="mt-0.5 h-4 w-4 shrink-0 text-secondary"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm text-base-content">
                            <span className="font-medium">
                              {isMessage ? "New message" : "New chat"}
                            </span>
                            {" — "}
                            {role === "seller" ? (
                              <>
                                The seller started a conversation on{" "}
                                <span className="font-medium">{title}</span>.
                              </>
                            ) : (
                              <>
                                <span className="font-medium">{senderName}</span>{" "}
                                {isMessage ? (
                                  <>
                                    messaged about <span className="font-medium">{title}</span>.
                                  </>
                                ) : (
                                  <>
                                    started a conversation about{" "}
                                    <span className="font-medium">{title}</span>.
                                  </>
                                )}
                              </>
                            )}
                          </p>
                          {item.wasUnread ? (
                            <span className="badge badge-primary badge-xs">New</span>
                          ) : null}
                        </div>
                        {isMessage && preview ? (
                          <p className="mt-1 line-clamp-2 text-xs text-base-content/60">
                            “{preview}”
                          </p>
                        ) : null}
                        <p className="text-xs text-base-content/50 mt-1">
                          <LocalDateTimeText iso={item.createdAt} />
                        </p>
                        <Link
                          href={`/app/listings/${item.listingId}`}
                          className="link link-primary text-xs mt-2 inline-block"
                        >
                          Open thread
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          }

          const titleHint = item.kind === "create_listing" ? item.titleHint : null;
          const title = listingTitle(item.listingId, titleById, titleHint);
          return (
            <li key={item.key}>
              <div className="card card-border bg-base-100 border-base-300/80 shadow-sm">
                <div className="card-body gap-1 py-4">
                  <div className="flex items-start gap-2">
                    <Library className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-base-content">
                        You listed <span className="font-medium">{title}</span>.
                      </p>
                      <p className="text-xs text-base-content/50 mt-1">
                        <LocalDateTimeText iso={item.createdAt} />
                      </p>
                      {item.listingId ? (
                        <Link
                          href={`/app/listings/${item.listingId}`}
                          className="link link-primary text-xs mt-2 inline-block"
                        >
                          Open listing
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
