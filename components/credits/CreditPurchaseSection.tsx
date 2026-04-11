"use client";

/**
 * Wallet balance + credit packs: Stripe Checkout and/or dev instant grant.
 * Location: components/credits/CreditPurchaseSection.tsx
 */
import {
  createStripeCheckoutSession,
  purchaseCreditPack,
} from "@/app/app/credits/actions";
import { CREDIT_PACKS } from "@/lib/credits/packs";
import { Coins, CreditCard, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  initialBalance: number;
  devPurchasesEnabled: boolean;
  /** Pack ids that have a Stripe price env + secret + webhook configured */
  stripeCheckoutPackIds: string[];
};

export function CreditPurchaseSection({
  initialBalance,
  devPurchasesEnabled,
  stripeCheckoutPackIds,
}: Props) {
  const router = useRouter();
  const [balance, setBalance] = useState(initialBalance);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasStripe = stripeCheckoutPackIds.length > 0;

  function onDevAdd(packId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await purchaseCreditPack(packId);
      if (res.ok) {
        setBalance(res.newBalance);
        setMessage(`Added credits — new balance ${res.newBalance}.`);
        router.refresh();
        return;
      }
      setError(res.error);
    });
  }

  function onStripePay(packId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await createStripeCheckoutSession(packId);
      if (res.ok) {
        window.location.href = res.url;
        return;
      }
      setError(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 border border-base-300/80 shadow-sm">
        <div className="card-body gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Coins className="h-6 w-6 shrink-0" aria-hidden />
            <span className="text-sm font-semibold uppercase tracking-wide">Your balance</span>
          </div>
          <p className="text-4xl font-bold tabular-nums">{balance}</p>
          <p className="text-sm text-base-content/60">credits available to unlock listings</p>
        </div>
      </div>

      {devPurchasesEnabled ? (
        <div role="status" className="alert alert-warning text-sm">
          <span>
            <strong>Dev mode:</strong> “Add (dev)” grants credits with no card. Do not use in
            production.
          </span>
        </div>
      ) : null}

      {!hasStripe && !devPurchasesEnabled ? (
        <div role="status" className="alert alert-info text-sm">
          <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
          <span>
            Set <code className="mx-0.5 rounded bg-base-200 px-1 text-xs">STRIPE_SECRET_KEY</code>,{" "}
            <code className="rounded bg-base-200 px-1 text-xs">STRIPE_WEBHOOK_SECRET</code>, and{" "}
            <code className="rounded bg-base-200 px-1 text-xs">STRIPE_PRICE_STARTER</code> /{" "}
            <code className="rounded bg-base-200 px-1 text-xs">READER</code> /{" "}
            <code className="rounded bg-base-200 px-1 text-xs">SHELF</code> for card checkout, or
            enable dev grants locally.
          </span>
        </div>
      ) : null}

      {message ? (
        <div role="status" className="alert alert-success text-sm">
          {message}
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="alert alert-error text-sm">
          {error}
        </div>
      ) : null}

      <div>
        <h2 className="shelfswap-heading text-lg font-semibold text-base-content">Buy credits</h2>
        <p className="mt-1 text-sm text-base-content/60">
          Pay with card when Stripe is configured, or use dev add for testing.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {CREDIT_PACKS.map((pack) => {
            const stripeOk = stripeCheckoutPackIds.includes(pack.id);
            return (
              <li key={pack.id}>
                <div className="card border border-base-300/80 bg-base-100 shadow-sm">
                  <div className="card-body flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="shelfswap-heading font-semibold text-base-content">
                        {pack.label}
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-primary">
                        {pack.credits} credits
                      </p>
                      <p className="text-xs text-base-content/55">{pack.helper}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                      {stripeOk ? (
                        <button
                          type="button"
                          className="btn btn-primary gap-1"
                          disabled={pending}
                          onClick={() => onStripePay(pack.id)}
                        >
                          {pending ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <CreditCard className="h-4 w-4" aria-hidden />
                          )}
                          Pay with card
                        </button>
                      ) : null}
                      {devPurchasesEnabled ? (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm border-primary/30 gap-1"
                          disabled={pending}
                          onClick={() => onDevAdd(pack.id)}
                        >
                          <Sparkles className="h-4 w-4" aria-hidden />
                          Add (dev)
                        </button>
                      ) : null}
                      {!stripeOk && !devPurchasesEnabled ? (
                        <button type="button" className="btn btn-disabled btn-sm" disabled>
                          Not configured
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
