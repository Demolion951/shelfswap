"use server";

/**
 * Server actions: listing messages (seller + unlocked buyers).
 * Location: app/app/listings/private-actions.ts
 */
import { createClient } from "@/lib/supabase/server";
import { postListingMessageRpc } from "@/lib/listings/postListingMessageRpc";
import { revalidatePath } from "next/cache";
import { logEventAction } from "@/app/app/events/actions";

export type SimpleActionResult = { ok: true } | { ok: false; error: string };

/**
 * Posts one message via `post_listing_message` RPC (seller, unlocked buyer, or pending unlock).
 * Falls back to direct insert if the RPC is not deployed yet.
 */
export async function sendListingMessageAction(
  formData: FormData,
): Promise<SimpleActionResult> {
  const listingId = String(formData.get("listing_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const threadRaw = formData.get("thread_buyer_id");
  const threadBuyerId =
    threadRaw != null && String(threadRaw).trim().length > 0 ? String(threadRaw).trim() : null;

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

  const { data: rpcData, error: rpcErr } = await postListingMessageRpc(supabase, {
    listingId,
    body,
    threadBuyerId,
  });

  if (rpcErr) {
    const em = rpcErr.message.toLowerCase();
    const missingFn =
      rpcErr.code === "42883" ||
      (em.includes("post_listing_message") &&
        (em.includes("does not exist") || em.includes("could not find")));
    if (!missingFn) {
      console.error("[sendListingMessageAction] rpc", rpcErr.message);
      return { ok: false, error: rpcErr.message };
    }
    const displayName = prof?.display_name?.trim() || "Member";
    const { error: insErr } = await supabase.from("listing_messages").insert({
      listing_id: listingId,
      sender_id: user.id,
      sender_display_name: displayName,
      body,
    });
    if (insErr) {
      console.error("[sendListingMessageAction] insert fallback", insErr.message);
      return {
        ok: false,
        error:
          insErr.message.includes("row-level security") || insErr.code === "42501"
            ? "You can’t message on this listing (unlock it first, or list it yourself)."
            : insErr.message,
      };
    }
  } else {
    const payload = rpcData as { ok?: boolean; error?: string } | null;
    if (!payload || payload.ok !== true) {
      const code = payload?.error ?? "";
      const friendly =
        code === "not_participant"
          ? "You can't message on this listing (unlock it first, or list it yourself)."
          : code === "no_buyer_yet"
            ? "Messages open when a buyer unlocks your listing."
          : code === "thread_required" || code === "bad_thread"
            ? "Choose which buyer conversation to reply in."
          : code === "too_long"
            ? "Message is too long (max 2000 characters)."
            : code === "empty_body"
              ? "Message cannot be empty."
              : code === "not_authenticated"
                ? "Sign in to send a message."
                : "Could not send message.";
      return { ok: false, error: friendly };
    }
  }

  await logEventAction({
    type: "message_sent",
    listingId,
    payload: { length: body.length },
  });

  revalidatePath(`/app/listings/${listingId}`);
  return { ok: true };
}
