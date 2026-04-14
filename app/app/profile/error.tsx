"use client";

/**
 * Profile subtree error boundary (profile, listings, saved).
 * Location: app/app/profile/error.tsx
 */
import { useEffect } from "react";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ProfileError]", error.message, error.digest);
  }, [error]);

  return (
    <div className="space-y-4 pt-4 text-center">
      <h1 className="shelfswap-heading text-lg font-semibold text-base-content">This section couldn&apos;t load</h1>
      <p className="text-sm text-base-content/65">
        A server error occurred. Try again, or go back to Home and return to Profile.
      </p>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
