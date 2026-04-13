"use server";

/**
 * Event logging for recommendations: view/search/save/message.
 * Location: app/app/events/actions.ts
 */
import { createClient } from "@/lib/supabase/server";

export type EventActionResult = { ok: true } | { ok: false; error: string };

export async function logEventAction(args: {
  type: "view_listing" | "search_query" | "save_listing" | "message_sent";
  listingId?: string;
  payload?: Record<string, unknown>;
}): Promise<EventActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return { ok: false, error: "Not signed in." };

  const { type, listingId, payload } = args;
  const { error } = await supabase.from("events").insert({
    user_id: user.id,
    type,
    listing_id: listingId ?? null,
    payload: payload ?? {},
  });

  if (error) {
    console.warn("[logEventAction]", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

