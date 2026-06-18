import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Unread in-app notifications (bell badge). Safe if notifications table is missing (returns 0).
 * Location: lib/notifications/queries.ts
 */

export type BadgeCounts = {
  unreadNotifications: number;
  /** Distinct listing threads with unread message alerts. */
  unreadMessages: number;
};

const MESSAGE_NOTIF_TYPES = ["new_message", "conversation_started"] as const;

export async function getUnreadNotificationCountForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    const msg = error.message.toLowerCase();
    if (!msg.includes("relation") && !msg.includes("does not exist") && !msg.includes("schema cache")) {
      console.error("[getUnreadNotificationCountForUser]", error.message);
    }
    return 0;
  }
  return count ?? 0;
}

/** Unread message threads (one per listing), not raw notification rows. */
export async function getUnreadMessageThreadCountForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const ids = await getUnreadMessageListingIdsForUser(supabase, userId);
  return ids.size;
}

export async function getUnreadMessageListingIdsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("notifications")
    .select("listing_id")
    .eq("user_id", userId)
    .in("type", [...MESSAGE_NOTIF_TYPES])
    .is("read_at", null)
    .not("listing_id", "is", null);

  if (error) {
    const msg = error.message.toLowerCase();
    if (!msg.includes("relation") && !msg.includes("does not exist") && !msg.includes("schema cache")) {
      console.error("[getUnreadMessageListingIdsForUser]", error.message);
    }
    return new Set();
  }

  const out = new Set<string>();
  for (const row of data ?? []) {
    const lid = row.listing_id as string | null;
    if (lid) out.add(lid);
  }
  return out;
}

/** @deprecated Use getUnreadMessageThreadCountForUser — kept for compatibility during migration. */
export async function getUnreadMessageNotificationCountForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  return getUnreadMessageThreadCountForUser(supabase, userId);
}

export async function getBadgeCountsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<BadgeCounts> {
  const [unreadNotifications, unreadMessages] = await Promise.all([
    getUnreadNotificationCountForUser(supabase, userId),
    getUnreadMessageThreadCountForUser(supabase, userId),
  ]);
  return { unreadNotifications, unreadMessages };
}

export function isMessageNotificationType(type: string): boolean {
  return (MESSAGE_NOTIF_TYPES as readonly string[]).includes(type);
}
