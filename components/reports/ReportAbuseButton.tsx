"use client";

/**
 * In-app report modal for listings and/or users (safety / Terms violations).
 * Location: components/reports/ReportAbuseButton.tsx
 */
import { submitUserReportAction } from "@/app/app/reports/actions";
import { AlertTriangle, Flag, Loader2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";

const REASON_OPTIONS = [
  { value: "misleading_listing", label: "Misleading listing" },
  { value: "fake_or_counterfeit", label: "Fake or counterfeit claim" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "spam", label: "Spam" },
  { value: "impersonation", label: "Impersonation" },
  { value: "safety_concern", label: "Safety concern" },
  { value: "other", label: "Other" },
] as const;

type Props = {
  listingId?: string | null;
  reportedUserId?: string | null;
  listingTitle?: string | null;
  reportedDisplayName?: string | null;
  /** Compact text button for menus vs outline button on pages. */
  variant?: "button" | "menu";
  label?: string;
  className?: string;
};

export function ReportAbuseButton({
  listingId = null,
  reportedUserId = null,
  listingTitle = null,
  reportedDisplayName = null,
  variant = "button",
  label = "Report",
  className = "",
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function open() {
    setError(null);
    setDone(false);
    setReason("");
    setDetails("");
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await submitUserReportAction({
        reason,
        details,
        listingId,
        reportedUserId,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
    });
  }

  const subjectBits = [
    listingTitle ? `listing “${listingTitle}”` : null,
    reportedDisplayName ? `user @${reportedDisplayName}` : null,
  ].filter(Boolean);

  return (
    <>
      {variant === "menu" ? (
        <button type="button" className={`gap-2 text-sm ${className}`} onClick={() => open()}>
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {label}
        </button>
      ) : (
        <button
          type="button"
          className={`btn btn-ghost btn-sm gap-1.5 text-base-content/70 ${className}`}
          onClick={() => open()}
        >
          <Flag className="h-4 w-4" aria-hidden />
          {label}
        </button>
      )}

      <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <h2 className="shelfswap-heading text-lg font-semibold">Report</h2>
          {subjectBits.length > 0 ? (
            <p className="mt-1 text-sm text-base-content/65">About {subjectBits.join(" · ")}</p>
          ) : null}

          {done ? (
            <div className="space-y-4 py-4">
              <p className="text-sm leading-relaxed">
                Thanks — your report was sent. We&apos;ll review it and take action where needed.
              </p>
              <div className="modal-action mt-0">
                <button type="button" className="btn btn-primary" onClick={() => close()}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-3 space-y-3">
              <label className="form-control w-full">
                <span className="label-text">Reason</span>
                <select
                  className="select select-bordered w-full"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select a reason…
                  </option>
                  {REASON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-control w-full">
                <span className="label-text">Details (optional)</span>
                <textarea
                  className="textarea textarea-bordered w-full min-h-24"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={2000}
                  placeholder="What happened?"
                />
              </label>

              {error ? (
                <div role="alert" className="alert alert-error text-sm py-2">
                  {error}
                </div>
              ) : null}

              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => close()}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary gap-2" disabled={pending || !reason}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Submit report
                </button>
              </div>
            </form>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit" aria-label="Close">
            close
          </button>
        </form>
      </dialog>
    </>
  );
}
