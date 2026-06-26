"use client";

/**
 * Unlock CTA for listing detail: Premium gate and chat-request flow.
 * Save uses the heart beside the title on the detail page.
 * Location: components/listings/ListingUnlockPanel.tsx
 */
import { cancelUnlockHoldAction, requestUnlockHoldAction } from "@/app/app/listings/actions";
import { Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

type Props = {
  listingId: string;
  hasPremium: boolean;
  isPending?: boolean;
  isUnlocked?: boolean;
  isSignedIn: boolean;
};

export function ListingUnlockPanel({
  listingId,
  hasPremium,
  isPending = false,
  isUnlocked = false,
  isSignedIn,
}: Props) {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [pendingRequest, setPendingRequest] = useState(isPending);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setUnlocked(isUnlocked);
    setPendingRequest(isPending);
  }, [isUnlocked, isPending]);

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
        return;
      }
      setPendingRequest(true);
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
    });
  }

  if (!isSignedIn) {
    return (
      <div className="card bg-base-100 border border-primary/20 shadow-md">
        <div className="card-body gap-3">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="font-semibold">Unlock this listing</h2>
              <p className="text-sm text-base-content/65">
                Sign in with Premium to request a chat with the seller.
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

  if (!hasPremium) {
    return (
      <div className="card bg-base-100 border border-primary/20 shadow-md">
        <div className="card-body gap-3">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="font-semibold">Premium required</h2>
              <p className="text-sm text-base-content/65">
                Subscribe to unlock listings and chat with sellers. Listing books stays free.
              </p>
            </div>
          </div>
          <Link href="/app/subscribe" className="btn btn-primary">
            Get Premium — £7.99/mo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 border border-primary/20 shadow-md">
      <div className="card-body gap-3">
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-semibold">
              {pendingRequest ? "Request sent" : "Request chat"}
            </h2>
            <p className="text-sm text-base-content/65">
              {pendingRequest
                ? "Waiting for the seller to reply. You can message once they respond."
                : "Included with your Premium subscription — no extra charge for this book."}
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
              disabled={pending}
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
        </div>
      </div>
    </div>
  );
}
