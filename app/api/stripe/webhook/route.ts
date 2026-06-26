import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

/**
 * Stripe webhook: credit purchases (legacy) + Premium subscription lifecycle.
 * Configure endpoint in Stripe Dashboard → https://<your-domain>/api/stripe/webhook
 * Location: app/api/stripe/webhook/route.ts
 *
 * Subscription RPC response: { ok, duplicate?, error? }
 */

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

function userIdFromMetadata(meta: Stripe.Metadata | null | undefined): string {
  return meta?.supabase_user_id?.trim() ?? "";
}

async function applySubscriptionUpdate(
  admin: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  eventId: string,
  userId: string,
  customerId: string,
  subscriptionId: string,
  status: string,
  periodEnd: Date | null,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await admin.rpc("stripe_apply_subscription_update", {
    p_stripe_event_id: eventId,
    p_user_id: userId,
    p_customer_id: customerId,
    p_subscription_id: subscriptionId,
    p_status: status,
    p_period_end: periodEnd ? periodEnd.toISOString() : null,
  });
  if (error) {
    console.error("[stripe/webhook] subscription rpc", error.message);
    return { ok: false, error: error.message };
  }
  const payload = data as { ok?: boolean; error?: string } | null;
  if (payload?.ok === false) {
    return { ok: false, error: payload.error ?? "apply_failed" };
  }
  return { ok: true };
}

function subscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
  const raw = (sub as unknown as { current_period_end?: number }).current_period_end;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return null;
  }
  return new Date(raw * 1000);
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const raw = (invoice as unknown as { subscription?: string | { id?: string } | null }).subscription;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && typeof raw.id === "string") return raw.id;
  return null;
}

async function handleCheckoutCompleted(
  stripe: Stripe,
  admin: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
): Promise<NextResponse> {
  if (session.mode === "subscription") {
    const userId =
      userIdFromMetadata(session.metadata) ||
      session.client_reference_id?.trim() ||
      "";
    if (!isUuid(userId)) {
      console.error("[stripe/webhook] subscription checkout missing user", session.id);
      return NextResponse.json({ error: "Bad metadata" }, { status: 400 });
    }

    const subId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? "";
    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id ?? "";

    if (!subId) {
      console.error("[stripe/webhook] subscription checkout missing sub", session.id);
      return NextResponse.json({ error: "Missing subscription" }, { status: 400 });
    }

    const sub = (await stripe.subscriptions.retrieve(subId)) as Stripe.Subscription;
    const periodEnd = subscriptionPeriodEnd(sub);
    const res = await applySubscriptionUpdate(
      admin,
      event.id,
      userId,
      customerId,
      subId,
      sub.status,
      periodEnd,
    );
    if (!res.ok) {
      return NextResponse.json({ error: res.error ?? "apply_failed" }, { status: 500 });
    }
    return NextResponse.json({ received: true });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const userId = userIdFromMetadata(session.metadata);
  const creditsRaw = session.metadata?.credits?.trim() ?? "";
  const credits = Number.parseInt(creditsRaw, 10);

  if (!isUuid(userId) || !Number.isFinite(credits) || credits <= 0) {
    console.error("[stripe/webhook] Bad credit metadata", session.id, session.metadata);
    return NextResponse.json({ error: "Bad metadata" }, { status: 400 });
  }

  const { data, error } = await admin.rpc("stripe_apply_credit_purchase", {
    p_stripe_event_id: event.id,
    p_user_id: userId,
    p_credits: credits,
  });

  if (error) {
    console.error("[stripe/webhook] credit rpc", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payload = data as { ok?: boolean; duplicate?: boolean; error?: string } | null;
  if (payload && payload.ok === false) {
    console.error("[stripe/webhook] credit apply failed", payload);
    return NextResponse.json({ error: payload.error ?? "apply_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionEvent(
  admin: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  event: Stripe.Event,
  sub: Stripe.Subscription,
): Promise<NextResponse> {
  const userId =
    userIdFromMetadata(sub.metadata) ||
    (typeof sub.customer === "object" && sub.customer && !("deleted" in sub.customer)
      ? ""
      : "");
  let resolvedUserId = userId;

  if (!isUuid(resolvedUserId)) {
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? "";
    if (customerId) {
      const { data: row } = await admin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (row?.id) resolvedUserId = String(row.id);
    }
  }

  if (!isUuid(resolvedUserId)) {
    console.error("[stripe/webhook] subscription event missing user", event.id, sub.id);
    return NextResponse.json({ error: "Unknown user" }, { status: 400 });
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? "";
  const periodEnd = subscriptionPeriodEnd(sub);
  const res = await applySubscriptionUpdate(
    admin,
    event.id,
    resolvedUserId,
    customerId,
    sub.id,
    sub.status,
    periodEnd,
  );
  if (!res.ok) {
    return NextResponse.json({ error: res.error ?? "apply_failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
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

  const admin = createServiceRoleClient();
  if (!admin) {
    console.error("[stripe/webhook] No service role client");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      return handleCheckoutCompleted(stripe, admin, event, session);
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      return handleSubscriptionEvent(admin, event, sub);
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = invoiceSubscriptionId(invoice);
      if (!subId) return NextResponse.json({ received: true });
      const sub = (await stripe.subscriptions.retrieve(subId)) as Stripe.Subscription;
      return handleSubscriptionEvent(admin, event, sub);
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = invoiceSubscriptionId(invoice);
      if (!subId) return NextResponse.json({ received: true });
      const sub = (await stripe.subscriptions.retrieve(subId)) as Stripe.Subscription;
      return handleSubscriptionEvent(admin, event, sub);
    }
    default:
      return NextResponse.json({ received: true });
  }
}

export const runtime = "nodejs";
