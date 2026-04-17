import { LegalDocShell } from "@/components/marketing/LegalDocShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How ShelfSwap handles personal data.",
};

/**
 * Privacy policy (public starter copy — obtain legal review before relying on it).
 * Location: app/privacy/page.tsx
 */
export default function PrivacyPage() {
  return (
    <LegalDocShell title="Privacy policy">
      <p className="text-xs text-base-content/55 border border-warning/30 bg-warning/10 rounded-lg px-3 py-2">
        This is starter text for development and launch planning. You should have a qualified solicitor
        review and replace it for your jurisdiction (for example UK GDPR / UK GDPR-style rights).
      </p>

      <h2>Who we are</h2>
      <p>
        ShelfSwap operates this website and related services. Contact details are on the{" "}
        <a href="/contact">Contact</a> page.
      </p>

      <h2>What we process</h2>
      <ul>
        <li>
          <strong>Account data:</strong> such as email address and display name, authentication identifiers,
          and profile fields you choose to provide.
        </li>
        <li>
          <strong>Listings:</strong> titles, descriptions, photos, optional ISBN or catalogue links, and
          listing settings (for example unlock credits).
        </li>
        <li>
          <strong>Messages:</strong> content you send in listing-related conversations after unlock.
        </li>
        <li>
          <strong>Approximate location:</strong> coarse location or area text used to show approximate
          distance — not your precise street address unless you choose to share that in a message.
        </li>
        <li>
          <strong>Payments metadata:</strong> when you buy credit packs, our payment provider (Stripe)
          processes card data. We do not store your full card number on our servers.
        </li>
        <li>
          <strong>Technical data:</strong> logs, diagnostics, and security data as needed to run and
          protect the service.
        </li>
      </ul>

      <h2>Why we process it</h2>
      <p>To provide the service, authenticate users, prevent abuse, comply with law, and improve reliability.</p>

      <h2>Processors</h2>
      <p>
        We use infrastructure and service providers such as hosting (for example Vercel), database and auth
        (for example Supabase), and payments (Stripe). They process data under their terms and as our
        processors where applicable.
      </p>

      <h2>Retention</h2>
      <p>
        We keep information while your account is active and for a reasonable period afterwards for
        backups, disputes, and legal obligations. Exact periods may evolve as the product matures.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct, delete, or export personal
        data, and to object to or restrict certain processing. Contact us via the Contact page to make a
        request. You may also complain to your local supervisory authority where applicable.
      </p>

      <h2>Cookies and similar technologies</h2>
      <p>
        We use technologies needed for sign-in and core functionality. If we add analytics or marketing
        cookies, we will update this policy and any consent UI accordingly.
      </p>

      <h2>Children</h2>
      <p>The service is not directed at children under the age required by law in your country.</p>

      <h2>Changes</h2>
      <p>We may update this policy from time to time. Check this page for the latest version.</p>
    </LegalDocShell>
  );
}
