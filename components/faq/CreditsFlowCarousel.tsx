"use client";

/**
 * Swipeable step-by-step guide for the credit / unlock lifecycle on FAQ.
 * Location: components/faq/CreditsFlowCarousel.tsx
 */

type Step = {
  id: string;
  title: string;
  body: string;
  diagram?: string;
};

const STEPS: Step[] = [
  {
    id: "browse",
    title: "Browse for free",
    body: "Looking at listings and saving hearts costs nothing.",
    diagram: "Browse → Save → (no credits used)",
  },
  {
    id: "request",
    title: "Request chat",
    body: "You ask to message the seller. Credits are held on your account — not spent yet. Paperback = 1 credit, hardback = 2.",
    diagram: "You → Request chat → Credits HELD",
  },
  {
    id: "before-reply",
    title: "Before the seller replies",
    body: "You can cancel anytime. If nothing happens for 24 hours, or the seller declines, the hold is released automatically.",
    diagram: `Cancel request     → hold released
Wait 24 hours      → hold released
Seller declines    → hold released
Another buyer wins → hold released`,
  },
  {
    id: "charged",
    title: "Seller replies",
    body: "Their first message accepts your request and charges your credits. Chat is fully open.",
    diagram: "Seller replies → Credits CHARGED → Active chat",
  },
  {
    id: "during-deal",
    title: "During the deal",
    body: "Arrange pickup or a swap. Use the ⋯ menu on the listing to withdraw, call off the deal, or close a stalled chat. See the table below for what comes back.",
    diagram: `Withdraw (48h, seller never replied)
Close & refund (seller silent 14+ days)*
Mutual cancel → no refund
Handoff complete → no refund

* You must have messaged at least once.`,
  },
  {
    id: "done",
    title: "Deal complete",
    body: "When both of you confirm handoff, the listing is archived. Credits are not refunded — you used the chat service.",
    diagram: "Both confirm → Listing archived → No refund",
  },
];

export function CreditsFlowCarousel() {
  return (
    <div className="my-6">
      <h3 className="text-sm font-semibold text-base-content mb-2">How it works (swipe through)</h3>
      <div
        className="-mx-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-3 scrollbar-thin"
        aria-label="Credit and refund steps"
      >
        {STEPS.map((step, i) => (
          <article
            key={step.id}
            className="snap-center shrink-0 w-[min(100%,18rem)] border border-base-content/25 px-4 py-3"
          >
            <p className="text-[11px] uppercase tracking-wide text-base-content/55">
              Step {i + 1} of {STEPS.length}
            </p>
            <h4 className="mt-1 text-sm font-semibold text-base-content">{step.title}</h4>
            <p className="mt-2 text-sm leading-relaxed text-base-content/85">{step.body}</p>
            {step.diagram ? (
              <pre className="mt-3 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-base-content/75">
                {step.diagram}
              </pre>
            ) : null}
          </article>
        ))}
      </div>
      <p className="text-xs text-base-content/55">Swipe sideways on mobile to read each step.</p>
    </div>
  );
}
