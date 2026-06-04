"use client";

/**
 * Small save heart for listing cards (home/browse feeds). Stops link navigation on tap.
 * Location: components/listings/ListingCardSaveHeart.tsx
 */
import { toggleSaveListingAction } from "@/app/app/saves/actions";
import { Heart, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Props = {
  listingId: string;
  initiallySaved: boolean;
};

export function ListingCardSaveHeart({ listingId, initiallySaved }: Props) {
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

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      className={`absolute top-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition ${
        saved
          ? "border-red-200/90 bg-red-50/95 text-red-600 hover:bg-red-100"
          : "border-base-300/50 bg-base-100/90 text-base-content/50 hover:border-base-300 hover:text-base-content/75"
      }`}
      aria-label={saved ? "Remove from saved" : "Save listing"}
      aria-pressed={saved}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Heart
          className="h-3.5 w-3.5"
          strokeWidth={saved ? 2 : 1.75}
          fill={saved ? "currentColor" : "none"}
          aria-hidden
        />
      )}
    </button>
  );
}
