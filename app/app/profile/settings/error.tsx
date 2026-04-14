"use client";

/**
 * Settings route error boundary — avoids a blank Vercel error shell when something throws during render.
 * Location: app/app/profile/settings/error.tsx
 */
import { useEffect } from "react";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SettingsError]", error.message, error.digest);
  }, [error]);

  return (
    <div className="space-y-4 pt-4 text-center">
      <h1 className="shelfswap-heading text-lg font-semibold text-base-content">Settings couldn&apos;t load</h1>
      <p className="text-sm text-base-content/65">
        Something went wrong on the server. Try again, or open Profile and use &quot;App settings&quot; after a refresh.
      </p>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
