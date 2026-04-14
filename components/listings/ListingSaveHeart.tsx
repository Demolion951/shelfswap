"use client";

/**
 * Standalone save control (heart) for listing detail when the unlock panel is hidden (e.g. after unlock).
 * Location: components/listings/ListingSaveHeart.tsx
 */
import { toggleSaveListingAction } from "@/app/app/saves/actions";
import { Heart, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Props = {
  listingId: string;
  initiallySaved: boolean;
};

export function ListingSaveHeart({ listingId, initiallySaved }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSaved(initiallySaved);
  }, [initiallySaved]);

  function onToggle() {
    setError(null);
    startTransition(async () => {
      const res = await toggleSaveListingAction(listingId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(res.saved);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => onToggle()}
        disabled={pending}
        className={`btn btn-circle btn-ghost btn-sm border border-base-300/50 ${
          saved ? "border-red-200/80 bg-red-50/90 text-red-600 hover:bg-red-100" : "text-base-content/50"
        }`}
        aria-label={saved ? "Remove from saved" : "Save listing"}
        aria-pressed={saved}
      >
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <Heart
            className="h-5 w-5"
            strokeWidth={saved ? 2 : 1.75}
            fill={saved ? "currentColor" : "none"}
            aria-hidden
          />
        )}
      </button>
      {error ? <span className="text-[10px] text-error max-w-[10rem] text-right">{error}</span> : null}
    </div>
  );
}
