"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type UnlockListingResult =
  | { ok: true; alreadyUnlocked?: boolean; creditsSpent?: number }
  | { ok: false; error: string; requiredCredits?: number };

type RpcPayload = {
  ok?: boolean;
  error?: string;
  already_unlocked?: boolean;
  credits_spent?: number;
  required?: number;
};

/**
 * Spend credits to unlock a listing (DB RPC: debit + listing_unlocks row).
 * Location: app/app/listings/actions.ts
 */
export async function unlockListingAction(listingId: string): Promise<UnlockListingResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "Sign in to unlock listings." };
  }

  const { data, error } = await supabase.rpc("unlock_listing", {
    p_listing_id: listingId,
  });

  if (error) {
    console.error("[unlockListingAction]", error.message);
    return { ok: false, error: error.message };
  }

  const p = data as RpcPayload | null;
  if (!p || typeof p !== "object") {
    return { ok: false, error: "Unexpected response." };
  }

  if (p.ok === true) {
    if (p.already_unlocked) {
      return { ok: true, alreadyUnlocked: true };
    }
    const spent =
      typeof p.credits_spent === "number" && Number.isFinite(p.credits_spent)
        ? p.credits_spent
        : 1;
    const { error: evErr } = await supabase.from("events").insert({
      user_id: user.id,
      type: "unlock_listing",
      listing_id: listingId,
      payload: { credits_spent: spent },
    });
    if (evErr) {
      console.warn("[unlockListingAction] events insert", evErr.message);
    }
    revalidatePath(`/app/listings/${listingId}`);
    revalidatePath("/app/profile");
    revalidatePath("/app/credits");
    revalidatePath("/app/activity");
    return { ok: true, creditsSpent: spent };
  }

  const req = typeof p.required === "number" ? p.required : undefined;
  return {
    ok: false,
    error:
      p.error === "insufficient_credits"
        ? "Not enough credits. Buy more from your wallet."
        : p.error === "own_listing"
          ? "You can’t unlock your own listing."
          : p.error === "listing_not_found"
            ? "This listing is no longer available."
            : p.error ?? "Could not unlock.",
    requiredCredits: req,
  };
}
