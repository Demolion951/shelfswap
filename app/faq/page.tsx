import { PremiumDealGuide } from "@/components/faq/PremiumDealGuide";
import { LegalDocShell } from "@/components/marketing/LegalDocShell";
import {
  formatPremiumPrice,
  FREE_SWAPS_PER_MONTH,
} from "@/lib/subscription/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Common questions about ShelfSwap — Free vs Premium, messaging, swaps, and listings.",
};

/**
 * Frequently asked questions (public).
 * Location: app/faq/page.tsx
 */
export default function FaqPage() {
  const premiumPrice = formatPremiumPrice();

  return (
    <LegalDocShell title="Frequently asked questions">
      <p>Quick answers about how ShelfSwap works. If something is not covered, use the Contact page.</p>

      <h2>What is ShelfSwap?</h2>
      <p>
        A local book community: list books you are happy to pass on or swap, discover nearby listings, and
        chat with sellers when you have Premium.
      </p>

      <h2>Is browsing free?</h2>
      <p>
        Yes. You can browse, search, save favourites, and view listing details without a subscription.
      </p>

      <h2>Is listing free?</h2>
      <p>
        Yes. Creating and managing listings is free for everyone. Sellers add photos, condition, and a rough
        pickup area.
      </p>

      <h2>What is Premium?</h2>
      <p>
        Premium is a monthly subscription ({premiumPrice}) that unlocks messaging: you can chat with sellers
        about as many listings as you like, send unlimited swap offers, and use the book wishlist. Cancel
        anytime from <strong>Plan</strong> in the app.
      </p>

      <h2>How do I get Premium?</h2>
      <p>
        Sign in, open <strong>Plan</strong>, and subscribe through Stripe Checkout. Manage or cancel your
        subscription from the same page via the billing portal.
      </p>

      <h2 id="how-it-works">How messaging works</h2>
      <PremiumDealGuide />

      <h2>Can more than one buyer chat on the same listing?</h2>
      <p>
        Yes. Several Premium buyers can message the same seller until the book is sold or the deal is
        completed with one buyer. Each buyer has a private conversation with the seller.
      </p>

      <h2>What do paperback and hardback mean on a listing?</h2>
      <p>
        That is the <strong>binding type</strong> of the book (paperback or hardback), not a price in the
        app. Any agreement for the physical book happens between you and the other person in person.
      </p>

      <h2>Swaps</h2>
      <p>
        Free accounts can send <strong>{FREE_SWAPS_PER_MONTH} swap offers per month</strong>. Premium
        includes unlimited swap offers. During a chat, a buyer can propose one of their own listings in
        exchange; the seller accepts or declines. When both of you confirm handoff on a completed swap,
        both listings are archived.
      </p>

      <h2>Wishlist (Premium)</h2>
      <p>
        Premium members can add books to a wishlist and get notified when a matching title is listed, then
        message the seller from that listing.
      </p>

      <h2>Photos and condition</h2>
      <p>
        Sellers can add photos and describe condition. Always use your own judgment before meeting someone
        you do not know.
      </p>

      <h2>Location and distance</h2>
      <p>
        Set <strong>where your books are</strong> in Profile → App settings → Set Location (UK postcode).
        That area stays on your listings so buyers know where pickup happens. Home and Search use your
        current area automatically when location is allowed. We store only a rough area (~1 km) and show
        town or area on listings — never your postcode or full address.
      </p>
    </LegalDocShell>
  );
}
