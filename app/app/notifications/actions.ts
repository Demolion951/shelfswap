"use server";

/**
 * Notification read actions — keep bell + Messages tab badges in sync.
 * Location: app/app/notifications/actions.ts
 */
import {
  getBadgeCountsForUser,
  type BadgeCounts,
} from "@/lib/notifications/queries";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type MarkNotificationsReadResult =
  | { ok: true; counts: BadgeCounts }
  | { ok: false; error: string };

function revalidateBadgePaths() {
  revalidatePath("/app", "layout");
  revalidatePath("/app/activity");
  revalidatePath("/app/messages");
}

async function badgeCountsForUser(userId: string): Promise<BadgeCounts> {
  const supabase = await createClient();
  return getBadgeCountsForUser(supabase, userId);
}

export async function markAllNotificationsReadAction(): Promise<MarkNotificationsReadResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "Sign in required." };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    const m = error.message.toLowerCase();
    if (!m.includes("relation") && !m.includes("does not exist") && !m.includes("schema cache")) {
      console.error("[markAllNotificationsReadAction]", error.message);
      return { ok: false, error: error.message };
    }
  }

  revalidateBadgePaths();
  return { ok: true, counts: { unreadNotifications: 0, unreadMessages: 0 } };
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<MarkNotificationsReadResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "Sign in required." };
  }

  const id = notificationId.trim();
  if (!id) {
    return { ok: false, error: "Invalid notification." };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    const m = error.message.toLowerCase();
    if (!m.includes("relation") && !m.includes("does not exist") && !m.includes("schema cache")) {
      console.error("[markNotificationReadAction]", error.message);
      return { ok: false, error: error.message };
    }
  }

  revalidateBadgePaths();
  const counts = await badgeCountsForUser(user.id);
  return { ok: true, counts };
}

/** Clears unread message alerts for one listing thread (Messages tab + bell). */
export async function markListingMessageNotificationsReadAction(
  listingId: string,
): Promise<MarkNotificationsReadResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "Sign in required." };
  }

  const lid = listingId.trim();
  if (!lid) {
    return { ok: false, error: "Invalid listing." };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("listing_id", lid)
    .in("type", ["new_message", "conversation_started"])
    .is("read_at", null);

  if (error) {
    const m = error.message.toLowerCase();
    if (!m.includes("relation") && !m.includes("does not exist") && !m.includes("schema cache")) {
      console.error("[markListingMessageNotificationsReadAction]", error.message);
      return { ok: false, error: error.message };
    }
  }

  revalidateBadgePaths();
  const counts = await badgeCountsForUser(user.id);
  return { ok: true, counts };
}

export async function getBadgeCountsAction(): Promise<BadgeCounts | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return badgeCountsForUser(user.id);
}
