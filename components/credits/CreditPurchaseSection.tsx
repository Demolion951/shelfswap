"use client";

/**
 * Wallet balance display + credit pack cards; calls server action (dev grant or future Stripe).
 * Location: components/credits/CreditPurchaseSection.tsx
 */
import { purchaseCreditPack } from "@/app/app/credits/actions";
import { CREDIT_PACKS } from "@/lib/credits/packs";
import { Coins, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  initialBalance: number;
  /** True when ALLOW_DEV_CREDIT_PURCHASE=1 and service role can grant credits */
  devPurchasesEnabled: boolean;
};

export function CreditPurchaseSection({
  initialBalance,
  devPurchasesEnabled,
}: Props) {
  const router = useRouter();
  const [balance, setBalance] = useState(initialBalance);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onBuy(packId: string) {
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

      {!devPurchasesEnabled ? (
        <div role="status" className="alert alert-info text-sm">
          <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
          <span>
            Card payments are not live on this deployment yet. After Stripe is connected, you will
            check out here. Developers can enable test purchases with{" "}
            <code className="rounded bg-base-200 px-1 text-xs">ALLOW_DEV_CREDIT_PURCHASE=1</code>{" "}
            and a service role key.
          </span>
        </div>
      ) : (
        <div role="status" className="alert alert-warning text-sm">
          <span>
            <strong>Dev mode:</strong> packs grant credits instantly (no card). Do not enable in
            production.
          </span>
        </div>
      )}

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
          Pick a pack. Prices will appear when checkout is connected.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {CREDIT_PACKS.map((pack) => (
            <li key={pack.id}>
              <div className="card border border-base-300/80 bg-base-100 shadow-sm">
                <div className="card-body flex-row items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="shelfswap-heading font-semibold text-base-content">{pack.label}</p>
                    <p className="text-sm text-primary font-semibold tabular-nums">
                      {pack.credits} credits
                    </p>
                    <p className="text-xs text-base-content/55">{pack.helper}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary shrink-0 gap-1"
                    disabled={pending || !devPurchasesEnabled}
                    onClick={() => onBuy(pack.id)}
                  >
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Sparkles className="h-4 w-4" aria-hidden />
                    )}
                    {devPurchasesEnabled ? "Add" : "Soon"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
