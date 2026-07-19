import { PremiumDealGuide } from "@/components/faq/PremiumDealGuide";
import { LegalDocShell } from "@/components/marketing/LegalDocShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Common questions about ShelfSwap — free listing and messaging, karma, swaps, and how deals work.",
};

/**
 * Frequently asked questions (public).
 * Location: app/faq/page.tsx
 */
export default function FaqPage() {
  return (
    <LegalDocShell title="Frequently asked questions">
      <p>
        Answers for the current ShelfSwap app. Still stuck? Use the{" "}
        <a href="/contact">Contact</a> page.
      </p>

      <h2>What is ShelfSwap?</h2>
      <p>
        ShelfSwap is a local book community. List books you want to pass on or swap, browse nearby
        listings, message sellers, and arrange pickup or a book-for-book swap in person.
      </p>

      <h2>Is ShelfSwap free?</h2>
      <p>
        Yes. During launch, listing, browsing, messaging, and swap offers are free and unlimited. You
        only need an account to message sellers and manage your own books.
      </p>
      <p>
        Optional <strong>Premium</strong> extras (wishlist alerts, no ads, meetups, badge, and extra
        visibility) are marked <strong>Coming soon</strong> on the Plan page. They are not required to
        use the app.
      </p>

      <h2>Is listing free?</h2>
      <p>
        Yes. Anyone with an account can create and manage listings. Add photos, condition notes,
        binding type (paperback or hardback), and a rough pickup area.
      </p>

      <h2 id="how-it-works">How messaging works</h2>
      <PremiumDealGuide />

      <h2>Can more than one buyer chat on the same listing?</h2>
      <p>
        Yes. Several buyers can message the same seller until the book is sold or the deal is completed
        with one buyer. Each conversation is private between that buyer and the seller. When a handoff
        is confirmed, other chats on that listing close.
      </p>

      <h2>Can I unsend a message?</h2>
      <p>
        Yes, for your own messages within <strong>30 minutes</strong> of sending. On mobile, long-press
        the message; on desktop, use the ⋯ menu or right-click. After 30 minutes, Unsend is no longer
        available.
      </p>

      <h2>Can I zoom photos in chat?</h2>
      <p>
        Yes. Tap a photo in a message to open it full screen. Pinch or scroll to zoom, drag to pan, and
        double-tap to reset. Tap outside or press Esc to close.
      </p>

      <h2>What is karma?</h2>
      <p>
        Karma reflects how many <strong>completed exchanges</strong> you have on ShelfSwap — pickups,
        sales, or swaps where both people confirmed handoff in the app. It is not a score out of 100.
      </p>
      <p>Tiers grow with completed exchanges:</p>
      <ul>
        <li>
          <strong>New member</strong> — no completed exchanges yet
        </li>
        <li>
          <strong>Active</strong> — 1+
        </li>
        <li>
          <strong>Reliable</strong> — 5+
        </li>
        <li>
          <strong>Trusted</strong> — 15+
        </li>
      </ul>
      <p>
        Your badge can appear on your profile and when a seller reviews buyers for a listing. Inbox and
        notifications still sort by most recent activity.
      </p>

      <h2>How do I finish a deal?</h2>
      <p>
        After you meet and exchange the book (or complete a swap), both people confirm handoff in the
        chat. That archives the listing, closes other conversations on it, and adds to both people&apos;s
        karma.
      </p>
      <p>
        If plans change, use the <strong>⋯ menu</strong> in an active chat to leave (when the seller never
        replied), call off the deal together, or close a stalled conversation.
      </p>

      <h2>Swaps</h2>
      <p>
        Swap offers are unlimited during launch. In chat, a buyer can propose one of their own live
        listings; the seller accepts or declines. When both confirm handoff on a completed swap, both
        listings are archived and both people earn karma.
      </p>

      <h2>What about Premium and wishlist?</h2>
      <p>
        Premium is not for sale during launch. Planned perks include a book wishlist with match
        notifications, no ads, meetup invites, a Premium badge, and extra visibility when messaging
        sellers. You can still save favourites on listings today.
      </p>

      <h2>What do paperback and hardback mean on a listing?</h2>
      <p>
        That is the <strong>binding type</strong> of the book, not a price in the app. Any payment for
        the physical book is arranged between you and the other person outside ShelfSwap.
      </p>

      <h2>Photos and condition</h2>
      <p>
        Sellers can add photos and describe condition. Use your own judgment before meeting someone you
        do not know, and meet in a public place when you can.
      </p>

      <h2>Location and distance</h2>
      <p>
        Set <strong>where your books are</strong> in Profile → App settings → Set Location (UK postcode).
        That rough area appears on your listings so buyers know where pickup happens. Home and Search use
        your current area when location is allowed. We store only a coarse area (~1 km) and show town or
        area on listings — never your postcode or full address.
      </p>
    </LegalDocShell>
  );
}
