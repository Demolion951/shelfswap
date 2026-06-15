/**
 * Deal option eligibility (withdraw, mutual cancel, stalled exits) for listing detail UI.
 * Location: lib/listings/dealOptions.ts
 */
import type { ListingMessageRow } from "@/lib/listings/queries";

export const DEAL_WITHDRAW_HOURS = 48;
export const DEAL_STALL_DAYS = 14;

export type DealOptionsEligibility = {
  canWithdraw: boolean;
  canRequestMutualCancel: boolean;
  mutualCancelWaitingOnOther: boolean;
  canSellerRelistStalled: boolean;
  canBuyerCloseStalled: boolean;
  canReportProblem: boolean;
};

type Input = {
  isOwner: boolean;
  currentUserId: string | null;
  sellerId: string;
  deal: {
    buyerId: string;
    completedAt: string | null;
    unlockCreatedAt: string | null;
    buyerMutualCancelAt: string | null;
    sellerMutualCancelAt: string | null;
  } | null;
  messages: ListingMessageRow[];
};

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

function lastMessageAt(messages: ListingMessageRow[], userId: string): string | null {
  let latest: string | null = null;
  for (const m of messages) {
    if (m.sender_id !== userId) continue;
    if (!latest || m.created_at > latest) latest = m.created_at;
  }
  return latest;
}

function sellerHasReplied(messages: ListingMessageRow[], sellerId: string): boolean {
  return messages.some((m) => m.sender_id === sellerId);
}

export function computeDealOptionsEligibility(input: Input): DealOptionsEligibility {
  const none: DealOptionsEligibility = {
    canWithdraw: false,
    canRequestMutualCancel: false,
    mutualCancelWaitingOnOther: false,
    canSellerRelistStalled: false,
    canBuyerCloseStalled: false,
    canReportProblem: false,
  };

  const { deal, currentUserId, isOwner, sellerId, messages } = input;
  if (!deal || !currentUserId || deal.completedAt) return none;

  const isBuyer = currentUserId === deal.buyerId;
  const isParticipant = isBuyer || isOwner;
  if (!isParticipant) return none;

  const sellerReplied = sellerHasReplied(messages, sellerId);
  const createdAt = deal.unlockCreatedAt;
  const withinWithdrawWindow = createdAt != null && hoursSince(createdAt) <= DEAL_WITHDRAW_HOURS;

  const canWithdraw =
    isBuyer && !sellerReplied && withinWithdrawWindow;

  const iRequestedCancel = isBuyer
    ? !!deal.buyerMutualCancelAt
    : !!deal.sellerMutualCancelAt;
  const otherRequestedCancel = isBuyer
    ? !!deal.sellerMutualCancelAt
    : !!deal.buyerMutualCancelAt;

  const canRequestMutualCancel = !iRequestedCancel;
  const mutualCancelWaitingOnOther = iRequestedCancel && !otherRequestedCancel;

  const buyerHasMessaged = messages.some((m) => m.sender_id === deal.buyerId);
  const lastBuyerMsg = lastMessageAt(messages, deal.buyerId);
  const lastSellerMsg = lastMessageAt(messages, sellerId);

  const buyerInactive =
    sellerReplied &&
    (lastBuyerMsg == null
      ? createdAt != null && daysSince(createdAt) >= DEAL_STALL_DAYS
      : daysSince(lastBuyerMsg) >= DEAL_STALL_DAYS);

  const sellerInactive =
    sellerReplied &&
    lastSellerMsg != null &&
    daysSince(lastSellerMsg) >= DEAL_STALL_DAYS;

  return {
    canWithdraw,
    canRequestMutualCancel,
    mutualCancelWaitingOnOther,
    canSellerRelistStalled: isOwner && buyerInactive,
    canBuyerCloseStalled: isBuyer && sellerInactive && buyerHasMessaged,
    canReportProblem: true,
  };
}
