"use client";

/**
 * Plan page: everything free during launch; Premium perks marked coming soon.
 * Location: components/subscribe/PremiumSubscribeSection.tsx
 */
import {
  createBillingPortalSession,
} from "@/app/app/subscribe/actions";
import {
  COMING_SOON_PREMIUM_BENEFITS,
  isPremiumStatus,
  STANDARD_PLAN_BENEFITS,
  type SubscriptionStatus,
} from "@/lib/subscription/constants";
import { Crown, Loader2, Settings2, Star } from "lucide-react";
import { useState, useTransition } from "react";

type Props = {
  subscriptionStatus: SubscriptionStatus;
  periodEnd: string | null;
  hasStripeCustomer: boolean;
};

export function PremiumSubscribeSection({
  subscriptionStatus,
  periodEnd: _periodEnd,
  hasStripeCustomer,
}: Props) {
  const isLegacyPremium = isPremiumStatus(subscriptionStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
      <div className="card bg-base-100 border border-primary/25 shadow-md">
        <div className="card-body gap-4">
          <div>
            <h2 className="shelfswap-heading text-lg font-semibold text-primary">
              Everything free while we grow
            </h2>
            <p className="text-sm text-base-content/70 mt-1">
              ShelfSwap is fully open during launch — list, message, buy, and swap without limits.
            </p>
          </div>

          <ul className="space-y-2 text-sm text-base-content/80 list-disc pl-5">
            {STANDARD_PLAN_BENEFITS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300/80 shadow-sm">
        <div className="card-body gap-4">
          <div className="flex items-start gap-3">
            <Crown className="mt-0.5 h-6 w-6 shrink-0 text-base-content/40" aria-hidden />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="shelfswap-heading text-lg font-semibold">Premium</h2>
                <span className="badge badge-ghost badge-sm border-base-300/80">Coming soon</span>
              </div>
              <p className="text-sm text-base-content/65 mt-1">
                Optional extras later — the core app stays free to use.
              </p>
            </div>
          </div>

          <ul className="space-y-2.5">
            {COMING_SOON_PREMIUM_BENEFITS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-base-content/70">
                <Star className="mt-0.5 h-4 w-4 shrink-0 text-base-content/35" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {isLegacyPremium && hasStripeCustomer ? (
        <div className="card bg-base-100 border border-base-300/80 shadow-sm">
          <div className="card-body gap-3">
            <button
              type="button"
              className="btn btn-outline btn-sm gap-2 self-start"
              disabled={pending}
              onClick={() => onManageBilling()}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Settings2 className="h-4 w-4" aria-hidden />
              )}
              Manage billing
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="alert alert-error text-sm py-2">
          {error}
        </div>
      ) : null}
    </div>
  );
}
