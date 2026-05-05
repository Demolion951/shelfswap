"use client";

/**
 * Swap-related deal UI after unlock (offer / accept swap). Shows agreed-swap summary after acceptance
 * so sellers do not lose context; handoff lives in DealHandoffPanel beside “Listed by”.
 * Location: components/listings/DealPanel.tsx
 */
import { proposeSwapAction, respondSwapAction } from "@/app/app/listings/actions";
import { Check, Loader2, RefreshCw, Shuffle, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

export type UnlockDeal = {
  buyerId: string;
  dealType: "pickup" | "swap";
  swapStatus: "proposed" | "accepted" | "declined" | null;
  offeredListingId: string | null;
  offeredTitle: string | null;
  buyerConfirmedAt: string | null;
  sellerConfirmedAt: string | null;
  completedAt: string | null;
};

type OfferOption = { id: string; title: string };

type Props = {
  listingId: string;
  /** Seller listing title (this page’s book) — used in swap summary after acceptance. */
  listingTitle: string;
  isOwner: boolean;
  currentUserId: string | null;
  listingOpenToSwaps: boolean;
  deal: UnlockDeal;
  myOfferOptions: OfferOption[];
};

export function DealPanel({
  listingId,
  listingTitle,
  isOwner,
  currentUserId,
  listingOpenToSwaps,
  deal,
  myOfferOptions,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [offerId, setOfferId] = useState<string>(myOfferOptions[0]?.id ?? "");

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
      router.refresh();
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
      router.refresh();
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
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => router.refresh()}
            aria-label="Refresh"
            disabled={pending}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </button>
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
                <div role="status" className="alert alert-success text-sm py-3 gap-2">
                  <div className="font-medium text-success-content">Swap agreed</div>
                  <p className="text-xs text-success-content/90 leading-snug">
                    They accepted exchanging{" "}
                    <span className="font-medium">{listingTitle}</span> for your{" "}
                    <span className="font-medium">{deal.offeredTitle ?? "offered book"}</span>. Arrange details in
                    Messages and confirm handoff above when done.
                  </p>
                  {deal.offeredListingId ? (
                    <Link
                      href={`/app/listings/${deal.offeredListingId}`}
                      className="link link-accent text-xs"
                    >
                      View your offered listing
                    </Link>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-base-content/60">
                  {deal.swapStatus === "proposed"
                    ? `Awaiting seller — you offered ${deal.offeredTitle ?? "your book"} for ${listingTitle}.`
                    : null}
                </p>
              )
            ) : (
              <>
                <select
                  className="select select-bordered w-full text-sm"
                  value={offerId}
                  onChange={(e) => setOfferId(e.target.value)}
                  disabled={pending || myOfferOptions.length === 0}
                >
                  {myOfferOptions.length === 0 ? (
                    <option value="">You have no active listings</option>
                  ) : (
                    myOfferOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title}
                      </option>
                    ))
                  )}
                </select>
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
            <div className="text-xs text-base-content/60 mt-1">
              Offered: {deal.offeredTitle ?? "a book"}
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
          <div role="status" className="rounded-lg border border-success/30 bg-success/10 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-base-content">
              <Shuffle className="h-4 w-4 text-success" aria-hidden />
              Swap agreed
            </div>
            <p className="text-xs text-base-content/75 leading-snug">
              You accepted exchanging your{" "}
              <span className="font-medium text-base-content">{listingTitle}</span> for their{" "}
              <span className="font-medium text-base-content">{deal.offeredTitle ?? "offered book"}</span>. Use
              Messages to arrange pickup; confirm handoff above when you&apos;ve passed your copy over.
            </p>
            {deal.offeredListingId ? (
              <Link
                href={`/app/listings/${deal.offeredListingId}`}
                className="link link-success text-xs inline-block"
              >
                View their offered listing
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

