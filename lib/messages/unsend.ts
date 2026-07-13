/**
 * Unsend window and helpers for listing chat messages.
 * Location: lib/messages/unsend.ts
 */
import type { ListingMessageRow } from "@/lib/listings/queries";

/** Must match `delete_listing_message` in database/migrations/20260606_listing_message_unsend.sql */
export const MESSAGE_UNSEND_MINUTES = 30;

export function isListingMessageDeleted(message: ListingMessageRow): boolean {
  return message.deleted_at != null && message.deleted_at.length > 0;
}

export function canUnsendListingMessage(
  message: ListingMessageRow,
  currentUserId: string | null,
  windowMinutes = MESSAGE_UNSEND_MINUTES,
): boolean {
  if (!currentUserId || message.sender_id !== currentUserId) return false;
  if (isListingMessageDeleted(message)) return false;
  if (message.id.startsWith("optimistic-")) return false;
  const ageMs = Date.now() - new Date(message.created_at).getTime();
  return ageMs >= 0 && ageMs <= windowMinutes * 60 * 1000;
}

export function unsendWindowRemainingMs(
  message: ListingMessageRow,
  windowMinutes = MESSAGE_UNSEND_MINUTES,
): number {
  const expiresAt =
    new Date(message.created_at).getTime() + windowMinutes * 60 * 1000;
  return Math.max(0, expiresAt - Date.now());
}
