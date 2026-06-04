"use client";

/**
 * App settings: expandable "Set Location" row with UK postcode for home area on listings.
 * Location: components/profile/SetLocationSettings.tsx
 */
import { setMyHomeFromPostcodeAction } from "@/app/app/profile/location-actions";
import { ChevronDown, ChevronRight, Loader2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  homeAreaLabel: string | null;
};

export function SetLocationSettings({ homeAreaLabel }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [postcode, setPostcode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSavePostcode(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const trimmed = postcode.trim();
    if (!trimmed) {
      setError("Enter your postcode.");
      return;
    }
    startTransition(async () => {
      const res = await setMyHomeFromPostcodeAction(trimmed);
      if (res.ok) {
        setMessage("Saved.");
        setPostcode("");
        setOpen(false);
        router.refresh();
        return;
      }
      setError(res.error ?? "Could not save.");
    });
  }

  return (
    <li className="border-t border-base-300/60">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-base-200/60"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setMessage(null);
          setError(null);
        }}
      >
        <MapPin className="h-5 w-5 shrink-0 text-primary/80" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-base-content">Set Location</div>
          <div className="text-xs text-base-content/55 leading-snug">
            {homeAreaLabel ? `Current: ${homeAreaLabel}` : "Where your books are — town shown on listings"}
          </div>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-base-content/40" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-base-content/40" aria-hidden />
        )}
      </button>

      {open ? (
        <div className="px-4 pb-4 pt-0 space-y-3 border-t border-base-300/40 bg-base-200/20">
          <form onSubmit={onSavePostcode} className="space-y-2">
            <label className="form-control w-full">
              <span className="label-text text-xs text-base-content/70">UK postcode</span>
              <input
                type="text"
                className="input input-bordered input-sm w-full"
                placeholder="e.g. TW9 2AA"
                autoComplete="postal-code"
                value={postcode}
                disabled={pending}
                onChange={(e) => setPostcode(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="btn btn-primary btn-sm w-full"
              disabled={pending}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Save
            </button>
          </form>
          {message ? (
            <div role="status" className="alert alert-success text-xs py-2">
              {message}
            </div>
          ) : null}
          {error ? (
            <div role="alert" className="alert alert-error text-xs py-2">
              {error}
            </div>
          ) : null}
          <p className="text-[11px] text-base-content/50 leading-snug">
            Listings show town or area only — not your postcode. We store a rough area (~1 km).
          </p>
        </div>
      ) : null}
    </li>
  );
}
