"use client";

/**
 * Save (heart) on listing detail — instant toggle, no full-page refresh.
 * Location: components/listings/ListingSaveHeart.tsx
 */
import { setSaveListingAction } from "@/app/app/saves/actions";
import { Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  listingId: string;
  initiallySaved: boolean;
};

export function ListingSaveHeart({ listingId, initiallySaved }: Props) {
  const [saved, setSaved] = useState(initiallySaved);
  const [error, setError] = useState<string | null>(null);
  const savedRef = useRef(initiallySaved);
  const syncQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    savedRef.current = initiallySaved;
    setSaved(initiallySaved);
  }, [listingId, initiallySaved]);

  function onToggle() {
    setError(null);
    const target = !savedRef.current;
    savedRef.current = target;
    setSaved(target);

    syncQueueRef.current = syncQueueRef.current.then(async () => {
      const res = await setSaveListingAction(listingId, target);
      if (!res.ok) {
        if (savedRef.current === target) {
          const reverted = !target;
          savedRef.current = reverted;
          setSaved(reverted);
          setError("Could not update saved.");
        }
        return;
      }
      savedRef.current = res.saved;
      setSaved(res.saved);
    });
  }

  return (
    <div className="flex flex-col items-center gap-1 sm:items-end">
      <button
        type="button"
        onClick={() => onToggle()}
        className={`btn btn-circle btn-ghost h-11 w-11 min-h-11 min-w-11 border ${
          saved
            ? "border-red-200/90 bg-red-50/95 text-red-600 hover:bg-red-100"
            : "border-base-300/60 text-base-content/45 hover:border-base-300 hover:text-base-content/70"
        }`}
        aria-label={saved ? "Remove from saved" : "Save listing"}
        aria-pressed={saved}
      >
        <Heart
          className="h-6 w-6"
          strokeWidth={saved ? 2 : 1.75}
          fill={saved ? "currentColor" : "none"}
          aria-hidden
        />
      </button>
      {error ? (
        <span className="text-[10px] text-error max-w-[8rem] text-center sm:text-right leading-tight">
          {error}
        </span>
      ) : null}
    </div>
  );
}
