import { createClient } from "@/lib/supabase/server";
import { Bell, Library, Lock, MessageCircle, Sparkles } from "lucide-react";
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
 * Activity feed: notifications (e.g. new conversation), listing events, and unlocks.
 * Opening this page marks in-app notifications as read (bell badge clears on next load).
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
    if (n.type !== "conversation_started" || !n.listing_id) continue;
    const payload = (n.payload ?? {}) as Record<string, unknown>;
    items.push({
      key: `notif-${n.id}`,
      createdAt: n.created_at,
      kind: "conversation_started",
      listingId: n.listing_id,
      payload,
      wasUnread: n.read_at == null,
    });
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

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
          const when = new Date(item.createdAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

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
                        <p className="text-xs text-base-content/50 mt-1">{when}</p>
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
                        <p className="text-xs text-base-content/50 mt-1">{when}</p>
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

          if (item.kind === "conversation_started") {
            const role = String(item.payload.role ?? "");
            const payloadTitle = String(item.payload.listing_title ?? "").trim();
            const title =
              payloadTitle ||
              listingTitle(item.listingId, titleById, null);
            const senderName = String(item.payload.sender_display_name ?? "Someone").trim();
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
                            <span className="font-medium">New chat</span>
                            {" — "}
                            {role === "seller" ? (
                              <>
                                The seller started a conversation on{" "}
                                <span className="font-medium">{title}</span>.
                              </>
                            ) : (
                              <>
                                <span className="font-medium">{senderName}</span> started a
                                conversation about <span className="font-medium">{title}</span>.
                              </>
                            )}
                          </p>
                          {item.wasUnread ? (
                            <span className="badge badge-primary badge-xs">New</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-base-content/50 mt-1">{when}</p>
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

          const title = listingTitle(item.listingId, titleById, item.titleHint);
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
                      <p className="text-xs text-base-content/50 mt-1">{when}</p>
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
