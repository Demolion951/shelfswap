"use server";

/**
 * Safety reports: authenticated users can report a listing and/or user.
 * Location: app/app/reports/actions.ts
 */
import { createClient } from "@/lib/supabase/server";

export type SubmitReportResult = { ok: true } | { ok: false; error: string };

const REASONS = new Set([
  "misleading_listing",
  "fake_or_counterfeit",
  "harassment",
  "spam",
  "impersonation",
  "safety_concern",
  "other",
]);

export async function submitUserReportAction(input: {
  reason: string;
  details?: string;
  listingId?: string | null;
  reportedUserId?: string | null;
}): Promise<SubmitReportResult> {
  const reason = String(input.reason ?? "").trim();
  const details = String(input.details ?? "").trim().slice(0, 2000) || null;
  const listingId = input.listingId?.trim() || null;
  const reportedUserId = input.reportedUserId?.trim() || null;

  if (!REASONS.has(reason)) {
    return { ok: false, error: "Please choose a reason." };
  }
  if (!listingId && !reportedUserId) {
    return { ok: false, error: "Nothing to report." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return { ok: false, error: "Sign in to send a report." };
  }

  if (reportedUserId && reportedUserId === user.id) {
    return { ok: false, error: "You cannot report yourself." };
  }

  const { error } = await supabase.from("user_reports").insert({
    reporter_id: user.id,
    reported_user_id: reportedUserId,
    listing_id: listingId,
    reason,
    details,
  });

  if (error) {
    console.error("[submitUserReportAction]", error.message);
    if (/relation .*user_reports.* does not exist/i.test(error.message)) {
      return {
        ok: false,
        error: "Reporting is not available yet. Please email support@shelfswap.net.",
      };
    }
    return { ok: false, error: "Could not send report. Try again in a moment." };
  }

  return { ok: true };
}
