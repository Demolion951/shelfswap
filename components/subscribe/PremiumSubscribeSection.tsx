"use client";

/**
 * Plan page: Free vs Premium tab toggle with benefits and subscribe CTA.
 * Location: components/subscribe/PremiumSubscribeSection.tsx
 */
import {
  createBillingPortalSession,
  createPremiumCheckoutSession,
} from "@/app/app/subscribe/actions";
import {
  formatPremiumPrice,
  FREE_PLAN_BENEFITS,
  FREE_SWAPS_PER_MONTH,
  isPremiumStatus,
  PREMIUM_PLAN_BENEFITS,
  type SubscriptionStatus,
} from "@/lib/subscription/constants";
import { CreditCard, Crown, Loader2, Settings2, Sparkles, Star } from "lucide-react";
import { useState, useTransition } from "react";

type PlanTab = "free" | "premium";

type Props = {
  subscriptionStatus: SubscriptionStatus;
  periodEnd: string | null;
  freeSwapsRemaining: number;
  stripeCheckoutEnabled: boolean;
  hasStripeCustomer: boolean;
};

export function PremiumSubscribeSection({
  subscriptionStatus,
  periodEnd,
  freeSwapsRemaining,
  stripeCheckoutEnabled,
  hasStripeCustomer,
}: Props) {
  const isPremium = isPremiumStatus(subscriptionStatus);
  const [tab, setTab] = useState<PlanTab>(() => (isPremium ? "premium" : "free"));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const periodLabel =
    periodEnd && isPremium
      ? new Date(periodEnd).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;

  function onCheckout() {
    setError(null);
    startTransition(async () => {
      const res = await createPremiumCheckoutSession();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.href = res.url;
    });
  }

  function onManageBilling() {
    setError(null);
    startTransition(async () => {
      const res = await createBillingPortalSession();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.href = res.url;
    });
  }

  return (
    <div className="space-y-4">
      <div
        className="join grid w-full grid-cols-2"
        role="tablist"
        aria-label="Plan type"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "free"}
          className={`btn btn-sm join-item w-full font-medium ${
            tab === "free" ? "btn-primary" : "btn-ghost border border-base-300/80"
          }`}
          onClick={() => setTab("free")}
        >
          Free
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "premium"}
          className={`btn btn-sm join-item w-full gap-1.5 font-medium ${
            tab === "premium" ? "btn-primary" : "btn-ghost border border-base-300/80"
          }`}
          onClick={() => setTab("premium")}
        >
          <Crown className="h-4 w-4 shrink-0" aria-hidden />
          Premium
        </button>
      </div>

      <div role="tabpanel">
        {tab === "free" ? (
          <div className="card bg-base-100 border border-base-300/80 shadow-sm">
            <div className="card-body gap-4">
              <div>
                <h2 className="shelfswap-heading text-lg font-semibold">Free</h2>
                <p className="text-sm text-base-content/65 mt-1">
                  Everything you need to list and swap a little each month.
                </p>
              </div>

              <ul className="space-y-2 text-sm text-base-content/80 list-disc pl-5">
                {FREE_PLAN_BENEFITS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              {!isPremium ? (
                <p className="text-sm text-base-content/65 rounded-lg border border-base-300/70 bg-base-200/40 px-3 py-2">
                  You have{" "}
                  <span className="font-medium text-base-content">{freeSwapsRemaining}</span> of{" "}
                  {FREE_SWAPS_PER_MONTH} free swap offers left this month. Unlocking listings
                  requires Premium.
                </p>
              ) : (
                <div role="status" className="alert alert-success text-sm py-2">
                  <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                  <span>You&apos;re on Premium{periodLabel ? ` until ${periodLabel}` : ""}.</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card bg-base-100 border border-primary/25 shadow-md">
            <div className="card-body gap-4">
              <div className="flex items-start gap-3">
                <Crown className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
                <div>
                  <h2 className="shelfswap-heading text-lg font-semibold">Premium</h2>
                  <p className="text-sm text-base-content/70 mt-1">
                    {formatPremiumPrice()}/month
                  </p>
                </div>
              </div>

              <ul className="space-y-2.5">
                {PREMIUM_PLAN_BENEFITS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-base-content/80">
                    <Star
                      className="mt-0.5 h-4 w-4 shrink-0 fill-primary text-primary"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {isPremium ? (
                <>
                  <div role="status" className="alert alert-success text-sm py-2">
                    <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      Premium is active
                      {periodLabel ? ` until ${periodLabel}` : ""}.
                    </span>
                  </div>
                  {hasStripeCustomer ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-primary border-primary/30 gap-2"
                      disabled={pending}
                      onClick={() => onManageBilling()}
                    >
                      {pending ? (
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                      ) : (
                        <Settings2 className="h-5 w-5" aria-hidden />
                      )}
                      Manage subscription
                    </button>
                  ) : (
                    <p className="text-xs text-base-content/55">
                      Premium was activated outside Stripe checkout. Contact support to cancel.
                    </p>
                  )}
                </>
              ) : null}

              {error ? (
                <div role="alert" className="alert alert-error text-sm py-2">
                  {error}
                </div>
              ) : null}

              {!isPremium ? (
                <div className="flex flex-wrap gap-2">
                  {stripeCheckoutEnabled ? (
                    <button
                      type="button"
                      className="btn btn-primary gap-2"
                      disabled={pending}
                      onClick={() => onCheckout()}
                    >
                      {pending ? (
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                      ) : (
                        <CreditCard className="h-5 w-5" aria-hidden />
                      )}
                      Subscribe — {formatPremiumPrice()}/mo
                    </button>
                  ) : (
                    <p className="text-xs text-base-content/50">
                      Subscription checkout is not configured yet.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
