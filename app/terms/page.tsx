import { LegalDocShell } from "@/components/marketing/LegalDocShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "Terms of service for using ShelfSwap.",
};

/**
 * Terms of service (public starter copy — obtain legal review before relying on it).
 * Location: app/terms/page.tsx
 */
export default function TermsPage() {
  return (
    <LegalDocShell title="Terms of service">
      <p className="text-xs text-base-content/55 border border-warning/30 bg-warning/10 rounded-lg px-3 py-2">
        This is starter text for development and launch planning. You should have a qualified solicitor
        review and replace it for your jurisdiction and business model.
      </p>

      <h2>1. The service</h2>
      <p>
        ShelfSwap (&quot;we&quot;, &quot;us&quot;) provides an online platform that helps users list books,
        discover listings, and communicate with each other. We are not the seller of books listed by users
        and we are not a party to any in-person exchange unless expressly stated otherwise.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must provide accurate information and keep your login secure. You are responsible for activity
        under your account. We may suspend or terminate accounts that violate these terms or put the
        community at risk.
      </p>

      <h2>3. Listings and content</h2>
      <p>
        You are responsible for what you post (including photos and descriptions). You must have the right
        to pass on or swap any book you list. Do not post unlawful, misleading, hateful, or harmful
        content.
      </p>

      <h2>4. Credits</h2>
      <p>
        Digital credits may be used to request access to messaging for a listing according to the rules
        shown in the product. Credits are not cash balances stored with us as e-money unless we tell you
        otherwise in a separate agreement. Fees, packs, holds, expiry, and refunds (if any) are described
        in the app and checkout flows.
      </p>

      <h2>5. Meetings and safety</h2>
      <p>
        Arrangements to hand over a book happen between users. Meet in safe public places where possible,
        follow local laws, and use common sense. We do not guarantee the behaviour of other users or the
        condition of items.
      </p>

      <h2>6. Acceptable use</h2>
      <ul>
        <li>No harassment, scams, spam, or attempts to manipulate the credit or unlock system.</li>
        <li>No circumvention of security or rate limits.</li>
        <li>No use of the service for illegal purposes.</li>
      </ul>

      <h2>7. Intellectual property</h2>
      <p>
        The ShelfSwap name, branding, and software are ours or our licensors&apos;. You retain rights to
        content you upload; you grant us a licence to host and display it as needed to run the service.
      </p>

      <h2>8. Disclaimers</h2>
      <p>
        The service is provided &quot;as is&quot; to the extent permitted by law. We do not warrant
        uninterrupted or error-free operation.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the extent permitted by law, we are not liable for indirect or consequential losses, or for
        disputes between users. Nothing in these terms excludes liability that cannot be excluded by law.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update these terms. Continued use after changes become effective constitutes acceptance of
        the updated terms where allowed by law.
      </p>

      <h2>11. Contact</h2>
      <p>
        See the <a href="/contact">Contact</a> page for how to reach us.
      </p>
    </LegalDocShell>
  );
}
