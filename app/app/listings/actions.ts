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
    revalidatePath("/app/subscribe");
    revalidatePath("/app/activity");
    return { ok: true, creditsSpent: spent };
  }

  const req = typeof p.required === "number" ? p.required : undefined;
  return {
    ok: false,
    error:
      p.error === "premium_required"
        ? "Premium subscription required to unlock listings."
        : p.error === "insufficient_credits"
          ? "Not enough credits. Subscribe to Premium instead."
          : p.error === "own_listing"
          ? "You can’t unlock your own listing."
          : p.error === "listing_not_found"
            ? "This listing is no longer available."
            : p.error ?? "Could not unlock.",
    requiredCredits: req,
  };
}

export type RequestUnlockResult =
  | { ok: true; unlocked?: boolean; pending?: boolean; alreadyUnlocked?: boolean; requestId?: string }
  | { ok: false; error: string; requiredCredits?: number };

type RequestRpcPayload = {
  ok?: boolean;
  error?: string;
  already_unlocked?: boolean;
  unlocked?: boolean;
  pending?: boolean;
  request_id?: string;
  required?: number;
};

/**
 * Premium buyer opens chat on a listing (instant unlock; unlimited buyers per listing).
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
    revalidatePath("/app/subscribe");
    revalidatePath("/app/activity");
    revalidatePath("/app/messages");
    return {
      ok: true,
      unlocked: !!p.unlocked || !!p.already_unlocked,
      pending: !!p.pending,
      alreadyUnlocked: !!p.already_unlocked,
      requestId: p.request_id,
    };
  }
  const req = typeof p.required === "number" ? p.required : undefined;
  return {
    ok: false,
    error:
      p.error === "premium_required"
        ? "Subscribe to Premium to request chats with sellers."
        : p.error === "insufficient_credits"
          ? "Subscribe to Premium to unlock listings."
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
  revalidatePath("/app/subscribe");
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
  if (ok !== true) {
    const err = (data as { error?: string })?.error;
    if (err === "swap_limit_reached") {
      return {
        ok: false,
        error: "No free swaps left this month. Subscribe to Premium for unlimited swaps.",
      };
    }
    return { ok: false, error: err ?? "Could not propose swap." };
  }
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
  revalidatePath("/app/subscribe");
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
  revalidatePath("/app/home");
  revalidatePath("/app/browse");
  revalidatePath("/app/search");
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

type DealOptionRpc = { ok?: boolean; error?: string; completed?: boolean; refunded?: boolean };

function mapDealOptionError(code: string | undefined): string {
  switch (code) {
    case "not_authenticated":
      return "Sign in to continue.";
    case "not_owner":
    case "not_participant":
      return "You are not part of this deal.";
    case "no_active_deal":
      return "This deal is no longer active.";
    case "already_completed":
      return "This deal is already completed.";
    case "seller_has_replied":
      return "The seller has already replied — withdraw is no longer available.";
    case "withdraw_window_expired":
      return "The 48-hour withdraw window has passed.";
    case "seller_has_not_replied":
      return "Wait until you have chatted before re-listing.";
    case "buyer_still_active":
      return "The buyer messaged within the last 14 days.";
    case "seller_still_active":
      return "The seller messaged within the last 14 days.";
    case "use_withdraw_instead":
      return "Use withdraw while the seller has not replied.";
    case "buyer_has_not_messaged":
      return "Send at least one message before closing for seller inactivity.";
    default:
      return code ?? "Could not complete this action.";
  }
}

function revalidateDealPaths(listingId: string) {
  revalidatePath(`/app/listings/${listingId}`);
  revalidatePath("/app/home");
  revalidatePath("/app/browse");
  revalidatePath("/app/search");
  revalidatePath("/app/profile");
  revalidatePath("/app/subscribe");
  revalidatePath("/app/activity");
}

export type DealOptionResult =
  | { ok: true; completed?: boolean; refunded?: boolean }
  | { ok: false; error: string };

export async function withdrawFromDealAction(listingId: string): Promise<DealOptionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return { ok: false, error: "Sign in to continue." };

  const { data, error } = await supabase.rpc("withdraw_from_deal", { p_listing_id: listingId });
  if (error) {
    console.error("[withdrawFromDealAction]", error.message);
    return { ok: false, error: error.message };
  }
  const p = data as DealOptionRpc | null;
  if (!p || p.ok !== true) return { ok: false, error: mapDealOptionError(p?.error) };
  revalidateDealPaths(listingId);
  return { ok: true, refunded: !!p.refunded };
}

export async function requestMutualCancelAction(listingId: string): Promise<DealOptionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return { ok: false, error: "Sign in to continue." };

  const { data, error } = await supabase.rpc("request_mutual_cancel", { p_listing_id: listingId });
  if (error) {
    console.error("[requestMutualCancelAction]", error.message);
    return { ok: false, error: error.message };
  }
  const p = data as DealOptionRpc | null;
  if (!p || p.ok !== true) return { ok: false, error: mapDealOptionError(p?.error) };
  revalidateDealPaths(listingId);
  return { ok: true, completed: !!p.completed, refunded: false };
}

export async function sellerRelistStalledDealAction(listingId: string): Promise<DealOptionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return { ok: false, error: "Sign in to continue." };

  const { data, error } = await supabase.rpc("seller_relist_stalled_deal", { p_listing_id: listingId });
  if (error) {
    console.error("[sellerRelistStalledDealAction]", error.message);
    return { ok: false, error: error.message };
  }
  const p = data as DealOptionRpc | null;
  if (!p || p.ok !== true) return { ok: false, error: mapDealOptionError(p?.error) };
  revalidateDealPaths(listingId);
  return { ok: true, refunded: !!p.refunded };
}

export async function buyerCloseStalledDealAction(listingId: string): Promise<DealOptionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return { ok: false, error: "Sign in to continue." };

  const { data, error } = await supabase.rpc("buyer_close_stalled_deal", { p_listing_id: listingId });
  if (error) {
    console.error("[buyerCloseStalledDealAction]", error.message);
    return { ok: false, error: error.message };
  }
  const p = data as DealOptionRpc | null;
  if (!p || p.ok !== true) return { ok: false, error: mapDealOptionError(p?.error) };
  revalidateDealPaths(listingId);
  return { ok: true, refunded: !!p.refunded };
}
