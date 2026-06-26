"use client";

/**
 * Premium subscription CTA: Stripe Checkout and optional dev grant.
 * Location: components/subscribe/PremiumSubscribeSection.tsx
 */
import {
  createPremiumCheckoutSession,
  devGrantPremiumAction,
} from "@/app/app/subscribe/actions";
import {
  formatPremiumPrice,
  FREE_SWAPS_PER_MONTH,
  isPremiumStatus,
  type SubscriptionStatus,
} from "@/lib/subscription/constants";
import { CreditCard, Crown, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  subscriptionStatus: SubscriptionStatus;
  periodEnd: string | null;
  freeSwapsRemaining: number;
  stripeCheckoutEnabled: boolean;
  devPremiumEnabled: boolean;
};

export function PremiumSubscribeSection({
  subscriptionStatus,
  periodEnd,
  freeSwapsRemaining,
  stripeCheckoutEnabled,
  devPremiumEnabled,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isPremium = isPremiumStatus(subscriptionStatus);
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
    setMessage(null);
    startTransition(async () => {
      const res = await createPremiumCheckoutSession();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.href = res.url;
    });
  }

  function onDevGrant() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await devGrantPremiumAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage("Premium activated for 30 days (dev).");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="card bg-base-100 border border-primary/25 shadow-md">
        <div className="card-body gap-4">
          <div className="flex items-start gap-3">
            <Crown className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="font-semibold text-lg">ShelfSwap Premium</h2>
              <p className="text-sm text-base-content/70 mt-1">
                {formatPremiumPrice()}/month — unlimited unlocks and chats while subscribed.
              </p>
            </div>
          </div>

          <ul className="text-sm text-base-content/75 space-y-1.5 list-disc pl-5">
            <li>List books for free</li>
            <li>Unlock and chat with sellers without per-book charges</li>
            <li>Unlimited swaps while Premium is active</li>
          </ul>

          {isPremium ? (
            <div role="status" className="alert alert-success text-sm py-2">
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                Premium is active
                {periodLabel ? ` until ${periodLabel}` : ""}.
              </span>
            </div>
          ) : (
            <div className="rounded-lg border border-base-300/70 bg-base-200/40 px-3 py-2 text-sm text-base-content/75">
              Without Premium you get{" "}
              <span className="font-medium text-base-content">{freeSwapsRemaining}</span> of{" "}
              {FREE_SWAPS_PER_MONTH} free swap offers this month. Unlocking listings requires
              Premium.
            </div>
          )}

          {error ? (
            <div role="alert" className="alert alert-error text-sm py-2">
              {error}
            </div>
          ) : null}
          {message ? (
            <div role="status" className="alert alert-info text-sm py-2">
              {message}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {!isPremium && stripeCheckoutEnabled ? (
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
            ) : null}
            {!isPremium && devPremiumEnabled ? (
              <button
                type="button"
                className="btn btn-outline btn-primary border-primary/30"
                disabled={pending}
                onClick={() => onDevGrant()}
              >
                Dev: activate Premium
              </button>
            ) : null}
          </div>

          {!isPremium && !stripeCheckoutEnabled && !devPremiumEnabled ? (
            <p className="text-xs text-base-content/50">
              Subscription checkout is not configured yet. Ask the site owner to set Stripe env
              vars.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
