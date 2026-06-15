"use client";

/**
 * Save heart for listing cards — inline beside location; instant toggle, queued sync.
 * Location: components/listings/ListingCardSaveHeart.tsx
 */
import { syncSaveListing } from "@/lib/client/syncSaveListing";
import { Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  listingId: string;
  initiallySaved: boolean;
  /** Smaller icon on compact home cards. */
  compact?: boolean;
};

export function ListingCardSaveHeart({
  listingId,
  initiallySaved,
  compact = false,
}: Props) {
  const [saved, setSaved] = useState(initiallySaved);
  const savedRef = useRef(initiallySaved);
  const syncQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    savedRef.current = initiallySaved;
    setSaved(initiallySaved);
  }, [listingId, initiallySaved]);

  function onToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const target = !savedRef.current;
    savedRef.current = target;
    setSaved(target);

    syncQueueRef.current = syncQueueRef.current.then(async () => {
      const res = await syncSaveListing(listingId, target);
      if (!res.ok) {
        if (savedRef.current === target) {
          const reverted = !target;
          savedRef.current = reverted;
          setSaved(reverted);
        }
        return;
      }
      savedRef.current = res.saved;
      setSaved(res.saved);
    });
  }

  const iconClass = compact ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <button
      type="button"
      onClick={onToggle}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={`btn btn-ghost shrink-0 min-h-0 h-auto border-0 bg-transparent p-0 shadow-none hover:bg-transparent ${
        saved ? "text-error hover:text-error" : "text-base-content/35 hover:text-base-content/55"
      }`}
      aria-label={saved ? "Remove from saved" : "Save listing"}
      aria-pressed={saved}
    >
      <Heart
        className={iconClass}
        strokeWidth={saved ? 2 : 1.75}
        fill={saved ? "currentColor" : "none"}
        aria-hidden
      />
    </button>
  );
}
