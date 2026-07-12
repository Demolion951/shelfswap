/**
 * Plain-language Premium subscription and deal-exit guide for the FAQ page.
 * Location: components/faq/PremiumDealGuide.tsx
 */
import { HowShelfSwapWorksCarousel } from "@/components/faq/HowShelfSwapWorksCarousel";
import { formatPremiumPrice } from "@/lib/subscription/constants";

export function PremiumDealGuide() {
  return (
    <div className="not-prose my-4 space-y-2">
      <p className="text-sm leading-relaxed text-base-content/90">
        <strong>Premium ({formatPremiumPrice()}/month)</strong> lets you message sellers and chat about
        listings. It does not pay for the physical book — you arrange pickup or swap in person. Listing
        your own books stays <strong>free</strong>.
      </p>

      <p className="text-sm leading-relaxed text-base-content/90">
        Cancel Premium anytime from <strong>Plan</strong> in the app (Stripe billing portal). Your
        subscription stays active until the end of the paid period.
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
