/**
 * Sectioned FAQ accordion layout (DaisyUI collapse groups).
 * Location: components/faq/FaqAccordion.tsx
 */
import { FaqAccordionItem } from "@/components/faq/FaqAccordionItem";
import { PremiumDealGuide } from "@/components/faq/PremiumDealGuide";

type Section = {
  title: string;
  name: string;
  items: {
    id?: string;
    title: string;
    defaultOpen?: boolean;
    body: React.ReactNode;
  }[];
};

const SECTIONS: Section[] = [
  {
    title: "Getting started",
    name: "faq-getting-started",
    items: [
      {
        title: "What is ShelfSwap?",
        defaultOpen: true,
        body: (
          <p>
            ShelfSwap is a local book community. List books you want to pass on or swap, browse nearby
            listings, message sellers, and arrange pickup or a book-for-book swap in person.
          </p>
        ),
      },
      {
        title: "Is ShelfSwap free?",
        body: (
          <>
            <p>
              Yes. During launch, listing, browsing, messaging, and swap offers are free and unlimited.
              You only need an account to message sellers and manage your own books.
            </p>
            <p>
              Optional <strong>Premium</strong> extras (wishlist alerts, no ads, meetups, badge, and
              extra visibility) are marked <strong>Coming soon</strong> on the Plan page. They are not
              required to use the app.
            </p>
          </>
        ),
      },
      {
        title: "Is listing free?",
        body: (
          <p>
            Yes. Anyone with an account can create and manage listings. Add photos, condition notes,
            binding type (paperback or hardback), and a rough pickup area.
          </p>
        ),
      },
    ],
  },
  {
    title: "Messaging & chat",
    name: "faq-messaging",
    items: [
      {
        id: "how-it-works",
        title: "How messaging works",
        defaultOpen: true,
        body: <PremiumDealGuide />,
      },
      {
        title: "Can more than one buyer chat on the same listing?",
        body: (
          <p>
            Yes. Several buyers can message the same seller until the book is sold or the deal is
            completed with one buyer. Each conversation is private between that buyer and the seller.
            When a handoff is confirmed, other chats on that listing close.
          </p>
        ),
      },
      {
        title: "Can I unsend a message?",
        body: (
          <p>
            Yes, for your own messages within <strong>30 minutes</strong> of sending. On mobile,
            long-press the message; on desktop, use the ⋯ menu or right-click. After 30 minutes, Unsend
            is no longer available.
          </p>
        ),
      },
      {
        title: "Can I zoom photos in chat?",
        body: (
          <p>
            Yes. Tap a photo in a message to open it full screen. Pinch or scroll to zoom, drag to pan,
            and double-tap to reset. Tap outside or press Esc to close.
          </p>
        ),
      },
    ],
  },
  {
    title: "Deals & karma",
    name: "faq-deals",
    items: [
      {
        title: "What is karma?",
        defaultOpen: true,
        body: (
          <>
            <p>
              Karma reflects how many <strong>completed exchanges</strong> you have on ShelfSwap —
              pickups, sales, or swaps where both people confirmed handoff in the app. It is not a score
              out of 100.
            </p>
            <p>Tiers grow with completed exchanges:</p>
            <ul className="list-disc space-y-1 pl-5">
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
              Your badge can appear on your profile and when a seller reviews buyers for a listing.
              Inbox and notifications still sort by most recent activity.
            </p>
          </>
        ),
      },
      {
        title: "How do I finish a deal?",
        body: (
          <>
            <p>
              After you meet and exchange the book (or complete a swap), both people confirm handoff in
              the chat. That archives the listing, closes other conversations on it, and adds to both
              people&apos;s karma.
            </p>
            <p>
              If plans change, use the <strong>⋯ menu</strong> in an active chat to leave (when the
              seller never replied), call off the deal together, or close a stalled conversation.
            </p>
          </>
        ),
      },
      {
        title: "How do swaps work?",
        body: (
          <p>
            Swap offers are unlimited during launch. In chat, a buyer can propose one of their own live
            listings; the seller accepts or declines. When both confirm handoff on a completed swap,
            both listings are archived and both people earn karma.
          </p>
        ),
      },
    ],
  },
  {
    title: "Premium & listings",
    name: "faq-listings",
    items: [
      {
        title: "What about Premium and wishlist?",
        defaultOpen: true,
        body: (
          <p>
            Premium is not for sale during launch. Planned perks include a book wishlist with match
            notifications, no ads, meetup invites, a Premium badge, and extra visibility when messaging
            sellers. You can still save favourites on listings today.
          </p>
        ),
      },
      {
        title: "What do paperback and hardback mean?",
        body: (
          <p>
            That is the <strong>binding type</strong> of the book, not a price in the app. Any payment
            for the physical book is arranged between you and the other person outside ShelfSwap.
          </p>
        ),
      },
      {
        title: "Photos and condition",
        body: (
          <p>
            Sellers can add photos and describe condition. Use your own judgment before meeting someone
            you do not know, and meet in a public place when you can.
          </p>
        ),
      },
      {
        title: "Location and distance",
        body: (
          <p>
            Set <strong>where your books are</strong> in Profile → App settings → Set Location (UK
            postcode). That rough area appears on your listings so buyers know where pickup happens.
            Home and Search use your current area when location is allowed. We store only a coarse area
            (~1 km) and show town or area on listings — never your postcode or full address.
          </p>
        ),
      },
    ],
  },
];

export function FaqAccordion() {
  return (
    <div className="space-y-8">
      {SECTIONS.map((section) => (
        <section key={section.name} className="space-y-3">
          <h2 className="shelfswap-heading text-base font-semibold text-primary tracking-tight">
            {section.title}
          </h2>
          <div className="flex flex-col gap-2">
            {section.items.map((item) => (
              <FaqAccordionItem
                key={item.title}
                id={item.id}
                name={section.name}
                title={item.title}
                defaultOpen={item.defaultOpen}
              >
                {item.body}
              </FaqAccordionItem>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
