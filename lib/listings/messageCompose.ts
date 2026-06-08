import type { ListingMessageRow } from "@/lib/listings/queries";

/**
 * Whether the listing owner may compose messages (requires a buyer in the thread).
 * Location: lib/listings/messageCompose.ts
 */
export function sellerCanComposeMessages(
  sellerId: string,
  messages: ListingMessageRow[],
  opts: {
    pendingUnlockCount: number;
    hasActiveUnlock: boolean;
  },
): boolean {
  if (opts.pendingUnlockCount > 0 || opts.hasActiveUnlock) return true;
  return messages.some((m) => m.sender_id !== sellerId);
}
