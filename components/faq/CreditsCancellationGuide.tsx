/**
 * Plain-language credits, cancellation and refund guide for the FAQ page.
 * Location: components/faq/CreditsCancellationGuide.tsx
 */
import { CreditsFlowCarousel } from "@/components/faq/CreditsFlowCarousel";

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

      <p className="text-sm text-base-content/75 pt-2">
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
