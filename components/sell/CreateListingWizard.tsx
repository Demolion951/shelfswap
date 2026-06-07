"use client";

/**
 * Two-step listing flow: ISBN lookup (Open Library cover), optional photos, then condition/credits.
 * Listing rough location is copied from the seller profile on post (no per-listing location UI).
 * Location: components/sell/CreateListingWizard.tsx
 */
import { createListing, updateListing } from "@/app/app/sell/actions";
import { lookupIsbnAction } from "@/app/app/sell/lookup-action";
import { isLikelyImageFile } from "@/lib/client/compressListingPhoto";
import { uploadListingPhotos } from "@/lib/client/uploadListingPhotos";
import { BarcodeScannerModal } from "@/components/sell/BarcodeScannerModal";
import { CatalogueCoverPreview } from "@/components/sell/CatalogueCoverPreview";
import {
  ArrowLeft,
  ArrowRight,
  Barcode,
  BookMarked,
  Camera,
  Images,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

const STEPS = ["Book", "Details"] as const;
const CONDITIONS = new Set(["new", "like_new", "good", "acceptable"]);
const MAX_LISTING_PHOTOS = 8;

/** Prefill when editing an existing listing (server-loaded). */
export type EditListingInitial = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  cover_url: string | null;
  condition: string;
  unlock_credits: 1 | 2;
  open_to_swaps: boolean;
  description: string | null;
  photos: { id: string; url: string; sort: number }[];
};

type WizardProps = {
  editListing?: EditListingInitial | null;
};

export function CreateListingWizard({ editListing = null }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [uploadLabel, setUploadLabel] = useState<string | null>(null);
  const [lookupPending, setLookupPending] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isbnInput, setIsbnInput] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  type Photo = { file: File; url: string };
  const [photos, setPhotos] = useState<Photo[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [condition, setCondition] = useState<string>("good");
  const [unlockCredits, setUnlockCredits] = useState<1 | 2>(1);
  const [openToSwaps, setOpenToSwaps] = useState(false);
  const [description, setDescription] = useState("");
  const [existingServerPhotos, setExistingServerPhotos] = useState<{ id: string; url: string }[]>(
    [],
  );

  useEffect(() => {
    if (!editListing) return;
    setTitle(editListing.title);
    setAuthor(editListing.author ?? "");
    setIsbnInput(editListing.isbn?.replace(/\D/g, "") ?? "");
    setCoverUrl(editListing.cover_url ?? "");
    setCondition(CONDITIONS.has(editListing.condition) ? editListing.condition : "good");
    setUnlockCredits(editListing.unlock_credits === 2 ? 2 : 1);
    setOpenToSwaps(editListing.open_to_swaps);
    setDescription(editListing.description ?? "");
    setExistingServerPhotos(
      [...editListing.photos].sort((a, b) => a.sort - b.sort).map((p) => ({ id: p.id, url: p.url })),
    );
  }, [editListing]);

  async function runLookup(overrideIsbn?: string) {
    setError(null);
    setLookupPending(true);
    const raw = overrideIsbn ?? isbnInput;
    try {
      const res = await lookupIsbnAction(raw);
      if (res) {
        setManualEntry(false);
        setTitle(res.title);
        setAuthor(res.author ?? "");
        setCoverUrl(res.coverUrl ?? "");
        setIsbnInput(res.isbn);
      } else {
        setManualEntry(true);
        setTitle("");
        setAuthor("");
        setCoverUrl("");
        setError(
          "We couldn't find this ISBN. Please enter the details below to list the book.",
        );
      }
    } finally {
      setLookupPending(false);
    }
  }

  function onPickPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const next = [...photos];
    for (let i = 0; i < files.length; i++) {
      if (next.length >= MAX_LISTING_PHOTOS) {
        setError(`You can add up to ${MAX_LISTING_PHOTOS} photos per listing.`);
        break;
      }
      const f = files[i];
      if (isLikelyImageFile(f)) {
        if (f.size > 12 * 1024 * 1024) {
          setError("That photo is too large. Please pick a smaller image.");
          continue;
        }
        next.push({ file: f, url: URL.createObjectURL(f) });
      }
    }
    setPhotos(next);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }

  function removePhoto(i: number) {
    setPhotos((p) => {
      const copy = [...p];
      const [removed] = copy.splice(i, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      return copy;
    });
  }

  function canAdvance() {
    if (step === 0) return title.trim().length > 0;
    if (step === 1) {
      return condition.length > 0 && (unlockCredits === 1 || unlockCredits === 2);
    }
    return false;
  }

  function submit() {
    setError(null);
    setUploadLabel(null);
    const photoFiles = photos.map((p) => p.file);
    if (editListing && existingServerPhotos.length + photoFiles.length > MAX_LISTING_PHOTOS) {
      setError(`You can have up to ${MAX_LISTING_PHOTOS} photos per listing.`);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("author", author.trim());
      fd.append("isbn", isbnInput.replace(/\D/g, ""));
      fd.append("cover_url", coverUrl);
      fd.append("description", description);
      fd.append("condition", condition);
      fd.append("unlock_credits", String(unlockCredits));
      if (openToSwaps) fd.append("open_to_swaps", "on");
      fd.append("use_profile_area", "on");

      if (editListing) {
        fd.append("listing_id", editListing.id);
        const res = await updateListing(fd);
        if ("error" in res) {
          setError(res.error);
          return;
        }
        if (photoFiles.length > 0) {
          const sortStart = existingServerPhotos.length;
          const up = await uploadListingPhotos(
            res.listingId,
            photoFiles,
            sortStart,
            (current, total) => setUploadLabel(`Uploading photo ${current} of ${total}…`),
          );
          setUploadLabel(null);
          if (!up.ok) {
            setError(
              up.uploaded > 0
                ? `${up.uploaded} photo(s) saved. Photo ${up.uploaded + 1} failed: ${up.error} Open the listing to try again.`
                : `Listing saved but photos failed: ${up.error}`,
            );
            router.push(`/app/listings/${res.listingId}`);
            return;
          }
        }
        router.push(`/app/listings/${res.listingId}`);
        return;
      }

      const res = await createListing(fd);
      if ("error" in res) {
        setError(res.error);
        return;
      }

      if (photoFiles.length > 0) {
        const up = await uploadListingPhotos(
          res.listingId,
          photoFiles,
          0,
          (current, total) => setUploadLabel(`Uploading photo ${current} of ${total}…`),
        );
        setUploadLabel(null);
        if (!up.ok) {
          setError(
            up.uploaded > 0
              ? `Listing posted with ${up.uploaded} photo(s). Photo ${up.uploaded + 1} failed: ${up.error} You can add more from your listing.`
              : `Listing posted but photos failed: ${up.error} You can add photos from your listing.`,
          );
          router.push(`/app/listings/${res.listingId}`);
          return;
        }
      }

      router.push(`/app/listings/${res.listingId}`);
    });
  }

  function renderPhotoSection(emphasizeUpload = false) {
    return (
      <div className="border-t border-base-300/40 pt-4 space-y-3">
        <p className="text-sm font-medium text-base-content">
          {emphasizeUpload ? "Photos of your copy" : "Optional: photos of your copy"}
        </p>
        {emphasizeUpload ? (
          <p className="text-xs text-base-content/55">
            Add at least one photo so buyers can see the edition and condition you&apos;re listing.
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            className="btn btn-outline border-primary/30 btn-sm gap-2"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-4 w-4 shrink-0" aria-hidden />
            Take photo
          </button>
          <button
            type="button"
            className="btn btn-outline border-primary/30 btn-sm gap-2"
            onClick={() => galleryInputRef.current?.click()}
          >
            <Images className="h-4 w-4 shrink-0" aria-hidden />
            From gallery
          </button>
        </div>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => onPickPhotos(e.target.files)}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => onPickPhotos(e.target.files)}
        />
        {photos.length > 0 ? (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p, i) => (
              <li key={p.url} className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt=""
                  className="h-full w-full rounded-lg object-cover border border-base-300"
                />
                <button
                  type="button"
                  className="btn btn-circle btn-xs btn-error absolute -right-1 -top-1"
                  onClick={() => removePhoto(i)}
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {existingServerPhotos.length > 0 ? (
          <div className="space-y-2 border-t border-base-300/40 pt-4">
            <p className="text-xs font-medium text-base-content/70">Photos on this listing</p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {existingServerPhotos.map((p) => (
                <li key={p.id} className="aspect-square overflow-hidden rounded-lg border border-base-300/80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-base-content/50">
              Add more photos below; existing ones stay on the listing.
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ul className="steps steps-horizontal w-full text-xs sm:text-sm">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`step ${i <= step ? "step-primary" : ""}`}
            data-content={i + 1}
          >
            {label}
          </li>
        ))}
      </ul>

      {error ? (
        <div role="alert" className="alert alert-warning text-sm">
          {error}
        </div>
      ) : null}
      {uploadLabel ? (
        <div role="status" className="alert alert-info text-sm py-2">
          {uploadLabel}
        </div>
      ) : null}

      {step === 0 ? (
        <div className="card bg-base-100 border border-base-300/80 shadow-sm">
          <div className="card-body gap-4">
            {editListing ? (
              <div className="rounded-lg border border-secondary/25 bg-secondary/5 px-3 py-2 text-sm text-base-content/80">
                Editing your listing — changes apply when you save on the last step.
              </div>
            ) : null}
            <div className="flex items-center gap-2 text-primary">
              <BookMarked className="h-5 w-5" aria-hidden />
              <h2 className="shelfswap-heading text-lg font-semibold">Find your book</h2>
            </div>
            <button
              type="button"
              className="btn btn-outline border-primary/40 btn-primary w-full gap-2"
              onClick={() => setScanOpen(true)}
            >
              <Barcode className="h-5 w-5" aria-hidden />
              Scan barcode with camera
            </button>
            <label className="form-control">
              <span className="label-text text-sm">ISBN (10 or 13 digits)</span>
              <div className="join w-full">
                <input
                  className="input input-bordered join-item flex-1 font-mono text-sm"
                  value={isbnInput}
                  onChange={(e) => setIsbnInput(e.target.value)}
                  placeholder="978…"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  className="btn btn-primary join-item"
                  disabled={lookupPending}
                  onClick={() => void runLookup()}
                >
                  {lookupPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  ) : (
                    "Look up"
                  )}
                </button>
              </div>
            </label>
            {title && !manualEntry ? (
              <div className="rounded-xl border border-success/25 bg-success/5 p-4 space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-success">
                    Book found
                  </p>
                  <p className="shelfswap-heading text-base font-semibold leading-snug">{title}</p>
                  {author ? (
                    <p className="text-sm text-base-content/70">{author}</p>
                  ) : null}
                </div>
                {coverUrl ? (
                  <div className="flex justify-center sm:justify-start">
                    <div className="shrink-0 overflow-hidden rounded-lg border border-base-300/70 bg-base-100 shadow-sm">
                      <CatalogueCoverPreview
                        initialSrc={coverUrl}
                        isbnDigits={isbnInput}
                        className="mx-auto block h-44 w-[7.25rem] object-cover sm:h-52 sm:w-[8.25rem]"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-base-content/55">
                    No catalogue cover for this ISBN — add photos of your copy below.
                  </p>
                )}
                {renderPhotoSection(!coverUrl)}
              </div>
            ) : manualEntry ? (
              <div className="rounded-xl border border-base-300/80 bg-base-100 p-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Enter book details
                </p>
                <label className="form-control">
                  <span className="label-text text-sm">Title</span>
                  <input
                    className="input input-bordered w-full"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Book title"
                    required
                  />
                </label>
                <label className="form-control">
                  <span className="label-text text-sm">Author</span>
                  <input
                    className="input input-bordered w-full"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Author name"
                  />
                </label>
                <label className="form-control">
                  <span className="label-text text-sm">ISBN (optional)</span>
                  <input
                    className="input input-bordered w-full font-mono text-sm"
                    value={isbnInput}
                    onChange={(e) => setIsbnInput(e.target.value)}
                    placeholder="978…"
                    inputMode="numeric"
                  />
                </label>
                {renderPhotoSection(true)}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="card bg-base-100 border border-base-300/80 shadow-sm">
          <div className="card-body gap-4">
            <h2 className="shelfswap-heading text-lg font-semibold text-primary">
              Condition & credits
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,20rem)] sm:items-center sm:gap-x-5">
                <span className="text-sm font-medium text-base-content sm:text-end">
                  Condition
                </span>
                <select
                  className="select select-bordered w-full"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  aria-label="Book condition"
                >
                  <option value="new">New</option>
                  <option value="like_new">Like new</option>
                  <option value="good">Good</option>
                  <option value="acceptable">Acceptable</option>
                </select>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,20rem)] sm:items-start sm:gap-x-5">
                <span className="text-sm font-medium text-base-content pt-0.5 sm:pt-2.5 sm:text-end">
                  Credits to unlock
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <select
                    className="select select-bordered w-full"
                    value={String(unlockCredits)}
                    onChange={(e) =>
                      setUnlockCredits(e.target.value === "2" ? 2 : 1)
                    }
                    aria-label="Credits required to unlock this listing"
                  >
                    <option value="1">1 credit</option>
                    <option value="2">2 credits</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,11rem)_minmax(0,20rem)] sm:items-center sm:gap-x-5">
                <span className="hidden sm:block" aria-hidden />
                <label className="label cursor-pointer justify-start gap-3 py-0">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={openToSwaps}
                    onChange={(e) => setOpenToSwaps(e.target.checked)}
                  />
                  <span className="label-text text-sm">Open to swaps</span>
                </label>
              </div>
            </div>
            <label className="form-control w-full">
              <span className="label-text text-sm">Description (optional)</span>
              <textarea
                className="textarea textarea-bordered h-24 w-full text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Edition notes, condition details…"
              />
            </label>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        {step > 0 ? (
          <button
            type="button"
            className="btn btn-ghost gap-1"
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>
        ) : (
          <span />
        )}
        {step < 1 ? (
          <button
            type="button"
            className="btn btn-primary ml-auto gap-1"
            disabled={!canAdvance()}
            onClick={() => setStep((s) => s + 1)}
          >
            Next
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary ml-auto min-w-[8rem]"
            disabled={!canAdvance() || pending || !!uploadLabel}
            onClick={() => submit()}
          >
            {pending || uploadLabel ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : editListing ? (
              "Save changes"
            ) : (
              "Post listing"
            )}
          </button>
        )}
      </div>

      <BarcodeScannerModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onIsbn={(isbn) => {
          setIsbnInput(isbn);
          void runLookup(isbn);
        }}
      />
    </div>
  );
}
