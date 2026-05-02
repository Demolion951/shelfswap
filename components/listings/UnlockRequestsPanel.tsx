"use client";

/**
 * Seller-side panel for pending unlock requests: decline or reply in Messages to accept (FIFO).
 * Location: components/listings/UnlockRequestsPanel.tsx
 */
import { respondUnlockHoldAction } from "@/app/app/listings/actions";
import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type PendingUnlockRequest = {
  id: string;
  buyerId: string;
  buyerHandle: string;
  creditsHeld: number;
  createdAt: string;
};

type Props = {
  listingId: string;
  requests: PendingUnlockRequest[];
};

export function UnlockRequestsPanel({ listingId, requests }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onRespond(id: string, accept: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await respondUnlockHoldAction(id, accept);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (requests.length === 0) return null;

  return (
    <div className="card bg-base-100 border border-base-300/80 shadow-sm">
      <div className="card-body gap-3">
        <h2 className="shelfswap-heading text-lg font-semibold text-primary">
          Unlock requests
        </h2>
        {error ? (
          <div role="alert" className="alert alert-error text-sm py-2">
            {error}
          </div>
        ) : null}
        <ul className="space-y-2">
          {requests.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-base-300/70 bg-base-100 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-base-content">
                    @{r.buyerHandle}
                  </div>
                  <div className="text-xs text-base-content/55">
                    Wants to chat ({r.creditsHeld} credit{r.creditsHeld === 1 ? "" : "s"} held)
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm gap-1"
                    disabled={pending}
                    onClick={() => onRespond(r.id, false)}
                  >
                    <X className="h-4 w-4" aria-hidden />
                    Decline
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-base-content/50">
          Reply in Messages to accept and charge credits — or decline here to release their hold.
        </p>
      </div>
    </div>
  );
}

