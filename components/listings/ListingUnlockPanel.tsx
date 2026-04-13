"use client";

/**
 * Unlock CTA for listing detail: sign-in gate, balance check, RPC unlock, unlocked state.
 * Location: components/listings/ListingUnlockPanel.tsx
 */
import { unlockListingAction } from "@/app/app/listings/actions";
import { toggleSaveListingAction } from "@/app/app/saves/actions";
import { formatUnlockCredits } from "@/lib/listings/format";
import { Heart, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  listingId: string;
  creditsRequired: number;
  creditBalance: number;
  isSignedIn: boolean;
  initiallyUnlocked: boolean;
  initiallySaved: boolean;
};

export function ListingUnlockPanel({
  listingId,
  creditsRequired,
  creditBalance,
  isSignedIn,
  initiallyUnlocked,
  initiallySaved,
}: Props) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(initiallyUnlocked);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();

  const nextPath = `/app/listings/${listingId}`;

  function onUnlock() {
    setError(null);
    startTransition(async () => {
      const res = await unlockListingAction(listingId);
      if (res.ok) {
        setUnlocked(true);
        router.refresh();
        return;
      }
      setError(res.error);
    });
  }

  function onToggleSave() {
    setError(null);
    startTransition(async () => {
      const res = await toggleSaveListingAction(listingId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(res.saved);
      router.refresh();
    });
  }

  if (!isSignedIn) {
    return (
      <div className="card bg-base-100 border border-primary/20 shadow-md">
        <div className="card-body gap-3">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="font-semibold">Unlock for {formatUnlockCredits(creditsRequired)}</h2>
              <p className="text-sm text-base-content/65">
                Sign in to use your wallet and unlock this listing.
              </p>
            </div>
          </div>
          <Link
            href={`/auth/sign-in?next=${encodeURIComponent(nextPath)}`}
            className="btn btn-primary"
          >
            Sign in to unlock
          </Link>
        </div>
      </div>
    );
  }

  if (unlocked) {
    return null;
  }

  const canAfford = creditBalance >= creditsRequired;

  return (
    <div className="card bg-base-100 border border-primary/20 shadow-md">
      <div className="card-body gap-3">
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-semibold">Unlock for {formatUnlockCredits(creditsRequired)}</h2>
            <p className="text-sm text-base-content/65">
              Spend credits once to unlock this book. You have{" "}
              <span className="font-medium text-base-content">{creditBalance}</span> credits.
            </p>
          </div>
        </div>

        {error ? (
          <div role="alert" className="alert alert-error text-sm py-2">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary gap-2"
            disabled={pending || !canAfford}
            onClick={() => onUnlock()}
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Lock className="h-5 w-5" aria-hidden />
            )}
            Unlock now
          </button>
          {!canAfford ? (
            <Link href="/app/credits" className="btn btn-outline btn-primary border-primary/30">
              Buy credits
            </Link>
          ) : null}
          <button
            type="button"
            className={`btn btn-ghost btn-sm gap-1 ${saved ? "text-primary" : ""}`}
            onClick={() => onToggleSave()}
            disabled={pending}
          >
            <Heart className="h-4 w-4" aria-hidden />
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
