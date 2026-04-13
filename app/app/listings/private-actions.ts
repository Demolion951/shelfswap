"use server";

/**
 * Server actions: listing messages (seller + unlocked buyers).
 * Location: app/app/listings/private-actions.ts
 */
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logEventAction } from "@/app/app/events/actions";

export type SimpleActionResult = { ok: true } | { ok: false; error: string };

/**
 * Inserts one message. RLS ensures sender is seller or unlocked buyer.
 * Response: row is not returned to client; listing page revalidates.
 */
export async function sendListingMessageAction(
  formData: FormData,
): Promise<SimpleActionResult> {
  const listingId = String(formData.get("listing_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!listingId) {
    return { ok: false, error: "Missing listing." };
  }
  if (!body) {
    return { ok: false, error: "Message cannot be empty." };
  }
  if (body.length > 2000) {
    return { ok: false, error: "Message is too long (max 2000 characters)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "Sign in to send a message." };
  }

  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) {
    console.error("[sendListingMessageAction] profile", profErr.message);
  }

  const displayName = prof?.display_name?.trim() || "Member";

  const { error: insErr } = await supabase.from("listing_messages").insert({
    listing_id: listingId,
    sender_id: user.id,
    sender_display_name: displayName,
    body,
  });

  if (insErr) {
    console.error("[sendListingMessageAction] insert", insErr.message);
    return {
      ok: false,
      error:
        insErr.message.includes("row-level security") || insErr.code === "42501"
          ? "You can’t message on this listing (unlock it first, or list it yourself)."
          : insErr.message,
    };
  }

  await logEventAction({
    type: "message_sent",
    listingId,
    payload: { length: body.length },
  });

  revalidatePath(`/app/listings/${listingId}`);
  return { ok: true };
}
