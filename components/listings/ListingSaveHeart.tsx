"use client";

/**
 * Save (heart) control for listing detail: placed beside the title for visibility.
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
    <div className="flex flex-col items-center gap-1 sm:items-end">
      <button
        type="button"
        onClick={() => onToggle()}
        disabled={pending}
        className={`btn btn-circle btn-ghost h-11 w-11 min-h-11 min-w-11 border ${
          saved
            ? "border-red-200/90 bg-red-50/95 text-red-600 hover:bg-red-100"
            : "border-base-300/60 text-base-content/45 hover:border-base-300 hover:text-base-content/70"
        }`}
        aria-label={saved ? "Remove from saved" : "Save listing"}
        aria-pressed={saved}
      >
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <Heart
            className="h-6 w-6"
            strokeWidth={saved ? 2 : 1.75}
            fill={saved ? "currentColor" : "none"}
            aria-hidden
          />
        )}
      </button>
      {error ? (
        <span className="text-[10px] text-error max-w-[8rem] text-center sm:text-right leading-tight">
          {error}
        </span>
      ) : null}
    </div>
  );
}
