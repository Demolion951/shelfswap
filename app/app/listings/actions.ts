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
 * Unlock flow: request hold / respond accept (RPC). Credits debit when seller sends first message (DB trigger).
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

export type RequestUnlockResult =
  | { ok: true; pending?: boolean; alreadyUnlocked?: boolean; requestId?: string }
  | { ok: false; error: string; requiredCredits?: number };

type RequestRpcPayload = {
  ok?: boolean;
  error?: string;
  already_unlocked?: boolean;
  pending?: boolean;
  request_id?: string;
  required?: number;
};

/**
 * Buyer requests unlock; credits are held until seller accepts.
 * Location: app/app/listings/actions.ts
 */
export async function requestUnlockHoldAction(listingId: string): Promise<RequestUnlockResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "Sign in to request chats." };
  }

  const { data, error } = await supabase.rpc("request_unlock_hold", {
    p_listing_id: listingId,
  });
  if (error) {
    console.error("[requestUnlockHoldAction]", error.message);
    return { ok: false, error: error.message };
  }
  const p = data as RequestRpcPayload | null;
  if (!p || typeof p !== "object") return { ok: false, error: "Unexpected response." };
  if (p.ok === true) {
    revalidatePath(`/app/listings/${listingId}`);
    revalidatePath("/app/profile");
    revalidatePath("/app/credits");
    revalidatePath("/app/activity");
    return { ok: true, pending: !!p.pending, alreadyUnlocked: !!p.already_unlocked, requestId: p.request_id };
  }
  const req = typeof p.required === "number" ? p.required : undefined;
  return {
    ok: false,
    error:
      p.error === "insufficient_credits"
        ? "Not enough available credits. Buy more from your wallet."
        : p.error === "own_listing"
          ? "You can’t request your own listing."
          : p.error === "listing_not_found"
            ? "This listing is no longer available."
            : p.error ?? "Could not request unlock.",
    requiredCredits: req,
  };
}

export type CancelUnlockResult = { ok: true } | { ok: false; error: string };

/**
 * Buyer cancels pending unlock request (releases held credits).
 * Location: app/app/listings/actions.ts
 */
export async function cancelUnlockHoldAction(listingId: string): Promise<CancelUnlockResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "Sign in to cancel requests." };
  }
  const { error } = await supabase.rpc("cancel_unlock_hold", { p_listing_id: listingId });
  if (error) {
    console.error("[cancelUnlockHoldAction]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(`/app/listings/${listingId}`);
  revalidatePath("/app/profile");
  revalidatePath("/app/credits");
  revalidatePath("/app/activity");
  return { ok: true };
}

export type RespondUnlockResult =
  | { ok: true; accepted?: boolean; declined?: boolean; expired?: boolean }
  | { ok: false; error: string };

type RespondRpcPayload = { ok?: boolean; accepted?: boolean; declined?: boolean; expired?: boolean; error?: string };

/**
 * Seller accepts/declines an unlock request.
 * Location: app/app/listings/actions.ts
 */
export async function respondUnlockHoldAction(requestId: string, accept: boolean): Promise<RespondUnlockResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "Sign in to respond." };
  }
  const { data, error } = await supabase.rpc("respond_unlock_hold", {
    p_request_id: requestId,
    p_accept: accept,
  });
  if (error) {
    console.error("[respondUnlockHoldAction]", error.message);
    return { ok: false, error: error.message };
  }
  const p = data as RespondRpcPayload | null;
  if (!p || typeof p !== "object") return { ok: false, error: "Unexpected response." };
  if (p.ok !== true) return { ok: false, error: p.error ?? "Could not respond." };
  revalidatePath("/app/activity");
  return { ok: true, accepted: !!p.accepted, declined: !!p.declined, expired: !!p.expired };
}

export type ProposeSwapResult = { ok: true } | { ok: false; error: string };
export async function proposeSwapAction(listingId: string, offeredListingId: string): Promise<ProposeSwapResult> {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return { ok: false, error: "Sign in to propose swaps." };
  const { data, error } = await supabase.rpc("propose_swap", {
    p_listing_id: listingId,
    p_offered_listing_id: offeredListingId,
  });
  if (error) {
    console.error("[proposeSwapAction]", error.message);
    return { ok: false, error: error.message };
  }
  const ok = (data as any)?.ok;
  if (ok !== true) return { ok: false, error: (data as any)?.error ?? "Could not propose swap." };
  revalidatePath(`/app/listings/${listingId}`);
  revalidatePath("/app/activity");
  return { ok: true };
}

export type RespondSwapResult = { ok: true } | { ok: false; error: string };
export async function respondSwapAction(listingId: string, accept: boolean): Promise<RespondSwapResult> {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return { ok: false, error: "Sign in to respond." };
  const { data, error } = await supabase.rpc("respond_swap", { p_listing_id: listingId, p_accept: accept });
  if (error) {
    console.error("[respondSwapAction]", error.message);
    return { ok: false, error: error.message };
  }
  const ok = (data as any)?.ok;
  if (ok !== true) return { ok: false, error: (data as any)?.error ?? "Could not respond." };
  revalidatePath(`/app/listings/${listingId}`);
  revalidatePath("/app/activity");
  return { ok: true };
}

export type ConfirmDealResult = { ok: true } | { ok: false; error: string };
export async function confirmDealCompleteAction(listingId: string): Promise<ConfirmDealResult> {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return { ok: false, error: "Sign in to confirm." };
  const { data, error } = await supabase.rpc("confirm_deal_complete", { p_listing_id: listingId });
  if (error) {
    console.error("[confirmDealCompleteAction]", error.message);
    return { ok: false, error: error.message };
  }
  const ok = (data as any)?.ok;
  if (ok !== true) return { ok: false, error: (data as any)?.error ?? "Could not confirm." };
  revalidatePath(`/app/listings/${listingId}`);
  revalidatePath("/app/activity");
  return { ok: true };
}

export type UnconfirmDealResult = { ok: true } | { ok: false; error: string };
export async function unconfirmDealCompleteAction(listingId: string): Promise<UnconfirmDealResult> {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return { ok: false, error: "Sign in to update." };
  const { data, error } = await supabase.rpc("unconfirm_deal_complete", { p_listing_id: listingId });
  if (error) {
    console.error("[unconfirmDealCompleteAction]", error.message);
    return { ok: false, error: error.message };
  }
  const ok = (data as any)?.ok;
  if (ok !== true) return { ok: false, error: (data as any)?.error ?? "Could not update." };
  revalidatePath(`/app/listings/${listingId}`);
  revalidatePath("/app/activity");
  return { ok: true };
}
