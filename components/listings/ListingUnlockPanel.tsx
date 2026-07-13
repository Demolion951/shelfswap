"use client";

/**
 * Message seller CTA for listing detail (free during launch — sign in required).
 * Location: components/listings/ListingUnlockPanel.tsx
 */
import { requestUnlockHoldAction } from "@/app/app/listings/actions";
import { Loader2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

type Props = {
  listingId: string;
  isUnlocked?: boolean;
  isSignedIn: boolean;
  onUnlocked?: () => void;
};

export function ListingUnlockPanel({
  listingId,
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
            <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="font-semibold">Message the seller</h2>
              <p className="text-sm text-base-content/65">
                Sign in to chat about this book — free for everyone while we grow the community.
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

  return (
    <div className="card bg-base-100 border border-primary/20 shadow-md">
      <div className="card-body gap-3">
        <div className="flex items-start gap-2">
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-semibold">Message seller</h2>
            <p className="text-sm text-base-content/65">
              Chat opens instantly. Other buyers can message too until the book sells.
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
