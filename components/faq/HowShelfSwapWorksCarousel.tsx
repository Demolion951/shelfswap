"use client";

/**
 * Swipeable step-by-step guide for Free vs Premium on the FAQ page.
 * Location: components/faq/HowShelfSwapWorksCarousel.tsx
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
    body: "Search, save favourites, and view listings — no subscription needed.",
    diagram: "Browse → Save hearts → (no plan required)",
  },
  {
    id: "list",
    title: "List for free",
    body: "Sellers list books at no cost. Add photos, condition, and your rough pickup area.",
    diagram: "Sell → Photos + notes → Live on Home & Browse",
  },
  {
    id: "premium",
    title: "Premium to chat",
    body: "Subscribe to message sellers and unlock unlimited chats. Listing stays free.",
    diagram: "Premium → Message seller → Chat opens",
  },
  {
    id: "chat",
    title: "Message instantly",
    body: "Tap Message seller on a listing. Chat opens straight away — no waiting for approval. Several Premium buyers can chat on the same book until it sells.",
    diagram: "You → Message seller → Active chat",
  },
  {
    id: "during-deal",
    title: "During the deal",
    body: "Arrange pickup or propose a swap. Use the ⋯ menu to leave chat (if the seller never replied), call off the deal together, or close a stalled conversation.",
    diagram: `Leave chat (48h, seller silent)
Call off deal (both agree)
Close deal (seller inactive 14+ days)*

* You must have messaged at least once.`,
  },
  {
    id: "done",
    title: "Deal complete",
    body: "When both of you confirm handoff, the listing is archived and hidden from discovery. Other chats on that book close too.",
    diagram: "Both confirm → Listing archived",
  },
];

export function HowShelfSwapWorksCarousel() {
  return (
    <div className="my-6">
      <h3 className="text-sm font-semibold text-base-content mb-2">How it works (swipe through)</h3>
      <div
        className="-mx-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-3 scrollbar-thin"
        aria-label="ShelfSwap plan and messaging steps"
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
