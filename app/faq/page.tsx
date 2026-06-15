import { CreditsCancellationGuide } from "@/components/faq/CreditsCancellationGuide";
import { LegalDocShell } from "@/components/marketing/LegalDocShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Common questions about ShelfSwap — listings, credits, unlocks, and messaging.",
};

/**
 * Frequently asked questions (public).
 * Location: app/faq/page.tsx
 */
export default function FaqPage() {
  return (
    <LegalDocShell title="Frequently asked questions">
      <p>Quick answers about how ShelfSwap works. If something is not covered, use the Contact page.</p>

      <h2>What is ShelfSwap?</h2>
      <p>
        A local book community: list books you are happy to pass on or swap, discover nearby listings, and
        chat with other readers after unlocking a listing.
      </p>

      <h2>Does browsing cost credits?</h2>
      <p>No. You can browse and search without spending credits.</p>

      <h2>What are credits for?</h2>
      <p>
        Credits are used when you request to unlock a listing so you can message the seller about that book.
        When listing, sellers choose <strong>paperback</strong> (1 credit to unlock) or{" "}
        <strong>hardback</strong> (2 credits).
      </p>

      <h2>How do I get credits?</h2>
      <p>
        Signed-in users can buy credit packs through Stripe Checkout where enabled. In development, test
        grants may exist — never rely on those in production.
      </p>

      <h2 id="cancellations">Cancellations & refunds</h2>
      <p>
        The guide below lists every situation where credits are held, charged, released, or refunded —
        including all cut-off times (24 hours, 48 hours, and 14 days). Card refunds for purchased packs
        are not automatic — contact us if you need help.
      </p>
      <CreditsCancellationGuide />

      <h2>What happens when I request an unlock?</h2>
      <p>
        Your credits are <strong>held</strong> (reserved, not spent) until the seller sends their first
        reply. You can message as soon as you&apos;ve requested — that first seller reply accepts your
        request and charges your credits. The seller can also decline without messaging, which releases
        your hold.
      </p>

      <h2>Can I cancel after requesting?</h2>
      <p>
        Yes — tap <strong>Cancel request</strong> on the listing while it is still pending. Your held credits
        are released immediately. If you do nothing, the request expires after <strong>24 hours</strong> and
        the hold is released automatically.
      </p>

      <h2>Can I get credits back during a deal?</h2>
      <p>
        <strong>Before the seller replies:</strong> cancel anytime, wait for the 24-hour expiry, or use{" "}
        <strong>Withdraw</strong> within <strong>48 hours</strong> if the deal started but the seller still
        has not messaged (⋯ menu).
      </p>
      <p>
        <strong>After chat has started:</strong> if the seller stops replying, you can{" "}
        <strong>Close &amp; refund</strong> once they have been silent for <strong>14+ days</strong> — you
        must have sent at least one message first. Mutual cancel and seller re-list when the buyer went
        quiet do <strong>not</strong> refund credits. Swaps may give a <strong>partial refund</strong> if
        your offered book is worth more credits than the net swap cost.
      </p>
      <p>See the full table in the guide above for every scenario.</p>

      <h2>Can more than one buyer unlock the same listing?</h2>
      <p>
        A listing is oriented around a single conversation thread. When a seller accepts one buyer, other
        pending requests for that listing are typically declined so everyone stays aligned.
      </p>

      <h2>Do swaps count toward the seller reward?</h2>
      <p>
        No. The free credit every <strong>5 completed deals</strong> counts <strong>passed on</strong> handoffs
        only (unlock for credits, not a swap). Swaps appear under Profile → Rehomed → Swaps and do not
        increase your reward counter.
      </p>

      <h2>How do credits work on swaps?</h2>
      <p>
        You pay the full unlock cost when your request is accepted. If you propose a swap and the seller
        accepts, your net unlock is the difference between their listing&apos;s credit value and your offered
        book&apos;s credit value (never below zero). Any extra credits you already paid are refunded to your
        balance. When both of you confirm handoff on a completed swap, both listings are archived.
      </p>

      <h2>Is there an in-app cash price for the physical book?</h2>
      <p>
        The app focuses on credits to unlock chat and arrange pickup or swap in person. Any agreement for
        the book itself happens between you and the other person outside the credit unlock.
      </p>

      <h2>Photos and condition</h2>
      <p>
        Sellers can add photos and describe condition. Always use your own judgment before meeting someone
        you do not know.
      </p>

      <h2>Location and distance</h2>
      <p>
        Set <strong>where your books are</strong> in Profile → App settings → Set Location (UK postcode). That area
        stays on your listings so buyers know where pickup happens. Home and Search use your current
        area automatically when location is allowed. We store only a rough area (~1 km) and show town or
        area on listings — never your postcode or full address.
      </p>
    </LegalDocShell>
  );
}
