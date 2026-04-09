/**
 * Detects PostgREST/Supabase errors when listings.unlock_credits is missing from DB/schema cache.
 * Apply database/migrations/20260410_listing_unlock_credits.sql (or the block in phase1 core).
 * Location: lib/listings/unlockCreditsPostgrest.ts
 */
export function isUnlockCreditsColumnMissing(message: string | undefined): boolean {
  if (!message?.includes("unlock_credits")) return false;
  return (
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("Could not find")
  );
}
