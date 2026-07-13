"use client";

/**
 * Client orchestration for listing detail: optimistic unlock/deal updates and live activity sync.
 * Location: components/listings/ListingDetailInteractive.tsx
 */
import { ListingDetailCarousel } from "@/components/listings/ListingDetailCarousel";
import { OpenLibraryBlurbLoader } from "@/components/listings/OpenLibraryBlurbLoader";
import { ListingSaveHeart } from "@/components/listings/ListingSaveHeart";
import { ListingBuyerThreadPicker } from "@/components/listings/ListingBuyerThreadPicker";
import { SellerListingLink } from "@/components/listings/SellerListingLink";
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
import { listingAreaLine } from "@/lib/listings/areaDisplay";
import { CONDITION_LABELS, formatBindingType } from "@/lib/listings/format";
import {
  applyBuyerObservedSellerReply,
  hasNewMessageFrom,
  mergeMessages,
} from "@/lib/listings/listingDetailTransitions";
import type { ListingMessageRow, ListingWithRelations, UnlockedBuyerRow } from "@/lib/listings/queries";
import type { BookBlurb } from "@/lib/books/openLibraryBlurb";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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
  initialBlurb?: BookBlurb | null;
  sellerActiveListingCount?: number;
  initialUnlockedBuyers?: UnlockedBuyerRow[];
};

export function ListingDetailInteractive({
  listing,
  isOwner,
  isSignedIn,
  viewerUnlocked: initialViewerUnlocked,
  viewerSaved,
  creditBalance: _creditBalance,
  heldCredits: _heldCredits,
  viewerPendingUnlock: initialViewerPendingUnlock,
  pendingRequestsForSeller: initialPendingRequests,
  unlockDeal: initialUnlockDeal,
  buyerOfferOptions,
  currentUserId,
  messages: initialMessages,
  distanceKm: _distanceKm,
  creditsPendingSellerReply: initialCreditsPendingSellerReply = false,
  initialBlurb = null,
  sellerActiveListingCount = 0,
  initialUnlockedBuyers = [],
}: Props) {
  const { setCounts } = useBadgeCounts();
  const [messages, setMessages] = useState(initialMessages);
  const [pendingRequests, setPendingRequests] = useState(initialPendingRequests);
  const [unlockDeal, setUnlockDeal] = useState(initialUnlockDeal);
  const [viewerUnlocked, setViewerUnlocked] = useState(initialViewerUnlocked);
  const [unlockedBuyers, setUnlockedBuyers] = useState(initialUnlockedBuyers);
  const [activeThreadBuyerId, setActiveThreadBuyerId] = useState<string | null>(
    initialUnlockedBuyers[0]?.buyerId ?? null,
  );
  const [creditsPendingSellerReply, setCreditsPendingSellerReply] = useState(
    initialCreditsPendingSellerReply,
  );

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    setMessages((current) => mergeMessages(current, initialMessages));
    setPendingRequests(initialPendingRequests);
    setUnlockDeal(initialUnlockDeal);
    setViewerUnlocked(initialViewerUnlocked);
    setUnlockedBuyers(initialUnlockedBuyers);
    setActiveThreadBuyerId((prev) => {
      if (prev && initialUnlockedBuyers.some((b) => b.buyerId === prev)) return prev;
      return initialUnlockedBuyers[0]?.buyerId ?? null;
    });
    setCreditsPendingSellerReply(initialCreditsPendingSellerReply);
  }, [
    initialMessages,
    initialPendingRequests,
    initialUnlockDeal,
    initialViewerUnlocked,
    initialUnlockedBuyers,
    initialCreditsPendingSellerReply,
  ]);

  const applySnapshot = useCallback(
    (snapshot: ListingActivitySnapshot) => {
      const prev = messagesRef.current;
      // Always merge so optimistic sends don't flash away before the server row appears.
      setMessages((current) => mergeMessages(current, snapshot.messages));

      if (!isOwner && hasNewMessageFrom(prev, snapshot.messages, listing.user_id)) {
        const buyerUpdate = applyBuyerObservedSellerReply();
        setViewerUnlocked(buyerUpdate.viewerUnlocked);
        setCreditsPendingSellerReply(buyerUpdate.creditsPendingSellerReply);
      }

      setPendingRequests(snapshot.pendingRequests);
      setUnlockDeal(snapshot.unlockDeal);
      if (isOwner) {
        setUnlockedBuyers(snapshot.unlockedBuyers);
        if (
          activeThreadBuyerId &&
          !snapshot.unlockedBuyers.some((b) => b.buyerId === activeThreadBuyerId)
        ) {
          setActiveThreadBuyerId(snapshot.unlockedBuyers[0]?.buyerId ?? null);
        }
      } else {
        setViewerUnlocked(snapshot.viewerUnlocked);
        setCreditsPendingSellerReply(snapshot.creditsPendingSellerReply);
      }
    },
    [isOwner, listing.user_id, activeThreadBuyerId],
  );

  const syncActivity = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (isOwner && activeThreadBuyerId) {
        params.set("threadBuyerId", activeThreadBuyerId);
        params.set("dealBuyerId", activeThreadBuyerId);
      }
      const qs = params.toString();
      const res = await fetch(
        `/api/listings/${listing.id}/activity${qs ? `?${qs}` : ""}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const snapshot = (await res.json()) as ListingActivitySnapshot;
      applySnapshot(snapshot);
    } catch {
      /* ignore transient network errors */
    }
  }, [applySnapshot, listing.id, isOwner, activeThreadBuyerId]);

  const shouldPoll =
    isSignedIn &&
    (isOwner || viewerUnlocked) &&
    !unlockDeal?.completedAt;

  useEffect(() => {
    if (!isOwner || !activeThreadBuyerId) return;
    void syncActivity();
  }, [isOwner, activeThreadBuyerId, syncActivity]);

  useEffect(() => {
    if (!shouldPoll) return;

    let intervalId: number | null = null;

    const startPolling = () => {
      if (intervalId) return;
      void syncActivity();
      intervalId = window.setInterval(() => {
        void syncActivity();
      }, 4000);
    };

    const stopPolling = () => {
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startPolling();
      } else {
        stopPolling();
      }
    };

    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [shouldPoll, syncActivity]);

  const handleMessageSent = useCallback((message: ListingMessageRow) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  const handleDealUpdated = useCallback(
    (next: UnlockDeal | null) => {
      setUnlockDeal(next);
      if (!next) {
        if (!isOwner) {
          setViewerUnlocked(false);
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
    (!isOwner && viewerUnlocked) ||
    (isOwner && !!activeThreadBuyerId && unlockedBuyers.length > 0);

  const threadBuyerId = isOwner ? activeThreadBuyerId : currentUserId;

  const dealOptionsEligibility = unlockDeal
    ? computeDealOptionsEligibility({
        isOwner,
        currentUserId,
        sellerId: listing.user_id,
        deal: unlockDeal,
        messages,
      })
    : null;

  const showParticipantSections = isOwner || viewerUnlocked;

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
        <span className="badge badge-lg badge-ghost border-base-300/80 text-base-content/80">
          {formatBindingType(credits)}
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
        initialBlurb={initialBlurb}
      />

      {showParticipantSections ? (
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
          {!isOwner ? (
            <SellerListingLink
              sellerId={listing.user_id}
              sellerName={seller}
              activeListingCount={sellerActiveListingCount}
            />
          ) : (
            <p className="text-sm text-base-content/60 min-w-0">
              Listed by <span className="font-medium text-base-content">@{seller}</span>
            </p>
          )}
          {unlockDeal ? (
            <DealHandoffPanel
              listingId={listing.id}
              currentUserId={currentUserId}
              deal={unlockDeal}
              onDealUpdated={handleDealUpdated}
            />
          ) : null}
        </div>
      ) : !isOwner ? (
        <SellerListingLink
          sellerId={listing.user_id}
          sellerName={seller}
          activeListingCount={sellerActiveListingCount}
        />
      ) : null}

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
          {isOwner ? (
            <ListingBuyerThreadPicker
              buyers={unlockedBuyers.map((b) => ({
                buyerId: b.buyerId,
                handle: b.handle,
                karma: {
                  completedPickups: b.completedPickups,
                  completedSales: b.completedSales,
                  completedSwaps: b.completedSwaps,
                },
              }))}
              activeBuyerId={activeThreadBuyerId}
              onSelect={(buyerId) => {
                setActiveThreadBuyerId(buyerId);
                void syncActivity();
              }}
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
                ) : null
              ) : unlockDeal?.completedAt ? (
                <p className="text-sm text-base-content/60 leading-snug">
                  Deal completed — this listing is archived and hidden from discovery.
                </p>
              ) : !canComposeMessages ? (
                <p className="text-sm text-base-content/60 leading-snug">
                  Messages appear here when a buyer unlocks your listing.
                </p>
              ) : (
                <p className="text-sm text-base-content/60 leading-snug">
                  Each buyer has a private conversation — pick one above to reply.
                </p>
              )}
              {messages.length > 0 || canComposeMessages ? (
                <ListingMessagesThread
                  listingId={listing.id}
                  messages={messages}
                  currentUserId={currentUserId}
                  threadBuyerId={threadBuyerId}
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
          isUnlocked={viewerUnlocked}
          isSignedIn={isSignedIn}
          onUnlocked={() => {
            setViewerUnlocked(true);
            void syncActivity();
          }}
        />
      ) : null}

      <Link href="/app/home" className="btn btn-ghost btn-block">
        Back to discovery
      </Link>
    </div>
  );
}
