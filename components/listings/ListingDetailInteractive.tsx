"use client";

/**
 * Client orchestration for listing detail: optimistic unlock/deal updates and live activity sync.
 * Location: components/listings/ListingDetailInteractive.tsx
 */
import { ListingDetailCarousel } from "@/components/listings/ListingDetailCarousel";
import { OpenLibraryBlurbLoader } from "@/components/listings/OpenLibraryBlurbLoader";
import { ListingSaveHeart } from "@/components/listings/ListingSaveHeart";
import { markListingMessageNotificationsReadAction } from "@/app/app/notifications/actions";
import { useBadgeCounts } from "@/components/nav/BadgeCountsProvider";
import { DealHandoffPanel } from "@/components/listings/DealHandoffPanel";
import { DealPanel, type UnlockDeal } from "@/components/listings/DealPanel";
import { ListingMessagesThread } from "@/components/listings/ListingMessagesThread";
import { ListingUnlockPanel } from "@/components/listings/ListingUnlockPanel";
import { ListingViewTracker } from "@/components/listings/ListingViewTracker";
import {
  UnlockRequestsPanel,
  type PendingUnlockRequest,
} from "@/components/listings/UnlockRequestsPanel";
import { computeDealOptionsEligibility } from "@/lib/listings/dealOptions";
import type { ListingActivitySnapshot } from "@/lib/listings/fetchListingActivitySnapshot";
import { sellerCanComposeMessages } from "@/lib/listings/messageCompose";
import { listingAreaLine } from "@/lib/listings/areaDisplay";
import { CONDITION_LABELS, formatUnlockCredits } from "@/lib/listings/format";
import {
  applyBuyerObservedSellerReply,
  createUnlockDealFromRequest,
  hasNewMessageFrom,
  mergeMessages,
} from "@/lib/listings/listingDetailTransitions";
import type { ListingMessageRow, ListingWithRelations } from "@/lib/listings/queries";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  listing: ListingWithRelations & { status?: string };
  isOwner: boolean;
  isSignedIn: boolean;
  viewerUnlocked: boolean;
  viewerSaved: boolean;
  creditBalance: number;
  heldCredits: number;
  viewerPendingUnlock: boolean;
  pendingRequestsForSeller: PendingUnlockRequest[];
  unlockDeal: UnlockDeal | null;
  buyerOfferOptions: Array<{ id: string; title: string }>;
  currentUserId: string | null;
  messages: ListingMessageRow[];
  distanceKm: number | null;
  creditsPendingSellerReply?: boolean;
};

export function ListingDetailInteractive({
  listing,
  isOwner,
  isSignedIn,
  viewerUnlocked: initialViewerUnlocked,
  viewerSaved,
  creditBalance,
  heldCredits,
  viewerPendingUnlock: initialViewerPendingUnlock,
  pendingRequestsForSeller: initialPendingRequests,
  unlockDeal: initialUnlockDeal,
  buyerOfferOptions,
  currentUserId,
  messages: initialMessages,
  distanceKm: _distanceKm,
  creditsPendingSellerReply: initialCreditsPendingSellerReply = false,
}: Props) {
  const { setCounts } = useBadgeCounts();
  const [messages, setMessages] = useState(initialMessages);
  const [pendingRequests, setPendingRequests] = useState(initialPendingRequests);
  const [unlockDeal, setUnlockDeal] = useState(initialUnlockDeal);
  const [viewerUnlocked, setViewerUnlocked] = useState(initialViewerUnlocked);
  const [viewerPendingUnlock, setViewerPendingUnlock] = useState(initialViewerPendingUnlock);
  const [creditsPendingSellerReply, setCreditsPendingSellerReply] = useState(
    initialCreditsPendingSellerReply,
  );

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    setMessages(initialMessages);
    setPendingRequests(initialPendingRequests);
    setUnlockDeal(initialUnlockDeal);
    setViewerUnlocked(initialViewerUnlocked);
    setViewerPendingUnlock(initialViewerPendingUnlock);
    setCreditsPendingSellerReply(initialCreditsPendingSellerReply);
  }, [
    initialMessages,
    initialPendingRequests,
    initialUnlockDeal,
    initialViewerUnlocked,
    initialViewerPendingUnlock,
    initialCreditsPendingSellerReply,
  ]);

  const applySnapshot = useCallback(
    (snapshot: ListingActivitySnapshot) => {
      const prev = messagesRef.current;
      setMessages((current) => mergeMessages(current, snapshot.messages));

      if (!isOwner && hasNewMessageFrom(prev, snapshot.messages, listing.user_id)) {
        const buyerUpdate = applyBuyerObservedSellerReply();
        setViewerUnlocked(buyerUpdate.viewerUnlocked);
        setViewerPendingUnlock(buyerUpdate.viewerPendingUnlock);
        setCreditsPendingSellerReply(buyerUpdate.creditsPendingSellerReply);
      }

      setPendingRequests(snapshot.pendingRequests);
      setUnlockDeal(snapshot.unlockDeal);

      if (!isOwner) {
        setViewerUnlocked(snapshot.viewerUnlocked);
        setViewerPendingUnlock(snapshot.viewerPendingUnlock);
        setCreditsPendingSellerReply(snapshot.creditsPendingSellerReply);
      }
    },
    [isOwner, listing.user_id],
  );

  const syncActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/listings/${listing.id}/activity`, { cache: "no-store" });
      if (!res.ok) return;
      const snapshot = (await res.json()) as ListingActivitySnapshot;
      applySnapshot(snapshot);
    } catch {
      /* ignore transient network errors */
    }
  }, [applySnapshot, listing.id]);

  const shouldPoll =
    isSignedIn &&
    (isOwner ||
      viewerUnlocked ||
      viewerPendingUnlock ||
      pendingRequests.length > 0 ||
      !!unlockDeal) &&
    !unlockDeal?.completedAt;

  useEffect(() => {
    if (!shouldPoll) return;
    const id = window.setInterval(() => {
      void syncActivity();
    }, 4000);
    return () => window.clearInterval(id);
  }, [shouldPoll, syncActivity]);

  const handleMessageSent = useCallback(
    (message: ListingMessageRow) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      if (isOwner && message.sender_id === listing.user_id) {
        setPendingRequests((prev) => {
          if (prev.length === 0) return prev;
          setUnlockDeal((d) => d ?? createUnlockDealFromRequest(prev[0]));
          return [];
        });
      }
    },
    [isOwner, listing.user_id],
  );

  const handleDealUpdated = useCallback(
    (next: UnlockDeal | null) => {
      setUnlockDeal(next);
      if (!next) {
        if (!isOwner) {
          setViewerUnlocked(false);
          setViewerPendingUnlock(false);
          setCreditsPendingSellerReply(false);
        }
      }
      void syncActivity();
    },
    [isOwner, syncActivity],
  );

  const seller = listing.profiles?.display_name?.trim() || "member";
  const cond = CONDITION_LABELS[listing.condition] ?? listing.condition;
  const credits = listing.unlock_credits === 2 ? 2 : 1;
  const areaLine = !isOwner && isSignedIn ? listingAreaLine(listing.approx_area_text) : null;

  const canComposeMessages =
    !isOwner ||
    sellerCanComposeMessages(listing.user_id, messages, {
      pendingUnlockCount: pendingRequests.length,
      hasActiveUnlock: !!unlockDeal,
    });

  const dealOptionsEligibility = unlockDeal
    ? computeDealOptionsEligibility({
        isOwner,
        currentUserId,
        sellerId: listing.user_id,
        deal: unlockDeal,
        messages,
      })
    : null;

  const showParticipantSections = isOwner || viewerUnlocked || viewerPendingUnlock;

  useEffect(() => {
    if (!isSignedIn || !showParticipantSections) return;
    void markListingMessageNotificationsReadAction(listing.id).then((res) => {
      if (res.ok) setCounts(res.counts);
    });
  }, [isSignedIn, showParticipantSections, listing.id, setCounts]);

  return (
    <div className="space-y-4 pb-8">
      <ListingViewTracker listingId={listing.id} enabled={isSignedIn && !isOwner} />
      <ListingDetailCarousel listing={listing} />

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="shelfswap-heading text-2xl font-semibold leading-tight">
            {listing.title}
          </h1>
          {listing.author ? (
            <p className="text-base-content/70">{listing.author}</p>
          ) : null}
          {listing.isbn ? (
            <p className="font-mono text-xs text-base-content/50">ISBN {listing.isbn}</p>
          ) : null}
        </div>
        {!isOwner && isSignedIn ? (
          <div className="shrink-0 pt-0.5">
            <ListingSaveHeart listingId={listing.id} initiallySaved={viewerSaved} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="badge badge-lg badge-ghost border-primary/25 text-primary">
          {cond}
        </span>
        <span className="text-2xl font-bold text-primary">
          {formatUnlockCredits(credits)}
        </span>
        {listing.open_to_swaps ? (
          <span className="badge badge-accent badge-outline">Open to swaps</span>
        ) : null}
      </div>

      {!isOwner && areaLine ? (
        <div className="flex items-start gap-2 text-sm text-base-content/70">
          <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary/80" aria-hidden />
          <span className="text-sm leading-snug text-base-content/80">{areaLine}</span>
        </div>
      ) : null}

      {listing.description ? (
        <section className="space-y-2" aria-labelledby="listing-seller-notes-heading">
          <h2
            id="listing-seller-notes-heading"
            className="shelfswap-heading text-sm font-semibold text-primary"
          >
            Seller notes
          </h2>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-relaxed text-base-content whitespace-pre-wrap">
            {listing.description}
          </div>
        </section>
      ) : null}

      <OpenLibraryBlurbLoader
        isbn={listing.isbn}
        title={listing.title}
        author={listing.author}
      />

      {showParticipantSections ? (
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
          <p className="text-sm text-base-content/60 min-w-0">
            Listed by <span className="font-medium text-base-content">@{seller}</span>
          </p>
          {unlockDeal ? (
            <DealHandoffPanel
              listingId={listing.id}
              currentUserId={currentUserId}
              deal={unlockDeal}
              onDealUpdated={handleDealUpdated}
            />
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-base-content/50">Seller name hidden until unlock</p>
      )}

      {showParticipantSections ? (
        <>
          {isOwner ? (
            <UnlockRequestsPanel
              listingId={listing.id}
              requests={pendingRequests}
              onRequestDeclined={(id) =>
                setPendingRequests((prev) => prev.filter((r) => r.id !== id))
              }
              onSyncActivity={syncActivity}
            />
          ) : null}
          {unlockDeal ? (
            <DealPanel
              listingId={listing.id}
              listingTitle={listing.title}
              listingUnlockCredits={credits}
              isOwner={isOwner}
              currentUserId={currentUserId}
              listingOpenToSwaps={!!listing.open_to_swaps}
              deal={unlockDeal}
              myOfferOptions={buyerOfferOptions}
              dealOptionsEligibility={dealOptionsEligibility}
              onDealUpdated={handleDealUpdated}
              onSyncActivity={syncActivity}
            />
          ) : null}
          <div className="card bg-base-100 border border-base-300/80 shadow-sm">
            <div className="card-body gap-4">
              <h2 className="shelfswap-heading text-lg font-semibold text-primary">Messages</h2>
              {!isOwner ? (
                unlockDeal?.completedAt ? (
                  <p className="text-sm text-base-content/60 leading-snug">
                    This deal is completed. The listing is no longer shown on Home or Browse.
                  </p>
                ) : viewerPendingUnlock && !viewerUnlocked ? (
                  <p className="text-sm text-base-content/60 leading-snug">
                    When the seller replies, your request is accepted and credits are charged.
                  </p>
                ) : creditsPendingSellerReply ? (
                  <div className="alert alert-info text-sm py-2">
                    You can message below. Credits are charged when the seller sends their first reply.
                  </div>
                ) : (
                  <div className="alert alert-success text-sm py-2">
                    You&apos;ve unlocked this listing — chat below to arrange handoff.
                  </div>
                )
              ) : unlockDeal?.completedAt ? (
                <p className="text-sm text-base-content/60 leading-snug">
                  Deal completed — this listing is archived and hidden from discovery.
                </p>
              ) : !canComposeMessages ? (
                <p className="text-sm text-base-content/60 leading-snug">
                  Messages appear here when a buyer requests unlock or unlocks your listing.
                </p>
              ) : null}
              {messages.length > 0 || canComposeMessages ? (
                <ListingMessagesThread
                  listingId={listing.id}
                  messages={messages}
                  currentUserId={currentUserId}
                  canCompose={canComposeMessages}
                  onMessageSent={handleMessageSent}
                  onSyncActivity={syncActivity}
                />
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {!isOwner ? (
        <ListingUnlockPanel
          listingId={listing.id}
          creditsRequired={credits}
          creditBalance={creditBalance}
          heldCredits={heldCredits}
          isPending={viewerPendingUnlock}
          isUnlocked={viewerUnlocked}
          isSignedIn={isSignedIn}
        />
      ) : null}

      <Link href="/app/home" className="btn btn-ghost btn-block">
        Back to discovery
      </Link>
    </div>
  );
}
