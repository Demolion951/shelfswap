/**
 * Plain-language messaging and deal-exit guide for the FAQ page.
 * Location: components/faq/PremiumDealGuide.tsx
 */
import { HowShelfSwapWorksCarousel } from "@/components/faq/HowShelfSwapWorksCarousel";

export function PremiumDealGuide() {
  return (
    <div className="not-prose my-4 space-y-2">
      <p className="text-sm leading-relaxed text-base-content/90">
        Sign in and tap <strong>Message seller</strong> on any listing — chat opens straight away.
        Messaging does not pay for the physical book; you arrange pickup or a swap in person.
      </p>

      <p className="text-sm leading-relaxed text-base-content/90">
        When both of you confirm handoff in the app, you earn <strong>karma</strong> from that
        completed exchange. Sellers can see karma when several buyers are interested in the same book.
      </p>

      <HowShelfSwapWorksCarousel />

      <p className="text-sm text-base-content/75 pt-2">
        On an active deal, open the <strong>⋯ menu</strong> to leave chat, call off the deal, or close a
        stalled conversation. Still stuck?{" "}
        <a href="/contact" className="underline underline-offset-2">
          Contact us
        </a>
        .
      </p>
    </div>
  );
}
