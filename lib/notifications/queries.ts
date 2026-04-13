import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Unread in-app notifications (bell badge). Safe if notifications table is missing (returns 0).
 * Location: lib/notifications/queries.ts
 */
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

export async function getUnreadMessageNotificationCountForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "new_message")
    .is("read_at", null);

  if (error) {
    const msg = error.message.toLowerCase();
    if (!msg.includes("relation") && !msg.includes("does not exist") && !msg.includes("schema cache")) {
      console.error("[getUnreadMessageNotificationCountForUser]", error.message);
    }
    return 0;
  }
  return count ?? 0;
}
