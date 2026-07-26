"use client";

/**
 * Swap-related deal UI after unlock (offer / accept swap). Shows agreed-swap summary after acceptance
 * so sellers do not lose context; handoff lives in DealHandoffPanel beside “Listed by”.
 * Location: components/listings/DealPanel.tsx
 */
import { proposeSwapAction, respondSwapAction } from "@/app/app/listings/actions";
import { DealOptionsPanel } from "@/components/listings/DealOptionsPanel";
import { SwapOfferPicker } from "@/components/listings/SwapOfferPicker";
import type { DealOptionsEligibility } from "@/lib/listings/dealOptions";
import { Check, Loader2, Shuffle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

export type UnlockDeal = {
  buyerId: string;
  /** Buyer's display name for swap copy (“Zak offered …”). */
  buyerDisplayName: string | null;
  dealType: "pickup" | "swap";
  swapStatus: "proposed" | "accepted" | "declined" | null;
  offeredListingId: string | null;
  offeredTitle: string | null;
  offeredCredits: number | null;
  creditsSpent: number;
  swapCreditsRefunded: number;
  buyerConfirmedAt: string | null;
  sellerConfirmedAt: string | null;
  completedAt: string | null;
  unlockCreatedAt: string | null;
  buyerMutualCancelAt: string | null;
  sellerMutualCancelAt: string | null;
};

type OfferOption = { id: string; title: string };

type Props = {
  listingId: string;
  /** Seller listing title (this page’s book) — used in swap summary after acceptance. */
  listingTitle: string;
  /** Credits to unlock this listing (1 or 2). */
  listingUnlockCredits: number;
  isOwner: boolean;
  currentUserId: string | null;
  sellerId: string;
  sellerDisplayName?: string | null;
  listingOpenToSwaps: boolean;
  deal: UnlockDeal;
  myOfferOptions: OfferOption[];
  dealOptionsEligibility: DealOptionsEligibility | null;
  onDealUpdated?: (deal: UnlockDeal | null) => void;
  onSyncActivity?: () => void | Promise<void>;
};

export function DealPanel({
  listingId,
  listingTitle,
  listingUnlockCredits,
  isOwner,
  currentUserId,
  sellerId,
  sellerDisplayName = null,
  listingOpenToSwaps,
  deal,
  myOfferOptions,
  dealOptionsEligibility,
  onDealUpdated,
  onSyncActivity,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [offerId, setOfferId] = useState<string>(myOfferOptions[0]?.id ?? "");

  useEffect(() => {
    if (offerId && myOfferOptions.some((o) => o.id === offerId)) return;
    setOfferId(myOfferOptions[0]?.id ?? "");
  }, [myOfferOptions, offerId]);

  const isBuyer = useMemo(() => {
    if (!currentUserId) return false;
    return currentUserId === deal.buyerId;
  }, [currentUserId, deal.buyerId]);

  const canShowSwap = listingOpenToSwaps && isBuyer && !isOwner;

  function onProposeSwap() {
    setError(null);
    if (!offerId) {
      setError("Pick a book from your listings to offer.");
      return;
    }
    startTransition(async () => {
      const res = await proposeSwapAction(listingId, offerId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await onSyncActivity?.();
    });
  }

  function onRespondSwap(accept: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await respondSwapAction(listingId, accept);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await onSyncActivity?.();
    });
  }

  return (
    <div className="card bg-base-100 border border-base-300/80 shadow-sm">
      <div className="card-body gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="shelfswap-heading text-lg font-semibold text-primary">
              Deal
            </h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {dealOptionsEligibility ? (
              <DealOptionsPanel
                listingId={listingId}
                listingTitle={listingTitle}
                sellerId={sellerId}
                sellerDisplayName={sellerDisplayName}
                isOwner={isOwner}
                deal={deal}
                eligibility={dealOptionsEligibility}
                onDealUpdated={onDealUpdated}
                onSyncActivity={onSyncActivity}
              />
            ) : null}
          </div>
        </div>

        {error ? (
          <div role="alert" className="alert alert-error text-sm py-2">
            {error}
          </div>
        ) : null}

        {canShowSwap ? (
          <div className="rounded-lg border border-base-300/70 bg-base-100 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shuffle className="h-4 w-4 text-secondary" aria-hidden />
              Offer a swap
            </div>
            {deal.swapStatus === "declined" ? (
              <div role="status" className="alert alert-warning text-sm py-2">
                The seller declined your swap offer. You can propose a different listing below or keep this as
                pickup only.
              </div>
            ) : null}
            {deal.dealType === "swap" ? (
              deal.swapStatus === "accepted" ? (
                <div
                  role="status"
                  className="rounded-lg border border-success/30 bg-success/10 px-3 py-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Shuffle className="h-4 w-4 shrink-0 text-success" aria-hidden />
                    <span className="text-sm font-semibold text-base-content">Swap agreed</span>
                  </div>
                  <p className="text-sm text-base-content/80 leading-relaxed">
                    They accepted{" "}
                    <span className="font-medium text-base-content">{listingTitle}</span>
                    {" ↔ "}
                    {deal.offeredListingId ? (
                      <Link
                        href={`/app/listings/${deal.offeredListingId}`}
                        className="link link-primary font-medium break-words"
                      >
                        {deal.offeredTitle ?? "your offered book"}
                      </Link>
                    ) : (
                      <span className="font-medium text-base-content break-words">
                        {deal.offeredTitle ?? "your offered book"}
                      </span>
                    )}
                    . Message below to arrange pickup; confirm handoff when you&apos;re done.
                  </p>
                  {deal.offeredListingId ? (
                    <Link
                      href={`/app/listings/${deal.offeredListingId}`}
                      className="link link-primary text-sm font-medium"
                    >
                      View your offered listing
                    </Link>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-base-content/60 leading-relaxed break-words">
                  {deal.swapStatus === "proposed"
                    ? `Awaiting seller — you offered ${deal.offeredTitle ?? "your book"} for ${listingTitle}.`
                    : null}
                </p>
              )
            ) : (
              <>
                <SwapOfferPicker
                  options={myOfferOptions}
                  value={offerId}
                  onChange={setOfferId}
                  disabled={pending}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-secondary btn-sm w-full"
                  disabled={pending || myOfferOptions.length === 0}
                  onClick={() => onProposeSwap()}
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Propose swap
                </button>
              </>
            )}
          </div>
        ) : null}

        {isOwner && deal.dealType === "swap" && deal.swapStatus === "proposed" ? (
          <div className="rounded-lg border border-secondary/25 bg-secondary/5 p-3">
            <div className="text-sm font-medium text-base-content">
              Swap offer received
            </div>
            <div className="text-xs text-base-content/70 mt-1 break-words leading-relaxed">
              {deal.offeredListingId ? (
                <Link
                  href={`/app/listings/${deal.offeredListingId}`}
                  className="link link-primary font-medium"
                >
                  {(deal.buyerDisplayName?.trim() || "Someone")} offered{" "}
                  {deal.offeredTitle ?? "a book"}
                </Link>
              ) : (
                <span>
                  {(deal.buyerDisplayName?.trim() || "Someone")} offered{" "}
                  {deal.offeredTitle ?? "a book"}
                </span>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm gap-1"
                disabled={pending}
                onClick={() => onRespondSwap(true)}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
                Accept swap
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm gap-1"
                disabled={pending}
                onClick={() => onRespondSwap(false)}
              >
                <X className="h-4 w-4" aria-hidden />
                Decline
              </button>
            </div>
          </div>
        ) : null}

        {isOwner && deal.dealType === "swap" && deal.swapStatus === "accepted" ? (
          <div
            role="status"
            className="rounded-lg border border-success/30 bg-success/10 px-3 py-3 space-y-2"
          >
            <div className="flex items-center gap-2">
              <Shuffle className="h-4 w-4 shrink-0 text-success" aria-hidden />
              <span className="text-sm font-semibold text-base-content">Swap agreed</span>
            </div>
            <p className="text-sm text-base-content/80 leading-relaxed">
              You accepted{" "}
              <span className="font-medium text-base-content">{listingTitle}</span>
              {" ↔ "}
              {deal.offeredListingId ? (
                <Link
                  href={`/app/listings/${deal.offeredListingId}`}
                  className="link link-primary font-medium break-words"
                >
                  {deal.offeredTitle ?? "their offered book"}
                </Link>
              ) : (
                <span className="font-medium text-base-content break-words">
                  {deal.offeredTitle ?? "their offered book"}
                </span>
              )}
              . Message below to arrange pickup; confirm handoff when you&apos;ve handed over your copy.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

