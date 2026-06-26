import { GuestAccountPrompt } from "@/components/auth/GuestAccountPrompt";
import { PremiumSubscribeSection } from "@/components/subscribe/PremiumSubscribeSection";
import { getOptionalUser } from "@/lib/auth/requireUser";
import { isPremiumStatus, type SubscriptionStatus } from "@/lib/subscription/constants";
import { stripePremiumPriceId } from "@/lib/stripe/premiumPrice";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { Crown } from "lucide-react";
import Link from "next/link";

/**
 * Premium subscription page (£7.99/mo): unlock listings and unlimited swaps.
 * Location: app/app/subscribe/page.tsx
 */
function stripeCheckoutEnabled(): boolean {
  if (!getStripe()) return false;
  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) return false;
  return Boolean(stripePremiumPriceId());
}

type PageProps = {
  searchParams: Promise<{ session_id?: string; canceled?: string }>;
};

export default async function SubscribePage({ searchParams }: PageProps) {
  const user = await getOptionalUser();
  if (!user) {
    return (
      <GuestAccountPrompt
        title="Premium"
        description="Sign in to subscribe and unlock listings across ShelfSwap."
        Icon={Crown}
        returnTo="/app/subscribe"
      />
    );
  }

  const sp = await searchParams;
  const supabase = await createClient();

  const [profileRes, swapsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("subscription_status, subscription_period_end")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("free_swaps_remaining", { p_user_id: user.id }),
  ]);

  const profile = profileRes.data as {
    subscription_status?: string | null;
    subscription_period_end?: string | null;
  } | null;

  const status = (profile?.subscription_status ?? "none") as SubscriptionStatus;
  const periodEnd = profile?.subscription_period_end ?? null;
  const freeSwapsRemaining =
    typeof swapsRes.data === "number" && Number.isFinite(swapsRes.data) ? swapsRes.data : 0;

  const devPremiumEnabled = process.env.ALLOW_DEV_PREMIUM === "1";

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="shelfswap-heading text-2xl font-semibold text-primary">Premium</h1>
        <p className="text-sm text-base-content/65 mt-1">
          Listing is free. Unlocking and chatting requires an active subscription.
        </p>
      </div>

      {sp.session_id ? (
        <div role="status" className="alert alert-success text-sm">
          Payment received. If Premium doesn&apos;t show yet, refresh in a few seconds — the webhook
          may still be processing.
        </div>
      ) : null}

      {sp.canceled === "1" ? (
        <div role="status" className="alert alert-warning text-sm">
          Checkout was canceled. No charge was made.
        </div>
      ) : null}

      <PremiumSubscribeSection
        subscriptionStatus={status}
        periodEnd={periodEnd}
        freeSwapsRemaining={freeSwapsRemaining}
        stripeCheckoutEnabled={stripeCheckoutEnabled()}
        devPremiumEnabled={devPremiumEnabled}
      />

      {isPremiumStatus(status) ? (
        <p className="text-center text-xs text-base-content/50">
          Manage billing in your Stripe customer portal (coming soon) or contact support to cancel.
        </p>
      ) : null}

      <p className="text-center text-xs text-base-content/50">
        <Link href="/faq#cancellations" className="link link-primary">
          Subscription &amp; cancellation FAQ
        </Link>
        {" · "}
        <Link href="/app/profile" className="link link-primary">
          Back to profile
        </Link>
      </p>
    </div>
  );
}
