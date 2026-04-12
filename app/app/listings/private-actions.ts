"use server";

/**
 * Server actions: pickup upsert (owner) and listing messages (seller + unlocked buyers).
 * Location: app/app/listings/private-actions.ts
 */
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SimpleActionResult = { ok: true } | { ok: false; error: string };

export async function upsertListingPickupAction(
  formData: FormData,
): Promise<SimpleActionResult> {
  const listingId = String(formData.get("listing_id") ?? "").trim();
  const pickupInstructions = String(formData.get("pickup_instructions") ?? "").trim();
  const contactHintRaw = String(formData.get("contact_hint") ?? "").trim();
  const contactHint = contactHintRaw.length > 0 ? contactHintRaw : null;

  if (!listingId) {
    return { ok: false, error: "Missing listing." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "Sign in to edit pickup details." };
  }

  const { data: listing, error: listErr } = await supabase
    .from("listings")
    .select("id, user_id")
    .eq("id", listingId)
    .maybeSingle();

  if (listErr || !listing || listing.user_id !== user.id) {
    return { ok: false, error: "You can only edit your own listings." };
  }

  const { data: existing } = await supabase
    .from("listing_pickup")
    .select("listing_id")
    .eq("listing_id", listingId)
    .maybeSingle();

  const now = new Date().toISOString();
  if (existing) {
    const { error: upErr } = await supabase
      .from("listing_pickup")
      .update({
        pickup_instructions: pickupInstructions,
        contact_hint: contactHint,
        updated_at: now,
      })
      .eq("listing_id", listingId);
    if (upErr) {
      console.error("[upsertListingPickupAction] update", upErr.message);
      return { ok: false, error: upErr.message };
    }
  } else {
    const { error: insErr } = await supabase.from("listing_pickup").insert({
      listing_id: listingId,
      pickup_instructions: pickupInstructions,
      contact_hint: contactHint,
      updated_at: now,
    });
    if (insErr) {
      console.error("[upsertListingPickupAction] insert", insErr.message);
      return { ok: false, error: insErr.message };
    }
  }

  revalidatePath(`/app/listings/${listingId}`);
  return { ok: true };
}

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

  revalidatePath(`/app/listings/${listingId}`);
  return { ok: true };
}
