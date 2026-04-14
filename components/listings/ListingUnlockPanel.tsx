"use client";

/**
 * Unlock CTA for listing detail: sign-in gate, balance check, and credit-hold request flow.
 * Save uses the heart beside the title on the detail page.
 * Location: components/listings/ListingUnlockPanel.tsx
 */
import { cancelUnlockHoldAction, requestUnlockHoldAction } from "@/app/app/listings/actions";
import { formatUnlockCredits } from "@/lib/listings/format";
import { Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  listingId: string;
  creditsRequired: number;
  creditBalance: number;
  heldCredits?: number;
  initiallyPending?: boolean;
  isSignedIn: boolean;
  initiallyUnlocked: boolean;
};

export function ListingUnlockPanel({
  listingId,
  creditsRequired,
  creditBalance,
  heldCredits = 0,
  initiallyPending = false,
  isSignedIn,
  initiallyUnlocked,
}: Props) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(initiallyUnlocked);
  const [pendingRequest, setPendingRequest] = useState(initiallyPending);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nextPath = `/app/listings/${listingId}`;

  function onRequest() {
    setError(null);
    startTransition(async () => {
      const res = await requestUnlockHoldAction(listingId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.alreadyUnlocked) {
        setUnlocked(true);
        router.refresh();
        return;
      }
      setPendingRequest(true);
      router.refresh();
    });
  }

  function onCancelRequest() {
    setError(null);
    startTransition(async () => {
      const res = await cancelUnlockHoldAction(listingId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPendingRequest(false);
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

  const available = Math.max(0, creditBalance - heldCredits);
  const canAfford = available >= creditsRequired;

  return (
    <div className="card bg-base-100 border border-primary/20 shadow-md">
      <div className="card-body gap-3">
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-semibold">
              {pendingRequest ? "Request sent" : `Request chat for ${formatUnlockCredits(creditsRequired)}`}
            </h2>
            <p className="text-sm text-base-content/65">
              {pendingRequest
                ? "We’ll hold credits until the seller accepts. If they don’t respond within 24 hours, credits are released."
                : (
                    <>
                      Credits are held until the seller accepts. You have{" "}
                      <span className="font-medium text-base-content">{available}</span>{" "}
                      available credits.
                    </>
                  )}
            </p>
          </div>
        </div>

        {error ? (
          <div role="alert" className="alert alert-error text-sm py-2">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {pendingRequest ? (
            <button
              type="button"
              className="btn btn-outline btn-primary border-primary/30"
              disabled={pending}
              onClick={() => onCancelRequest()}
            >
              {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
              Cancel request
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary gap-2"
              disabled={pending || !canAfford}
              onClick={() => onRequest()}
            >
              {pending ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Lock className="h-5 w-5" aria-hidden />
              )}
              Request chat
            </button>
          )}
          {!canAfford ? (
            <Link href="/app/credits" className="btn btn-outline btn-primary border-primary/30">
              Buy credits
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
