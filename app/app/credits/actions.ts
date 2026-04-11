"use server";

import { getPackById } from "@/lib/credits/packs";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { appBaseUrl } from "@/lib/stripe/appUrl";
import { stripePriceIdForPack } from "@/lib/stripe/prices";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PurchasePackResult =
  | { ok: true; newBalance: number }
  | { ok: false; error: string };

export type CheckoutSessionResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Stripe Checkout for a credit pack (metadata carries user + credits; webhook grants balance).
 */
export async function createStripeCheckoutSession(
  packId: string,
): Promise<CheckoutSessionResult> {
  const pack = getPackById(packId);
  if (!pack) {
    return { ok: false, error: "Unknown pack." };
  }

  const priceId = stripePriceIdForPack(packId);
  if (!priceId) {
    return { ok: false, error: "This pack does not have a Stripe price configured." };
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    return {
      ok: false,
      error:
        "Add STRIPE_WEBHOOK_SECRET (from Stripe Dashboard webhook) so paid credits can be applied.",
    };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, error: "STRIPE_SECRET_KEY is not set." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "Sign in to buy credits." };
  }

  const base = appBaseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/app/credits?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/app/credits?canceled=1`,
    metadata: {
      supabase_user_id: user.id,
      pack_id: packId,
      credits: String(pack.credits),
    },
    client_reference_id: user.id,
  });

  if (!session.url) {
    return { ok: false, error: "Could not start checkout." };
  }

  return { ok: true, url: session.url };
}

/**
 * Dev / sandbox: grants credits when SUPABASE_SERVICE_ROLE_KEY + ALLOW_DEV_CREDIT_PURCHASE=1.
 */
export async function purchaseCreditPack(packId: string): Promise<PurchasePackResult> {
  const pack = getPackById(packId);
  if (!pack) {
    return { ok: false, error: "Unknown pack." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "Sign in to buy credits." };
  }

  const devOk = process.env.ALLOW_DEV_CREDIT_PURCHASE === "1";
  if (!devOk) {
    return {
      ok: false,
      error:
        "Dev grants are off. Use Pay with card when Stripe env vars are set, or set ALLOW_DEV_CREDIT_PURCHASE=1 plus SUPABASE_SERVICE_ROLE_KEY for local testing.",
    };
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return {
      ok: false,
      error: "Server is missing SUPABASE_SERVICE_ROLE_KEY — cannot grant credits.",
    };
  }

  const { data, error } = await admin.rpc("add_credits_to_user", {
    p_user_id: user.id,
    p_delta: pack.credits,
  });

  if (error) {
    console.error("[purchaseCreditPack] rpc", error.message);
    return { ok: false, error: error.message };
  }

  const newBalance = typeof data === "number" ? data : Number(data);
  if (!Number.isFinite(newBalance)) {
    return { ok: false, error: "Unexpected response from wallet." };
  }

  revalidatePath("/app/credits");
  revalidatePath("/app/profile");
  return { ok: true, newBalance };
}
