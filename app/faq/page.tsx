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
        Sellers choose whether their listing costs 1 or 2 credits to unlock.
      </p>

      <h2>How do I get credits?</h2>
      <p>
        Signed-in users can buy credit packs through Stripe Checkout where enabled. In development, test
        grants may exist — never rely on those in production.
      </p>

      <h2>What happens when I request an unlock?</h2>
      <p>
        Your credits are <strong>held</strong> until the seller engages or the request expires. You can
        message as soon as you&apos;ve requested — when the seller sends their first reply, that counts as
        accepting your request and your credits are charged. The seller can also decline to release your
        hold without messaging.
      </p>

      <h2>Can more than one buyer unlock the same listing?</h2>
      <p>
        A listing is oriented around a single conversation thread. When a seller accepts one buyer, other
        pending requests for that listing are typically declined so everyone stays aligned.
      </p>

      <h2>Do swaps count toward the seller reward?</h2>
      <p>
        No. The free credit every <strong>5 completed deals</strong> counts <strong>pickup</strong> sales only
        (someone unlocked your listing and you both confirmed handoff). Completed <strong>swaps</strong> show
        under Profile → Rehomed → Swaps but do not increase your reward counter.
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
        Approximate distance may be shown using coarse location you allow the app to refresh. It is not a
        precise address by default.
      </p>
    </LegalDocShell>
  );
}
