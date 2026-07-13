import { PremiumDealGuide } from "@/components/faq/PremiumDealGuide";
import { LegalDocShell } from "@/components/marketing/LegalDocShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Common questions about ShelfSwap — messaging, swaps, karma, and listings.",
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
        chat with sellers for free during launch.
      </p>

      <h2>Is it free?</h2>
      <p>
        Yes. During launch, listing, messaging, swaps, and browsing are all free and unlimited. Optional
        Premium perks (wishlist, no ads, meetups, badge) are coming later — the core app stays usable
        without a subscription.
      </p>

      <h2>Is listing free?</h2>
      <p>
        Yes. Creating and managing listings is free for everyone. Sellers add photos, condition, and a rough
        pickup area.
      </p>

      <h2 id="how-it-works">How messaging works</h2>
      <PremiumDealGuide />

      <h2>Can more than one buyer chat on the same listing?</h2>
      <p>
        Yes. Several buyers can message the same seller until the book is sold or the deal is completed with
        one buyer. Each buyer has a private conversation with the seller.
      </p>

      <h2>What is karma?</h2>
      <p>
        Karma shows how many <strong>completed exchanges</strong> someone has on ShelfSwap (pickups, sales, or
        swaps where both people confirmed handoff in the app). You earn badges over time — New member, Active,
        Reliable, Trusted. Sellers can see this when choosing who to coordinate with.
      </p>

      <h2>What do paperback and hardback mean on a listing?</h2>
      <p>
        That is the <strong>binding type</strong> of the book (paperback or hardback), not a price in the
        app. Any agreement for the physical book happens between you and the other person in person.
      </p>

      <h2>Swaps</h2>
      <p>
        Swap offers are unlimited during launch. During a chat, a buyer can propose one of their own listings in
        exchange; the seller accepts or declines. When both of you confirm handoff on a completed swap, both
        listings are archived and both people earn karma.
      </p>

      <h2>Wishlist</h2>
      <p>
        A wishlist with match notifications is planned as a future Premium perk. You can still save
        favourites on listings today.
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
