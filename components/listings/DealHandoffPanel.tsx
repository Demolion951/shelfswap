"use client";

/**
 * Buyer/seller handoff actions (Mark received / handed over) for the listing header row
 * next to “Listed by @…”. Renders buttons only; parent controls layout.
 * Location: components/listings/DealHandoffPanel.tsx
 */
import {
  confirmDealCompleteAction,
  unconfirmDealCompleteAction,
} from "@/app/app/listings/actions";
import type { UnlockDeal } from "@/components/listings/DealPanel";
import { Check, Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

type Props = {
  listingId: string;
  currentUserId: string | null;
  deal: UnlockDeal;
  onDealUpdated?: (deal: UnlockDeal | null) => void;
  onSyncActivity?: () => void | Promise<void>;
};

export function DealHandoffPanel({
  listingId,
  currentUserId,
  deal,
  onSyncActivity,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isBuyer = useMemo(() => {
    if (!currentUserId) return false;
    return currentUserId === deal.buyerId;
  }, [currentUserId, deal.buyerId]);

  const iConfirmed = isBuyer ? !!deal.buyerConfirmedAt : !!deal.sellerConfirmedAt;
  const completeText = deal.completedAt
    ? "Completed"
    : isBuyer
      ? iConfirmed
        ? "Received"
        : "Mark received"
      : iConfirmed
        ? "Handed over"
        : "Mark handed over";

  function onConfirmComplete() {
    setError(null);
    startTransition(async () => {
      const res = await confirmDealCompleteAction(listingId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await onSyncActivity?.();
    });
  }

  function onUnconfirmComplete() {
    setError(null);
    startTransition(async () => {
      const res = await unconfirmDealCompleteAction(listingId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await onSyncActivity?.();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <span className="sr-only">Handoff confirmation</span>
      {deal.completedAt ? (
        <span className="badge badge-success gap-1 border-0 text-success-content">
          <Check className="h-3.5 w-3.5" aria-hidden />
          Completed
        </span>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {iConfirmed ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pending}
              onClick={() => onUnconfirmComplete()}
            >
              Undo
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-primary btn-sm gap-2"
            disabled={pending || iConfirmed}
            onClick={() => onConfirmComplete()}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
            {completeText}
          </button>
        </div>
      )}
      {error ? (
        <div role="alert" className="text-xs text-error max-w-[min(100%,14rem)] text-right">
          {error}
        </div>
      ) : null}
    </div>
  );
}
