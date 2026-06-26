"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { appBaseUrl } from "@/lib/stripe/appUrl";
import { stripePremiumPriceId } from "@/lib/stripe/premiumPrice";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CheckoutSessionResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export type BillingPortalResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Stripe Checkout for Premium monthly subscription.
 * Location: app/app/subscribe/actions.ts
 */
export async function createPremiumCheckoutSession(): Promise<CheckoutSessionResult> {
  const priceId = stripePremiumPriceId();
  if (!priceId) {
    return {
      ok: false,
      error: "Premium subscription is not configured (STRIPE_PRICE_PREMIUM_MONTHLY).",
    };
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    return {
      ok: false,
      error: "Add STRIPE_WEBHOOK_SECRET so subscription updates can be applied.",
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
    return { ok: false, error: "Sign in to subscribe." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const base = appBaseUrl();
  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/app/subscribe?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/app/subscribe?canceled=1`,
    metadata: { supabase_user_id: user.id },
    client_reference_id: user.id,
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
  };

  const existingCustomer = (profile as { stripe_customer_id?: string | null } | null)
    ?.stripe_customer_id;
  if (existingCustomer?.trim()) {
    sessionParams.customer = existingCustomer.trim();
  } else if (user.email) {
    sessionParams.customer_email = user.email;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    return { ok: false, error: "Could not start checkout." };
  }

  return { ok: true, url: session.url };
}

/**
 * Stripe Customer Portal — cancel subscription, update card, view invoices.
 * Location: app/app/subscribe/actions.ts
 */
export async function createBillingPortalSession(): Promise<BillingPortalResult> {
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
    return { ok: false, error: "Sign in to manage your subscription." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = (profile as { stripe_customer_id?: string | null } | null)
    ?.stripe_customer_id?.trim();
  if (!customerId) {
    return {
      ok: false,
      error:
        "No Stripe billing account on file for this user. Contact support if you need help cancelling.",
    };
  }

  const base = appBaseUrl();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${base}/app/subscribe`,
  });

  if (!session.url) {
    return { ok: false, error: "Could not open billing portal." };
  }

  return { ok: true, url: session.url };
}

export type DevGrantPremiumResult = { ok: true } | { ok: false; error: string };

/**
 * Dev / sandbox: grants Premium when ALLOW_DEV_PREMIUM=1 + service role.
 */
export async function devGrantPremiumAction(): Promise<DevGrantPremiumResult> {
  if (process.env.ALLOW_DEV_PREMIUM !== "1") {
    return { ok: false, error: "Dev Premium grants are off (set ALLOW_DEV_PREMIUM=1)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "Sign in first." };
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return { ok: false, error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." };
  }

  const { data, error } = await admin.rpc("dev_grant_premium", { p_user_id: user.id });
  if (error) {
    console.error("[devGrantPremiumAction]", error.message);
    return { ok: false, error: error.message };
  }

  const payload = data as { ok?: boolean; error?: string } | null;
  if (payload?.ok !== true) {
    return { ok: false, error: payload?.error ?? "Could not grant Premium." };
  }

  revalidatePath("/app/subscribe");
  revalidatePath("/app/profile");
  return { ok: true };
}
