"use client";

/**
 * Pickup/contact block: owner edits via server action; unlocked buyers see read-only copy.
 * Location: components/listings/ListingPickupBlock.tsx
 */
import { upsertListingPickupAction } from "@/app/app/listings/private-actions";
import type { ListingPickupRow } from "@/lib/listings/queries";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Props = {
  listingId: string;
  isOwner: boolean;
  initialPickup: ListingPickupRow | null;
};

export function ListingPickupBlock({ listingId, isOwner, initialPickup }: Props) {
  const router = useRouter();
  const [pickup, setPickup] = useState(initialPickup?.pickup_instructions ?? "");
  const [contact, setContact] = useState(initialPickup?.contact_hint ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setPickup(initialPickup?.pickup_instructions ?? "");
    setContact(initialPickup?.contact_hint ?? "");
  }, [
    initialPickup?.listing_id,
    initialPickup?.pickup_instructions,
    initialPickup?.contact_hint,
  ]);

  if (!isOwner) {
    const hasPickup = (initialPickup?.pickup_instructions ?? "").trim().length > 0;
    const hasContact = (initialPickup?.contact_hint ?? "").trim().length > 0;
    if (!hasPickup && !hasContact) {
      return (
        <p className="text-sm text-base-content/60">
          The seller hasn&apos;t added pickup or contact details yet. Use the thread below to
          coordinate.
        </p>
      );
    }
    return (
      <div className="space-y-3 text-sm">
        {hasPickup ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50">
              Pickup
            </p>
            <p className="whitespace-pre-wrap text-base-content">{initialPickup?.pickup_instructions}</p>
          </div>
        ) : null}
        {hasContact ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50">
              Contact
            </p>
            <p className="whitespace-pre-wrap text-base-content">{initialPickup?.contact_hint}</p>
          </div>
        ) : null}
      </div>
    );
  }

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("listing_id", listingId);
    fd.set("pickup_instructions", pickup);
    fd.set("contact_hint", contact);
    startTransition(async () => {
      const res = await upsertListingPickupAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form className="space-y-3" onSubmit={onSave}>
      <label className="form-control w-full">
        <span className="label-text text-sm">Pickup instructions</span>
        <textarea
          className="textarea textarea-bordered min-h-24 w-full text-sm"
          name="pickup_instructions"
          value={pickup}
          onChange={(e) => setPickup(e.target.value)}
          placeholder="Area, landmark, or how handoff works — only visible after unlock."
        />
      </label>
      <label className="form-control w-full">
        <span className="label-text text-sm">Contact hint (optional)</span>
        <input
          type="text"
          className="input input-bordered w-full text-sm"
          name="contact_hint"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="e.g. WhatsApp number, preferred times"
        />
      </label>
      {error ? (
        <div role="alert" className="alert alert-error text-sm py-2">
          {error}
        </div>
      ) : null}
      <button type="submit" className="btn btn-primary btn-sm gap-2" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Save pickup details
      </button>
      <p className="text-xs text-base-content/50">
        Only you and buyers who unlock this listing can see this information.
      </p>
    </form>
  );
}
