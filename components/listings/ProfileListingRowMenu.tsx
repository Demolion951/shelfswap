"use client";

/**
 * Overflow menu for the seller’s listing row: edit (wizard) and delete with confirmation.
 * Location: components/listings/ProfileListingRowMenu.tsx
 */
import { deleteMyListing } from "@/app/app/sell/actions";
import { Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

type Props = {
  listingId: string;
};

export function ProfileListingRowMenu({ listingId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function openConfirm() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function closeConfirm() {
    dialogRef.current?.close();
  }

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteMyListing(listingId);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      closeConfirm();
      router.refresh();
    });
  }

  return (
    <>
      <div className="dropdown dropdown-end absolute right-1 top-1 z-10">
        <label
          tabIndex={0}
          className="btn btn-ghost btn-circle btn-sm bg-base-100/80 shadow-sm border border-base-300/60"
          aria-label="Listing actions"
        >
          <MoreVertical className="h-4 w-4" aria-hidden />
        </label>
        <ul
          tabIndex={0}
          className="dropdown-content menu z-[20] mt-1 w-44 rounded-box border border-base-300/80 bg-base-100 p-1 shadow-lg"
        >
          <li>
            <Link
              href={`/app/sell/edit/${listingId}`}
              className="gap-2 text-sm"
              onClick={() => {
                const el = document.activeElement as HTMLElement | null;
                el?.blur();
              }}
            >
              <Pencil className="h-4 w-4 shrink-0" aria-hidden />
              Edit
            </Link>
          </li>
          <li>
            <button type="button" className="gap-2 text-sm text-error" onClick={() => openConfirm()}>
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
              Delete
            </button>
          </li>
        </ul>
      </div>

      <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <h2 className="shelfswap-heading text-lg font-semibold">Delete this listing?</h2>
          <p className="py-3 text-sm text-base-content/70">
            This removes the book from ShelfSwap and closes any open chats. Buyers will be
            notified.
          </p>
          {error ? (
            <div role="alert" className="alert alert-error text-sm py-2 mb-2">
              {error}
            </div>
          ) : null}
          <div className="modal-action">
            <form method="dialog">
              <button type="submit" className="btn btn-ghost">
                Cancel
              </button>
            </form>
            <button type="button" className="btn btn-error gap-2" disabled={pending} onClick={() => onDelete()}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Delete
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
