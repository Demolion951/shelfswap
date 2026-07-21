/**
 * Sectioned FAQ accordion with partner Q&As (DaisyUI collapse).
 * Location: components/faq/FaqAccordion.tsx
 */
import { FaqAccordionItem } from "@/components/faq/FaqAccordionItem";

type FaqItem = { title: string; body: React.ReactNode };
type FaqSection = { title: string; name: string; items: FaqItem[] };

const SECTIONS: FaqSection[] = [
  {
    title: "About ShelfSwap",
    name: "faq-about",
    items: [
      {
        title: "What is ShelfSwap?",
        body: (
          <p>
            ShelfSwap is a free platform that helps readers exchange books with one another. List the books
            you&apos;ve finished, discover books nearby, and arrange swaps directly with other readers.
          </p>
        ),
      },
      {
        title: "Is ShelfSwap free to use?",
        body: (
          <p>
            Yes. Creating an account, listing books and connecting with other readers is completely free.
          </p>
        ),
      },
      {
        title: "How does ShelfSwap work?",
        body: (
          <p>
            Simply list the books you&apos;d like to exchange, browse books from other readers, send a swap request
            and arrange a convenient place to meet if both parties agree.
          </p>
        ),
      },
      {
        title: "Who can join ShelfSwap?",
        body: (
          <p>
            Anyone who meets our minimum age requirement and agrees to our Terms &amp; Conditions can create an
            account.
          </p>
        ),
      },
      {
        title: "Why should I use ShelfSwap instead of buying books?",
        body: (
          <p>
            ShelfSwap helps you discover new reads while saving money, reducing waste and giving books a second life.
            It&apos;s a simple way to read more without continually growing your book budget.
          </p>
        ),
      },
      {
        title: "Why doesn't ShelfSwap offer postage?",
        body: (
          <p>
            ShelfSwap is built around local exchanges. Meeting nearby readers keeps swaps quick, affordable and more
            sustainable while helping build local reading communities.
          </p>
        ),
      },
    ],
  },
  {
    title: "Listing books",
    name: "faq-listing",
    items: [
      {
        title: "What books can I list?",
        body: (
          <p>
            You can list most physical books in good, readable condition, including fiction, non-fiction, classics,
            romance, fantasy, thrillers, biographies and children&apos;s books.
          </p>
        ),
      },
      {
        title: "What books can't I list?",
        body: (
          <p>
            You shouldn&apos;t list books that are counterfeit, illegally reproduced, heavily damaged or missing pages,
            as well as magazines, digital books or items unrelated to books.
          </p>
        ),
      },
      {
        title: "Can I edit or remove my listings?",
        body: <p>Yes. You can update or remove your listings at any time from your account.</p>,
      },
      {
        title: "Can I list books with annotations or highlighting?",
        body: (
          <p>
            Absolutely. We simply ask that you mention any writing, highlighting or notes in the description so other
            readers know what to expect.
          </p>
        ),
      },
      {
        title: "Does ShelfSwap inspect books?",
        body: (
          <p>
            No. ShelfSwap doesn&apos;t inspect or verify books before they&apos;re listed. We rely on our community to
            provide honest descriptions and photos.
          </p>
        ),
      },
    ],
  },
  {
    title: "Swaps & meetups",
    name: "faq-swaps",
    items: [
      {
        title: "How are swaps arranged?",
        body: (
          <p>
            Once another reader accepts your request, you can chat through ShelfSwap to arrange a convenient time and
            place to exchange your books.
          </p>
        ),
      },
      {
        title: "Where should I meet another reader?",
        body: (
          <p>
            We recommend meeting in a safe public place such as a café, library or shopping centre. Always use your own
            judgement when arranging a meeting.
          </p>
        ),
      },
      {
        title: "What happens if someone doesn't show up?",
        body: (
          <p>
            Because exchanges are arranged directly between users, ShelfSwap can&apos;t guarantee another person&apos;s
            attendance. If someone repeatedly behaves unfairly or inappropriately, you can report them.
          </p>
        ),
      },
      {
        title: "Do all exchanges have to be one-for-one?",
        body: (
          <>
            <p>
              No. ShelfSwap gives readers flexibility. Depending on what both people are happy with, you can:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Swap books with another reader.</li>
              <li>Give a book away for free.</li>
              <li>Receive a book that another reader is giving away.</li>
            </ul>
            <p>Every exchange is arranged by mutual agreement between the people involved.</p>
          </>
        ),
      },
      {
        title: "Can I donate books through ShelfSwap?",
        body: (
          <p>
            Yes. If you&apos;d simply like to pass a book on to another reader without receiving one in return, you can.
            ShelfSwap isn&apos;t just about swapping—it&apos;s also a place to rehome books and help them find their
            next reader.
          </p>
        ),
      },
      {
        title: "Do I have to swap every book I receive?",
        body: (
          <p>
            No. Once you&apos;ve received a book, it&apos;s yours. You can keep it, gift it or list it on ShelfSwap
            again whenever you&apos;re ready.
          </p>
        ),
      },
      {
        title: "Can I swap books I've already received through ShelfSwap?",
        body: (
          <p>
            Absolutely. One of our goals is to help books continue their journey from reader to reader.
          </p>
        ),
      },
    ],
  },
  {
    title: "Safety & reporting",
    name: "faq-safety",
    items: [
      {
        title: "What if the book isn't as described?",
        body: (
          <p>
            We encourage honest and accurate listings. If you believe a listing was misleading, you can report it and
            we&apos;ll review the situation.
          </p>
        ),
      },
      {
        title: "Does ShelfSwap verify users?",
        body: (
          <p>
            Not currently. We encourage users to exercise good judgement, communicate clearly and always meet in public
            places.
          </p>
        ),
      },
      {
        title: "How do I report a user or listing?",
        body: (
          <p>
            You can report a user or listing directly from the app. We&apos;ll review reports and take appropriate
            action where necessary.
          </p>
        ),
      },
    ],
  },
  {
    title: "Your account",
    name: "faq-account",
    items: [
      {
        title: "How do I change my profile?",
        body: (
          <p>
            You can update your profile information, profile picture and bio from your account settings at any time.
          </p>
        ),
      },
      {
        title: "I forgot my password. What should I do?",
        body: (
          <p>
            Select Forgot Password on the sign-in page and follow the instructions to reset your password.
          </p>
        ),
      },
      {
        title: "Can I delete my account?",
        body: <p>Yes. You can permanently delete your account from your account settings at any time.</p>,
      },
      {
        title: "Can I suggest new features?",
        body: (
          <p>
            Yes! We&apos;re always looking for ways to improve ShelfSwap, and many future features will be shaped by
            feedback from our community. You can suggest your ideas directly to us using the{" "}
            <a href="/contact" className="link link-primary">
              Contact
            </a>{" "}
            page.
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
          <h2 className="shelfswap-heading text-xl font-semibold text-primary tracking-tight sm:text-2xl border-b border-primary/20 pb-2">
            {section.title}
          </h2>
          <div className="flex flex-col gap-2">
            {section.items.map((item) => (
              <FaqAccordionItem key={item.title} name={section.name} title={item.title}>
                {item.body}
              </FaqAccordionItem>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
