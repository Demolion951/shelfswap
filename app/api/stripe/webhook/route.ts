import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

/**
 * Stripe webhook: idempotent credit grants after Checkout (service_role RPC).
 * Configure endpoint in Stripe Dashboard → https://<your-domain>/api/stripe/webhook
 * Location: app/api/stripe/webhook/route.ts
 *
 * Response structure from stripe_apply_credit_purchase (JSON in DB): { ok, duplicate?, new_balance?, error? }
 */

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !whSecret) {
    console.error("[stripe/webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whSecret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verify failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const userId = session.metadata?.supabase_user_id?.trim() ?? "";
  const creditsRaw = session.metadata?.credits?.trim() ?? "";
  const credits = Number.parseInt(creditsRaw, 10);

  if (!isUuid(userId) || !Number.isFinite(credits) || credits <= 0) {
    console.error("[stripe/webhook] Bad metadata", session.id, session.metadata);
    return NextResponse.json({ error: "Bad metadata" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    console.error("[stripe/webhook] No service role client");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data, error } = await admin.rpc("stripe_apply_credit_purchase", {
    p_stripe_event_id: event.id,
    p_user_id: userId,
    p_credits: credits,
  });

  if (error) {
    console.error("[stripe/webhook] rpc", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payload = data as { ok?: boolean; duplicate?: boolean; error?: string } | null;
  if (payload && payload.ok === false) {
    console.error("[stripe/webhook] apply failed", payload);
    return NextResponse.json({ error: payload.error ?? "apply_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

export const runtime = "nodejs";
