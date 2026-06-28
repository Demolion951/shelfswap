"use client";

/**
 * Unlock CTA for listing detail: Premium instant chat (Marketplace-style).
 * Location: components/listings/ListingUnlockPanel.tsx
 */
import { requestUnlockHoldAction } from "@/app/app/listings/actions";
import { Lock, Loader2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

type Props = {
  listingId: string;
  hasPremium: boolean;
  isUnlocked?: boolean;
  isSignedIn: boolean;
  onUnlocked?: () => void;
};

export function ListingUnlockPanel({
  listingId,
  hasPremium,
  isUnlocked = false,
  isSignedIn,
  onUnlocked,
}: Props) {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setUnlocked(isUnlocked);
  }, [isUnlocked]);

  const nextPath = `/app/listings/${listingId}`;

  function onMessageSeller() {
    setError(null);
    startTransition(async () => {
      const res = await requestUnlockHoldAction(listingId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setUnlocked(true);
      onUnlocked?.();
    });
  }

  if (!isSignedIn) {
    return (
      <div className="card bg-base-100 border border-primary/20 shadow-md">
        <div className="card-body gap-3">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="font-semibold">Message the seller</h2>
              <p className="text-sm text-base-content/65">
                Sign in with Premium to chat about this book.
              </p>
            </div>
          </div>
          <Link
            href={`/auth/sign-in?next=${encodeURIComponent(nextPath)}`}
            className="btn btn-primary"
          >
            Sign in to message
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
                Subscribe to message sellers. Listing your own books stays free.
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
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-semibold">Message seller</h2>
            <p className="text-sm text-base-content/65">
              Included with Premium — chat opens instantly. Other buyers can message too until
              the book sells.
            </p>
          </div>
        </div>

        {error ? (
          <div role="alert" className="alert alert-error text-sm py-2">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          className="btn btn-primary gap-2"
          disabled={pending}
          onClick={() => onMessageSeller()}
        >
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <MessageCircle className="h-5 w-5" aria-hidden />
          )}
          Message seller
        </button>
      </div>
    </div>
  );
}
