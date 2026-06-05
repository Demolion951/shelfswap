"use client";

/**
 * Save heart for listing cards — inline beside location, no circular chrome.
 * Location: components/listings/ListingCardSaveHeart.tsx
 */
import { toggleSaveListingAction } from "@/app/app/saves/actions";
import { Heart, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

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
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSaved(initiallySaved);
  }, [initiallySaved]);

  function onToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const res = await toggleSaveListingAction(listingId);
      if (!res.ok) return;
      setSaved(res.saved);
      router.refresh();
    });
  }

  const iconClass = compact ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      className={`btn btn-ghost shrink-0 min-h-0 h-auto border-0 bg-transparent p-0 shadow-none hover:bg-transparent ${
        saved ? "text-error hover:text-error" : "text-base-content/35 hover:text-base-content/55"
      }`}
      aria-label={saved ? "Remove from saved" : "Save listing"}
      aria-pressed={saved}
    >
      {pending ? (
        <Loader2 className={`${iconClass} animate-spin`} aria-hidden />
      ) : (
        <Heart
          className={iconClass}
          strokeWidth={saved ? 2 : 1.75}
          fill={saved ? "currentColor" : "none"}
          aria-hidden
        />
      )}
    </button>
  );
}
