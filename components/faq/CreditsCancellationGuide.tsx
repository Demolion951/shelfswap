/**
 * Visual guide: credit holds, cancellations, and when credits return to your wallet.
 * Used on FAQ and help pages so users understand the unlock lifecycle.
 * Location: components/faq/CreditsCancellationGuide.tsx
 */
import { Clock, MessageCircle, RotateCcw, Wallet, XCircle } from "lucide-react";

type FlowStep = {
  id: string;
  title: string;
  body: string;
  badge?: string;
  badgeClass?: string;
};

const JOURNEY: FlowStep[] = [
  {
    id: "browse",
    title: "Browse & save",
    body: "Free — no credits needed to look around or heart a listing.",
    badge: "Free",
    badgeClass: "badge-ghost",
  },
  {
    id: "request",
    title: "Request chat",
    body: "Credits are held (reserved), not spent yet. Paperback = 1 credit, hardback = 2.",
    badge: "Held",
    badgeClass: "badge-warning",
  },
  {
    id: "pending-exit",
    title: "Before seller replies",
    body: "You can cancel anytime. Holds also release if the request expires (24h) or the seller declines.",
    badge: "Credits back",
    badgeClass: "badge-success",
  },
  {
    id: "charged",
    title: "Seller’s first reply",
    body: "Your held credits are charged to unlock the conversation.",
    badge: "Charged",
    badgeClass: "badge-primary",
  },
  {
    id: "active",
    title: "Active deal",
    body: "Chat, arrange pickup, or propose a swap. Use the ⋯ menu on the listing for exit options.",
    badge: "In progress",
    badgeClass: "badge-ghost",
  },
  {
    id: "done",
    title: "Handoff complete",
    body: "Both confirm in the app. The listing is archived — credits are not refunded (service used).",
    badge: "Done",
    badgeClass: "badge-neutral",
  },
];

type RefundRow = {
  situation: string;
  who: string;
  credits: "yes" | "no" | "partial" | "hold";
  note?: string;
};

const REFUND_TABLE: RefundRow[] = [
  {
    situation: "Cancel unlock request",
    who: "Buyer",
    credits: "hold",
    note: "Before seller replies",
  },
  {
    situation: "Request expires (24 hours)",
    who: "Automatic",
    credits: "hold",
  },
  {
    situation: "Seller declines request",
    who: "Seller",
    credits: "hold",
  },
  {
    situation: "Withdraw from deal",
    who: "Buyer",
    credits: "yes",
    note: "Within 48h, seller never messaged",
  },
  {
    situation: "Mutual cancel",
    who: "Both agree",
    credits: "no",
    note: "Listing reopens for others",
  },
  {
    situation: "Stalled deal (14+ days inactive)",
    who: "Buyer or seller",
    credits: "no",
    note: "Re-list or close deal",
  },
  {
    situation: "Swap accepted",
    who: "Seller",
    credits: "partial",
    note: "Difference refunded if your book is worth more",
  },
  {
    situation: "Deal completed",
    who: "Both confirmed",
    credits: "no",
  },
  {
    situation: "Credit pack purchase (£)",
    who: "Support",
    credits: "no",
    note: "Contact us — not automatic in-app",
  },
];

function creditsLabel(row: RefundRow): { text: string; className: string } {
  switch (row.credits) {
    case "yes":
      return { text: "Credits refunded", className: "badge badge-success badge-sm" };
    case "hold":
      return { text: "Hold released", className: "badge badge-success badge-sm" };
    case "partial":
      return { text: "Partial refund", className: "badge badge-info badge-sm" };
    default:
      return { text: "No refund", className: "badge badge-ghost badge-sm" };
  }
}

export function CreditsCancellationGuide() {
  return (
    <div className="not-prose my-6 space-y-8 rounded-xl border border-primary/15 bg-base-200/40 p-4 sm:p-6">
      <div>
        <h3 className="shelfswap-heading text-base font-semibold text-primary">
          Credits, cancellation & refunds
        </h3>
        <p className="mt-1 text-xs text-base-content/65 leading-relaxed">
          Credits unlock chat about a book — not the physical book itself.{" "}
          <strong className="font-medium text-base-content/80">Wallet credits</strong> can return to your
          balance in some cases. <strong className="font-medium text-base-content/80">Card payments</strong>{" "}
          for credit packs are handled separately (contact support).
        </p>
      </div>

      {/* Journey flow */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-base-content">How a deal progresses</h4>
        <ol className="relative space-y-0">
          {JOURNEY.map((step, i) => (
            <li key={step.id} className="relative flex gap-3 pb-6 last:pb-0">
              {i < JOURNEY.length - 1 ? (
                <span
                  className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-base-300"
                  aria-hidden
                />
              ) : null}
              <span
                className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-content"
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-base-content">{step.title}</span>
                  {step.badge ? (
                    <span className={`badge badge-sm ${step.badgeClass ?? "badge-ghost"}`}>
                      {step.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-base-content/65 leading-relaxed">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ASCII-style branch diagram for mobile-friendly clarity */}
      <div className="rounded-lg border border-base-300/80 bg-base-100 p-3 sm:p-4">
        <h4 className="mb-2 text-sm font-semibold text-base-content">At a glance</h4>
        <pre className="overflow-x-auto text-[10px] sm:text-xs leading-relaxed text-base-content/75 font-mono whitespace-pre">
{`  Request chat ──► credits HELD
        │
        ├── You cancel ──────────────► hold released ✓
        ├── 24h passes ──────────────► hold released ✓
        ├── Seller declines ─────────► hold released ✓
        │
        └── Seller replies ──────────► credits CHARGED
                  │
                  ├── Withdraw (48h, no seller msg) ─► credits back ✓
                  ├── Mutual cancel (both agree) ────► no refund ✗
                  ├── Stalled 14+ days ──────────────► no refund ✗
                  └── Handoff complete ──────────────► no refund ✗`}
        </pre>
      </div>

      {/* Key times */}
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="flex items-start gap-2 rounded-lg border border-base-300/60 bg-base-100 p-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="text-xs font-semibold">24 hours</p>
            <p className="text-[11px] text-base-content/60">Pending request expires</p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-base-300/60 bg-base-100 p-3">
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="text-xs font-semibold">48 hours</p>
            <p className="text-[11px] text-base-content/60">Buyer withdraw window</p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-base-300/60 bg-base-100 p-3">
          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="text-xs font-semibold">14 days</p>
            <p className="text-[11px] text-base-content/60">Inactive party → stalled exit</p>
          </div>
        </div>
      </div>

      {/* Refund table */}
      <div>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-base-content">
          <Wallet className="h-4 w-4 text-primary" aria-hidden />
          When do credits come back?
        </h4>
        <div className="overflow-x-auto rounded-lg border border-base-300/80">
          <table className="table table-sm">
            <thead>
              <tr className="bg-base-200/80 text-xs">
                <th>Situation</th>
                <th className="hidden sm:table-cell">Who</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {REFUND_TABLE.map((row) => {
                const label = creditsLabel(row);
                return (
                  <tr key={row.situation} className="text-xs">
                    <td>
                      <span className="font-medium">{row.situation}</span>
                      {row.note ? (
                        <span className="mt-0.5 block text-[10px] text-base-content/55">{row.note}</span>
                      ) : null}
                    </td>
                    <td className="hidden sm:table-cell text-base-content/65">{row.who}</td>
                    <td>
                      <span className={label.className}>{label.text}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="flex items-start gap-2 text-[11px] text-base-content/55 leading-relaxed">
        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        During an active deal, open the listing and use the <strong className="font-medium">⋯ menu</strong>{" "}
        for withdraw, mutual cancel, or stalled options. Problems?{" "}
        <a href="/contact" className="link link-primary">
          Contact us
        </a>
        .
      </p>
    </div>
  );
}
