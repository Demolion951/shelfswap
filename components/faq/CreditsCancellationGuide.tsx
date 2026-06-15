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
    body: "Cancel anytime, wait for expiry (24h), or seller declines — your hold is released.",
    badge: "Hold released",
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
  cutoff?: string;
  note?: string;
};

const REFUND_TABLE: RefundRow[] = [
  {
    situation: "You cancel a pending unlock request",
    who: "Buyer",
    credits: "hold",
    cutoff: "Before seller’s first reply",
    note: "Tap Cancel request on the listing",
  },
  {
    situation: "Unlock request expires",
    who: "Automatic",
    credits: "hold",
    cutoff: "24 hours after request",
    note: "No action needed",
  },
  {
    situation: "Seller declines your request",
    who: "Seller",
    credits: "hold",
    cutoff: "Any time while pending",
  },
  {
    situation: "Another buyer is accepted first",
    who: "Automatic",
    credits: "hold",
    cutoff: "When seller accepts someone else",
    note: "Your pending request is declined",
  },
  {
    situation: "Withdraw from deal",
    who: "Buyer",
    credits: "yes",
    cutoff: "Within 48 hours of unlock, seller never replied",
    note: "⋯ menu → Withdraw. Releases hold or refunds wallet if already charged",
  },
  {
    situation: "Close deal (seller inactive)",
    who: "Buyer",
    credits: "yes",
    cutoff: "14+ days since seller’s last message",
    note: "You must have sent at least one message. ⋯ menu → Close & refund",
  },
  {
    situation: "Swap accepted (credit difference)",
    who: "Seller accepts swap",
    credits: "partial",
    cutoff: "When swap is accepted",
    note: "If your offered book is worth more credits, the difference is refunded",
  },
  {
    situation: "Mutual cancel",
    who: "Both agree",
    credits: "no",
    cutoff: "Any time during active deal",
    note: "Listing reopens for others",
  },
  {
    situation: "Re-list (buyer inactive)",
    who: "Seller",
    credits: "no",
    cutoff: "14+ days since buyer’s last message",
    note: "Or 14+ days since unlock if buyer never messaged",
  },
  {
    situation: "Deal completed",
    who: "Both confirmed handoff",
    credits: "no",
  },
  {
    situation: "Credit pack purchase (£)",
    who: "Support",
    credits: "no",
    cutoff: "Case by case",
    note: "Contact us — not automatic in-app",
  },
];

type CutoffCard = {
  time: string;
  title: string;
  body: string;
  icon: "clock" | "rotate" | "message";
};

const CUTOFFS: CutoffCard[] = [
  {
    time: "24 hours",
    title: "Pending request expiry",
    body: "If the seller never engages, your held credits are released automatically.",
    icon: "clock",
  },
  {
    time: "48 hours",
    title: "Buyer withdraw window",
    body: "Seller has never replied — withdraw to get your hold released or credits refunded.",
    icon: "rotate",
  },
  {
    time: "14 days",
    title: "Stalled deal exits",
    body: "Buyer can close & get a refund if the seller ghosted (after you’ve messaged). Seller can re-list if the buyer ghosted — no buyer refund.",
    icon: "message",
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

function CutoffIcon({ kind }: { kind: CutoffCard["icon"] }) {
  const cls = "mt-0.5 h-4 w-4 shrink-0 text-primary";
  if (kind === "rotate") return <RotateCcw className={cls} aria-hidden />;
  if (kind === "message") return <MessageCircle className={cls} aria-hidden />;
  return <Clock className={cls} aria-hidden />;
}

export function CreditsCancellationGuide() {
  return (
    <div className="not-prose my-6 space-y-8 rounded-xl border border-primary/15 bg-base-200/40 p-4 sm:p-6">
      <div>
        <h3 className="shelfswap-heading text-base font-semibold text-primary">
          Credits, cancellation & refunds
        </h3>
        <p className="mt-1 text-xs text-base-content/65 leading-relaxed">
          Credits unlock chat about a book — not the physical book itself. There are two ways credits
          come back: <strong className="font-medium text-base-content/80">hold release</strong> (before
          you are charged) and <strong className="font-medium text-base-content/80">wallet refund</strong>{" "}
          (after you are charged). <strong className="font-medium text-base-content/80">Card payments</strong>{" "}
          for credit packs are handled separately — contact support.
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

      {/* ASCII-style branch diagram */}
      <div className="rounded-lg border border-base-300/80 bg-base-100 p-3 sm:p-4">
        <h4 className="mb-2 text-sm font-semibold text-base-content">At a glance</h4>
        <pre className="overflow-x-auto text-[10px] sm:text-xs leading-relaxed text-base-content/75 font-mono whitespace-pre">
{`  Request chat ──► credits HELD (not spent)
        │
        ├── You cancel ──────────────► hold released ✓
        ├── 24h passes ──────────────► hold released ✓
        ├── Seller declines ─────────► hold released ✓
        ├── Another buyer accepted ──► hold released ✓
        │
        └── Seller replies ──────────► credits CHARGED
                  │
                  ├── Withdraw (48h, no seller msg) ─► hold released / refunded ✓
                  ├── Close deal (seller silent 14d) ─► credits refunded ✓*
                  ├── Swap accepted (worth more) ────► partial refund ✓
                  ├── Mutual cancel (both agree) ────► no refund ✗
                  ├── Re-list (buyer silent 14d) ────► no refund ✗
                  └── Handoff complete ──────────────► no refund ✗

  * You must have sent at least one message.`}
        </pre>
      </div>

      {/* Key times */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-base-content">Cut-off times</h4>
        <div className="grid gap-2 sm:grid-cols-3">
          {CUTOFFS.map((card) => (
            <div
              key={card.time}
              className="flex items-start gap-2 rounded-lg border border-base-300/60 bg-base-100 p-3"
            >
              <CutoffIcon kind={card.icon} />
              <div>
                <p className="text-xs font-semibold">
                  {card.time} — {card.title}
                </p>
                <p className="text-[11px] text-base-content/60 leading-snug">{card.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hold vs refund explainer */}
      <div className="rounded-lg border border-base-300/80 bg-base-100 p-3 sm:p-4">
        <h4 className="mb-2 text-sm font-semibold text-base-content">Hold release vs wallet refund</h4>
        <ul className="space-y-2 text-xs text-base-content/70 leading-relaxed">
          <li>
            <strong className="font-medium text-base-content/85">Hold release</strong> — Before the
            seller’s first reply, credits are reserved on your account but not deducted. Cancelling,
            expiry, or decline puts them back in your available balance immediately.
          </li>
          <li>
            <strong className="font-medium text-base-content/85">Wallet refund</strong> — After the
            seller replies, credits are charged. They only return to your wallet if you qualify for
            withdraw (48h, seller never replied), close a stalled deal (seller silent 14+ days), or
            receive a swap partial refund.
          </li>
          <li>
            <strong className="font-medium text-base-content/85">No refund</strong> — Mutual cancel,
            seller re-listing when you went quiet, and completed handoffs keep credits spent — you used
            the chat service or both parties agreed to walk away.
          </li>
        </ul>
      </div>

      {/* Refund table */}
      <div>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-base-content">
          <Wallet className="h-4 w-4 text-primary" aria-hidden />
          Every way credits can come back
        </h4>
        <div className="overflow-x-auto rounded-lg border border-base-300/80">
          <table className="table table-sm">
            <thead>
              <tr className="bg-base-200/80 text-xs">
                <th>Situation</th>
                <th className="hidden md:table-cell">Cut-off</th>
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
                      {row.cutoff ? (
                        <span className="mt-0.5 block text-[10px] text-base-content/55 md:hidden">
                          {row.cutoff}
                        </span>
                      ) : null}
                      {row.note ? (
                        <span className="mt-0.5 block text-[10px] text-base-content/55">{row.note}</span>
                      ) : null}
                    </td>
                    <td className="hidden md:table-cell text-base-content/65 whitespace-nowrap">
                      {row.cutoff ?? "—"}
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
