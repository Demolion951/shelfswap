"use client";

/**
 * Two-step listing flow: ISBN lookup (Open Library cover), optional photos, then condition/credits.
 * Approximate listing area comes from device/profile geo on the server, not a manual town field.
 * Location: components/sell/CreateListingWizard.tsx
 */
import { createListing } from "@/app/app/sell/actions";
import { lookupIsbnAction } from "@/app/app/sell/lookup-action";
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
  MapPin,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

const STEPS = ["Book", "Details"] as const;

export function CreateListingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [lookupPending, setLookupPending] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
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
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [contactHint, setContactHint] = useState("");
  /** When true, skip device prompt on post and only use Profile rough area (if saved). */
  const [profileOnlyForListingGeo, setProfileOnlyForListingGeo] = useState(false);
  const [listingGeo, setListingGeo] = useState<{ lat: number; lng: number } | null>(null);

  async function runLookup(overrideIsbn?: string) {
    setError(null);
    setLookupPending(true);
    const raw = overrideIsbn ?? isbnInput;
    try {
      const res = await lookupIsbnAction(raw);
      if (res) {
        setTitle(res.title);
        setAuthor(res.author ?? "");
        setCoverUrl(res.coverUrl ?? "");
        setIsbnInput(res.isbn);
      } else {
        setTitle("");
        setAuthor("");
        setCoverUrl("");
        setError(
          "We couldn’t find this ISBN in Open Library. Try scanning again or a different copy.",
        );
      }
    } finally {
      setLookupPending(false);
    }
  }

  function onPickPhotos(files: FileList | null) {
    if (!files?.length) return;
    const next = [...photos];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.type.startsWith("image/")) {
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
    startTransition(async () => {
      let lat: number | undefined;
      let lng: number | undefined;
      if (listingGeo) {
        lat = listingGeo.lat;
        lng = listingGeo.lng;
      } else if (!profileOnlyForListingGeo && typeof navigator !== "undefined" && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (p) => resolve(p),
            () => resolve(null),
            { enableHighAccuracy: false, maximumAge: 600_000, timeout: 12_000 },
          );
        });
        if (pos) {
          lat = Math.round(pos.coords.latitude * 100) / 100;
          lng = Math.round(pos.coords.longitude * 100) / 100;
        }
      }

      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("author", author.trim());
      fd.append("isbn", isbnInput.replace(/\D/g, ""));
      fd.append("cover_url", coverUrl);
      fd.append("description", description);
      fd.append("pickup_instructions", pickupInstructions);
      fd.append("contact_hint", contactHint);
      fd.append("condition", condition);
      fd.append("unlock_credits", String(unlockCredits));
      if (openToSwaps) fd.append("open_to_swaps", "on");
      if (lat !== undefined && lng !== undefined) {
        fd.append("approx_lat", String(lat));
        fd.append("approx_lng", String(lng));
      } else {
        fd.append("use_profile_area", "on");
      }
      photos.forEach((p) => fd.append("photos", p.file));

      const res = await createListing(fd);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.push(`/app/listings/${res.listingId}`);
    });
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

      {step === 0 ? (
        <div className="card bg-base-100 border border-base-300/80 shadow-sm">
          <div className="card-body gap-4">
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
            {title ? (
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
                    No cover image for this ISBN — you can add photos below.
                  </p>
                )}
                <div className="border-t border-base-300/40 pt-4 space-y-3">
                  <p className="text-sm font-medium text-base-content">
                    Optional: photos of your copy
                  </p>
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
                </div>
              </div>
            ) : (
              <p className="text-center text-xs text-base-content/50">
                Scan or look up an ISBN to load title and author automatically.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="card bg-base-100 border border-base-300/80 shadow-sm">
          <div className="card-body gap-4">
            <h2 className="shelfswap-heading text-lg font-semibold text-primary">
              Condition & credits
            </h2>
            <p className="text-sm text-base-content/65">
              Buyers use credits to unlock your listing (location + chat). There is no cash price
              on the book — only how many credits it costs to unlock.
            </p>
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
                  <p className="text-xs text-base-content/50 leading-snug">
                    You can change the rules later; for now pick 1 or 2.
                  </p>
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
            <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 space-y-3">
              <p className="text-sm font-medium text-base-content">Pickup &amp; contact (optional)</p>
              <label className="form-control w-full">
                <span className="label-text text-sm">Pickup instructions (optional)</span>
                <textarea
                  className="textarea textarea-bordered min-h-20 w-full text-sm"
                  value={pickupInstructions}
                  onChange={(e) => setPickupInstructions(e.target.value)}
                  placeholder="How handoff works, shelf pickup…"
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text text-sm">Contact hint (optional)</span>
                <input
                  type="text"
                  className="input input-bordered w-full text-sm"
                  value={contactHint}
                  onChange={(e) => setContactHint(e.target.value)}
                  placeholder="e.g. WhatsApp, preferred times"
                />
              </label>
            </div>
            <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-3 space-y-3">
              <div className="flex items-center gap-2 text-secondary">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                <p className="text-sm font-medium">Rough location</p>
              </div>
              {listingGeo ? (
                <p className="text-xs text-base-content/80">
                  Using the point you set here for this listing.
                  <button
                    type="button"
                    className="link link-secondary ml-2 align-baseline"
                    onClick={() => setListingGeo(null)}
                  >
                    Clear
                  </button>
                </p>
              ) : null}
              <label className="label cursor-pointer justify-start gap-3 py-0">
                <input
                  type="checkbox"
                  className="checkbox checkbox-secondary checkbox-sm"
                  checked={profileOnlyForListingGeo && !listingGeo}
                  disabled={!!listingGeo}
                  onChange={(e) => {
                    setProfileOnlyForListingGeo(e.target.checked);
                    if (e.target.checked) setListingGeo(null);
                  }}
                />
                <span className="label-text text-sm">
                  Use only my saved profile rough area when I post (no device location)
                </span>
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-sm gap-2"
                disabled={pending}
                onClick={() => {
                  if (!navigator.geolocation) {
                    setError("Location isn’t available in this browser.");
                    return;
                  }
                  setError(null);
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setListingGeo({
                        lat: Math.round(pos.coords.latitude * 100) / 100,
                        lng: Math.round(pos.coords.longitude * 100) / 100,
                      });
                      setProfileOnlyForListingGeo(false);
                    },
                    () => setError("Couldn’t read your location. Check permissions."),
                    { enableHighAccuracy: false, maximumAge: 600_000, timeout: 15_000 },
                  );
                }}
              >
                Use device location for this listing
              </button>
            </div>
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
            disabled={!canAdvance() || pending}
            onClick={() => submit()}
          >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : "Post listing"}
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
