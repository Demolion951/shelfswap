import { PremiumSubscribeSection } from "@/components/subscribe/PremiumSubscribeSection";
import { getOptionalUser } from "@/lib/auth/requireUser";
import { type SubscriptionStatus } from "@/lib/subscription/constants";
import { createClient } from "@/lib/supabase/server";
import { Layers } from "lucide-react";
import Link from "next/link";
import { GuestAccountPrompt } from "@/components/auth/GuestAccountPrompt";

/**
 * Plan page: launch is fully free; Premium perks coming soon.
 * Location: app/app/subscribe/page.tsx
 */

export default async function SubscribePage() {
  const user = await getOptionalUser();
  if (!user) {
    return (
      <GuestAccountPrompt
        title="Plan"
        description="Sign in to see what's included with ShelfSwap during launch."
        Icon={Layers}
        returnTo="/app/subscribe"
      />
    );
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, subscription_period_end, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const status = (profile?.subscription_status ?? "none") as SubscriptionStatus;
  const periodEnd = profile?.subscription_period_end ?? null;
  const hasStripeCustomer = Boolean(profile?.stripe_customer_id?.trim());

  return (
    <div className="space-y-6 pt-2">
      <h1 className="shelfswap-heading text-2xl font-semibold text-primary">Plan</h1>

      <PremiumSubscribeSection
        subscriptionStatus={status}
        periodEnd={periodEnd}
        hasStripeCustomer={hasStripeCustomer}
      />

      <p className="text-center text-xs text-base-content/50">
        <Link href="/faq" className="link link-primary">
          FAQ
        </Link>
        {" · "}
        <Link href="/app/profile" className="link link-primary">
          Back to profile
        </Link>
      </p>
    </div>
  );
}
