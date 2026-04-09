import { Coins, Sparkles } from "lucide-react";
import Link from "next/link";

/**
 * Wallet / buy credits — purchase flow (e.g. Stripe) not wired yet; balance is placeholder.
 * Location: app/app/credits/page.tsx
 */
export default function CreditsPage() {
  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="shelfswap-heading text-2xl font-semibold text-primary">Credits</h1>
        <p className="mt-1 text-sm text-base-content/65">
          Use credits to unlock listings — see location and chat with the seller after unlock.
        </p>
      </div>

      <div className="card bg-base-100 border border-base-300/80 shadow-sm">
        <div className="card-body gap-3">
          <div className="flex items-center gap-2 text-primary">
            <Coins className="h-6 w-6" aria-hidden />
            <span className="text-sm font-semibold uppercase tracking-wide">Your balance</span>
          </div>
          <p className="text-4xl font-bold">0</p>
          <p className="text-sm text-base-content/60">
            Buying packs with Stripe (or similar) is the next build step — nothing to purchase here
            yet.
          </p>
          <button type="button" className="btn btn-primary btn-block gap-2" disabled>
            <Sparkles className="h-5 w-5" aria-hidden />
            Buy credits
            <span className="ml-1 text-[10px] font-normal opacity-80">Soon</span>
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-base-content/50">
        <Link href="/app/profile" className="link link-primary">
          Profile
        </Link>{" "}
        also shows your wallet summary.
      </p>
    </div>
  );
}
