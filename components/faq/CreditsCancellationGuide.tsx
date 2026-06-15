/**
 * Plain-language credits, cancellation and refund guide for the FAQ page.
 * Location: components/faq/CreditsCancellationGuide.tsx
 */
import { CreditsFlowCarousel } from "@/components/faq/CreditsFlowCarousel";

type RefundRow = {
  situation: string;
  limit: string;
  outcome: string;
};

const REFUND_ROWS: RefundRow[] = [
  {
    situation: "You cancel a pending request",
    limit: "Before seller’s first reply",
    outcome: "Hold released",
  },
  {
    situation: "Request expires",
    limit: "24 hours",
    outcome: "Hold released",
  },
  {
    situation: "Seller declines your request",
    limit: "While pending",
    outcome: "Hold released",
  },
  {
    situation: "Another buyer is accepted first",
    limit: "When seller picks someone else",
    outcome: "Hold released",
  },
  {
    situation: "You withdraw from the deal",
    limit: "Within 48 hours; seller never replied",
    outcome: "Credits back",
  },
  {
    situation: "You close a stalled deal (seller inactive)",
    limit: "14+ days since seller’s last message",
    outcome: "Credits back (you must have messaged once)",
  },
  {
    situation: "Swap accepted — your book worth more",
    limit: "When seller accepts swap",
    outcome: "Partial credits back",
  },
  {
    situation: "Mutual cancel (both agree)",
    limit: "Any time during active deal",
    outcome: "No refund",
  },
  {
    situation: "Seller re-lists (you went quiet)",
    limit: "14+ days since your last message",
    outcome: "No refund",
  },
  {
    situation: "Handoff completed",
    limit: "Both confirmed",
    outcome: "No refund",
  },
  {
    situation: "Credit pack bought with card (£)",
    limit: "—",
    outcome: "Contact support (not automatic)",
  },
];

export function CreditsCancellationGuide() {
  return (
    <div className="not-prose my-4 space-y-2">
      <p className="text-sm leading-relaxed text-base-content/90">
        Credits pay to <strong>unlock chat</strong> about a book — not the physical book itself. Before the
        seller replies, credits are only <strong>held</strong> (reserved). After they reply, credits are{" "}
        <strong>charged</strong>. Money paid by card for credit packs is separate — email us if you need help
        with that.
      </p>

      <p className="text-sm leading-relaxed text-base-content/90">
        <strong>Hold released</strong> means reserved credits go back to your available balance before you
        were charged. <strong>Credits back</strong> means charged credits return to your wallet.{" "}
        <strong>No refund</strong> means credits stay spent.
      </p>

      <CreditsFlowCarousel />

      <h3 className="text-sm font-semibold text-base-content pt-2">Quick reference</h3>
      <p className="text-sm text-base-content/80">
        Three time limits to remember: <strong>24 hours</strong> (pending request expires),{" "}
        <strong>48 hours</strong> (withdraw if seller never replied), <strong>14 days</strong> (stalled-deal
        exits).
      </p>

      <div className="overflow-x-auto my-4">
        <table className="w-full min-w-[20rem] border-collapse text-sm text-base-content/90">
          <thead>
            <tr className="border-b border-base-content/30">
              <th className="py-2 pr-3 text-left font-semibold align-bottom">What happened</th>
              <th className="py-2 pr-3 text-left font-semibold align-bottom">Time limit</th>
              <th className="py-2 text-left font-semibold align-bottom">Credits</th>
            </tr>
          </thead>
          <tbody>
            {REFUND_ROWS.map((row) => (
              <tr key={row.situation} className="border-b border-base-content/15">
                <td className="py-2.5 pr-3 align-top">{row.situation}</td>
                <td className="py-2.5 pr-3 align-top text-base-content/75">{row.limit}</td>
                <td className="py-2.5 align-top">{row.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-base-content/75">
        On an active listing, open the <strong>⋯ menu</strong> for withdraw, mutual cancel, or close &amp;
        refund. Still stuck?{" "}
        <a href="/contact" className="underline underline-offset-2">
          Contact us
        </a>
        .
      </p>
    </div>
  );
}
