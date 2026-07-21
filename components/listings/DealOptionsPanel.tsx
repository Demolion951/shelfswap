"use client";

/**
 * Overflow menu for active deal exits: withdraw, mutual cancel, stalled re-list/close, report.
 * Location: components/listings/DealOptionsPanel.tsx
 */
import {
  buyerCloseStalledDealAction,
  requestMutualCancelAction,
  sellerRelistStalledDealAction,
  withdrawFromDealAction,
} from "@/app/app/listings/actions";
import type { UnlockDeal } from "@/components/listings/DealPanel";
import type { DealOptionsEligibility } from "@/lib/listings/dealOptions";
import { ReportAbuseButton } from "@/components/reports/ReportAbuseButton";
import { Loader2, MoreHorizontal, RotateCcw, UserX, XCircle } from "lucide-react";
import { useRef, useState, useTransition } from "react";

type Props = {
  listingId: string;
  listingTitle: string;
  sellerId: string;
  sellerDisplayName?: string | null;
  isOwner: boolean;
  deal: UnlockDeal;
  eligibility: DealOptionsEligibility;
  onDealUpdated?: (deal: UnlockDeal | null) => void;
  onSyncActivity?: () => void | Promise<void>;
};

type ConfirmKind =
  | "withdraw"
  | "mutual_cancel"
  | "seller_relist"
  | "buyer_close"
  | null;

export function DealOptionsPanel({
  listingId,
  listingTitle,
  sellerId,
  sellerDisplayName = null,
  isOwner,
  deal,
  eligibility,
  onDealUpdated,
  onSyncActivity,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const hasAnyOption =
    eligibility.canWithdraw ||
    eligibility.canRequestMutualCancel ||
    eligibility.mutualCancelWaitingOnOther ||
    eligibility.canSellerRelistStalled ||
    eligibility.canBuyerCloseStalled ||
    eligibility.canReportProblem;

  if (!hasAnyOption || deal.completedAt) return null;

  function openConfirm(kind: ConfirmKind) {
    setError(null);
    setConfirmKind(kind);
    dialogRef.current?.showModal();
  }

  function closeConfirm() {
    dialogRef.current?.close();
    setConfirmKind(null);
  }

  function onConfirm() {
    if (!confirmKind) return;
    setError(null);
    startTransition(async () => {
      let res: { ok: boolean; error?: string; completed?: boolean };
      if (confirmKind === "withdraw") {
        res = await withdrawFromDealAction(listingId);
      } else if (confirmKind === "mutual_cancel") {
        res = await requestMutualCancelAction(listingId);
      } else if (confirmKind === "seller_relist") {
        res = await sellerRelistStalledDealAction(listingId);
      } else if (confirmKind === "buyer_close") {
        res = await buyerCloseStalledDealAction(listingId);
      } else {
        return;
      }
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      if (confirmKind === "mutual_cancel") {
        if (res.completed) onDealUpdated?.(null);
      } else {
        onDealUpdated?.(null);
      }
      closeConfirm();
      await onSyncActivity?.();
    });
  }

  const confirmCopy = (() => {
    switch (confirmKind) {
      case "withdraw":
        return {
          title: "Leave this conversation?",
          body: "The seller has not replied yet. You will leave this chat and can message other listings.",
          action: "Leave chat",
        };
      case "mutual_cancel":
        return {
          title: "Call off this deal?",
          body: "Both of you must agree. The listing will be open again for others once cancelled.",
          action: "Agree to cancel",
        };
      case "seller_relist":
        return {
          title: "Re-list this book?",
          body: "The buyer has not messaged in over 14 days. This deal will close and the book goes back on discovery.",
          action: "Re-list book",
        };
      case "buyer_close":
        return {
          title: "Close this deal?",
          body: "The seller has not messaged in over 14 days. This conversation will close and you can browse other listings.",
          action: "Close deal",
        };
      default:
        return null;
    }
  })();

  return (
    <>
      <div className="dropdown dropdown-end">
        <label
          tabIndex={0}
          className="btn btn-outline btn-sm gap-1.5 border-base-300"
          aria-label="Deal options"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
          Options
        </label>
        <ul
          tabIndex={0}
          className="dropdown-content menu z-[20] mt-1 w-56 rounded-box border border-base-300/80 bg-base-100 p-1 shadow-lg"
        >
          {eligibility.canWithdraw ? (
            <li>
              <button type="button" className="gap-2 text-sm" onClick={() => openConfirm("withdraw")}>
                <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
                Leave chat
              </button>
            </li>
          ) : null}
          {eligibility.canRequestMutualCancel ? (
            <li>
              <button
                type="button"
                className="gap-2 text-sm"
                onClick={() => openConfirm("mutual_cancel")}
              >
                <XCircle className="h-4 w-4 shrink-0" aria-hidden />
                Call off deal
              </button>
            </li>
          ) : null}
          {eligibility.mutualCancelWaitingOnOther ? (
            <li>
              <span className="gap-2 text-sm pointer-events-none opacity-80">
                <XCircle className="h-4 w-4 shrink-0" aria-hidden />
                Waiting for them to agree
              </span>
            </li>
          ) : null}
          {eligibility.canSellerRelistStalled ? (
            <li>
              <button
                type="button"
                className="gap-2 text-sm"
                onClick={() => openConfirm("seller_relist")}
              >
                <UserX className="h-4 w-4 shrink-0" aria-hidden />
                Re-list (buyer inactive)
              </button>
            </li>
          ) : null}
          {eligibility.canBuyerCloseStalled ? (
            <li>
              <button
                type="button"
                className="gap-2 text-sm"
                onClick={() => openConfirm("buyer_close")}
              >
                <UserX className="h-4 w-4 shrink-0" aria-hidden />
                Close deal (seller inactive)
              </button>
            </li>
          ) : null}
          {eligibility.canReportProblem ? (
            <li>
              <ReportAbuseButton
                variant="menu"
                label="Report a problem"
                listingId={listingId}
                reportedUserId={isOwner ? deal.buyerId : sellerId}
                listingTitle={listingTitle}
                reportedDisplayName={isOwner ? null : sellerDisplayName}
              />
            </li>
          ) : null}
        </ul>
      </div>

      <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
        {confirmCopy ? (
          <div className="modal-box">
            <h2 className="shelfswap-heading text-lg font-semibold">{confirmCopy.title}</h2>
            <p className="py-3 text-sm leading-relaxed">{confirmCopy.body}</p>
            {error ? (
              <div role="alert" className="alert alert-error text-sm py-2 mb-2">
                {error}
              </div>
            ) : null}
            <div className="modal-action">
              <form method="dialog">
                <button type="submit" className="btn btn-ghost" onClick={() => closeConfirm()}>
                  Back
                </button>
              </form>
              <button
                type="button"
                className="btn btn-primary gap-2"
                disabled={pending}
                onClick={() => onConfirm()}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {confirmCopy.action}
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
