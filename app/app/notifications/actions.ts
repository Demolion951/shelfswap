"use server";

/**
 * Marks all in-app notifications read for the signed-in user (bell badge clears).
 * Called when the user opens Activity from the header.
 * Location: app/app/notifications/actions.ts
 */
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type MarkNotificationsReadResult = { ok: true } | { ok: false; error: string };

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

  revalidatePath("/app");
  revalidatePath("/app/activity");
  return { ok: true };
}
