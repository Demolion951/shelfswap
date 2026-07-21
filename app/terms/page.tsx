import { LegalDocShell } from "@/components/marketing/LegalDocShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for using ShelfSwap.",
};

/**
 * Terms of Service (public).
 * Location: app/terms/page.tsx
 */
export default function TermsPage() {
  return (
    <LegalDocShell title="Terms of Service">
      <p className="text-xs text-base-content/60">Last Updated: 20/07/2026</p>

      <p>
        Welcome to ShelfSwap (&quot;ShelfSwap&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). These Terms of
        Service (&quot;Terms&quot;) govern your access to and use of the ShelfSwap website, mobile application and
        related services (collectively, the &quot;Service&quot;).
      </p>
      <p>
        By creating an account or using the Service, you confirm that you have read, understood and agree to be
        bound by these Terms. If you do not agree, you must not use the Service.
      </p>

      <h2>1. The Service</h2>
      <p>
        ShelfSwap provides an online platform that enables users to create book listings, discover books listed by
        other users, communicate through the platform and independently arrange book exchanges.
      </p>
      <p>
        ShelfSwap is a technology platform only. We do not own, buy, sell, inspect, verify, transport, store or
        deliver books listed by users unless expressly stated otherwise. All exchanges are arranged directly between
        users.
      </p>
      <p>
        ShelfSwap is not a party to any agreement, exchange, meeting or transaction between users. Nothing in these
        Terms creates any partnership, agency, employment or joint venture between ShelfSwap and its users.
      </p>

      <h2>2. Eligibility</h2>
      <p>To use ShelfSwap you must:</p>
      <ul>
        <li>be at least 18 years old or have permission from a parent or legal guardian where permitted by law;</li>
        <li>have the legal capacity to enter into binding agreements;</li>
        <li>provide accurate, complete and current information;</li>
        <li>comply with these Terms and all applicable laws.</li>
      </ul>
      <p>You may not create an account if you have previously been suspended or banned from using ShelfSwap.</p>

      <h2>3. Your Account</h2>
      <p>
        You are responsible for maintaining the security of your account and password. You are responsible for all
        activity carried out under your account. You agree to notify us immediately if you believe your account has
        been accessed without your permission.
      </p>
      <p>You must not:</p>
      <ul>
        <li>share your account with another person;</li>
        <li>impersonate another individual;</li>
        <li>create multiple accounts to avoid restrictions;</li>
        <li>create accounts using false information.</li>
      </ul>
      <p>
        We reserve the right to suspend, restrict or permanently terminate accounts where we reasonably believe these
        Terms have been violated or where necessary to protect the Service or other users.
      </p>

      <h2>4. Using ShelfSwap</h2>
      <p>
        ShelfSwap allows users to create listings, browse books, communicate with other users and arrange exchanges
        independently. We may add, modify or remove features from time to time. Certain features may become subject to
        additional terms if introduced in the future.
      </p>
      <p>
        We reserve the right to update, suspend or discontinue any part of the Service without prior notice where
        reasonably necessary.
      </p>

      <h2>5. Listings and User Content</h2>
      <p>You are solely responsible for any content you upload, including:</p>
      <ul>
        <li>book listings;</li>
        <li>photographs;</li>
        <li>descriptions;</li>
        <li>usernames;</li>
        <li>profile information;</li>
        <li>messages.</li>
      </ul>
      <p>By posting content you confirm that:</p>
      <ul>
        <li>you own the book or have the legal right to exchange it;</li>
        <li>your listing accurately describes the book;</li>
        <li>photographs are genuine and belong to you or you have permission to use them;</li>
        <li>your content does not infringe another person&apos;s intellectual property rights;</li>
        <li>your content complies with applicable laws.</li>
      </ul>
      <p>
        You retain ownership of the content you upload. However, by uploading content you grant ShelfSwap a worldwide,
        non-exclusive, royalty-free licence to host, store, reproduce, display and distribute that content solely for
        the purpose of operating, maintaining, improving and promoting the Service.
      </p>
      <p>
        We may remove any content that we reasonably believe breaches these Terms or may expose ShelfSwap or its users
        to legal or reputational risk.
      </p>

      <h2>6. Exchanges Between Users</h2>
      <p>ShelfSwap does not participate in exchanges between users. Users are solely responsible for:</p>
      <ul>
        <li>deciding whether to exchange a book;</li>
        <li>communicating with other users;</li>
        <li>arranging a meeting;</li>
        <li>inspecting books before completing an exchange;</li>
        <li>complying with applicable laws.</li>
      </ul>
      <p>ShelfSwap does not guarantee:</p>
      <ul>
        <li>that another user will attend a meeting;</li>
        <li>that a listing is accurate;</li>
        <li>that a book is genuine;</li>
        <li>that a book is undamaged;</li>
        <li>that an exchange will be completed;</li>
        <li>that users will behave honestly or lawfully.</li>
      </ul>
      <p>Any exchange is undertaken entirely at the users&apos; own risk.</p>

      <h2>7. Meetings and Personal Safety</h2>
      <p>
        Users arrange meetings independently. We recommend meeting only in public places and taking reasonable
        precautions when meeting someone for the first time. ShelfSwap does not verify the identity of users unless
        expressly stated otherwise.
      </p>
      <p>ShelfSwap is not responsible for:</p>
      <ul>
        <li>the conduct of users;</li>
        <li>missed meetings;</li>
        <li>injuries;</li>
        <li>theft;</li>
        <li>property damage;</li>
        <li>personal disputes;</li>
        <li>criminal acts committed by users.</li>
      </ul>
      <p>You are solely responsible for your own safety and personal decisions when using the Service.</p>

      <h2>8. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>break any law;</li>
        <li>harass, threaten or abuse another user;</li>
        <li>discriminate against others;</li>
        <li>impersonate another person;</li>
        <li>create fake accounts;</li>
        <li>upload false or misleading listings;</li>
        <li>list books you do not own or have permission to exchange;</li>
        <li>upload harmful software or malicious code;</li>
        <li>interfere with the operation or security of the Service;</li>
        <li>attempt to gain unauthorised access to our systems;</li>
        <li>reverse engineer, copy or modify our software except where permitted by law;</li>
        <li>scrape, harvest or collect user information without permission;</li>
        <li>use bots or automated software without our written consent;</li>
        <li>send spam or unsolicited advertising;</li>
        <li>use ShelfSwap for fraudulent or illegal purposes.</li>
      </ul>

      <h2>9. Reporting Violations</h2>
      <p>Users may report listings or accounts that violate these Terms. We may investigate reported content and take action including:</p>
      <ul>
        <li>removing listings;</li>
        <li>restricting accounts;</li>
        <li>suspending users;</li>
        <li>permanently terminating accounts.</li>
      </ul>
      <p>We are not obliged to investigate every report or resolve disputes between users.</p>

      <h2>10. Intellectual Property</h2>
      <p>
        The ShelfSwap name, logo, branding, software, designs, graphics, databases, interface, source code and all
        related intellectual property belong to ShelfSwap or its licensors. Nothing in these Terms transfers ownership
        of our intellectual property to you.
      </p>
      <p>
        You may not copy, reproduce, distribute or commercially exploit any part of the Service without our prior
        written permission except where permitted by law.
      </p>

      <h2>11. Availability of the Service</h2>
      <p>
        We aim to keep ShelfSwap available at all times. However, we do not guarantee uninterrupted, secure or
        error-free operation. The Service may be unavailable due to:
      </p>
      <ul>
        <li>maintenance;</li>
        <li>software updates;</li>
        <li>technical faults;</li>
        <li>security incidents;</li>
        <li>events beyond our reasonable control.</li>
      </ul>
      <p>We may modify, suspend or discontinue any feature without liability where permitted by law.</p>

      <h2>12. Third-Party Services</h2>
      <p>
        ShelfSwap may use third-party providers to deliver certain features, including authentication, hosting,
        analytics, mapping, notifications and payment services if introduced in the future. Your use of those
        third-party services may also be governed by their own terms and privacy policies. ShelfSwap is not responsible
        for third-party services or their availability.
      </p>

      <h2>13. Disclaimer</h2>
      <p>
        To the fullest extent permitted by law, the Service is provided on an &quot;as is&quot; and &quot;as
        available&quot; basis. We make no guarantee that:
      </p>
      <ul>
        <li>listings are accurate;</li>
        <li>books will be available;</li>
        <li>users will complete exchanges;</li>
        <li>communications will always be delivered;</li>
        <li>the Service will be uninterrupted or error-free.</li>
      </ul>
      <p>Nothing in these Terms affects statutory rights that cannot legally be excluded.</p>

      <h2>14. Limitation of Liability</h2>
      <p>To the fullest extent permitted by applicable law, ShelfSwap shall not be liable for:</p>
      <ul>
        <li>disputes between users;</li>
        <li>loss or damage to books;</li>
        <li>inaccurate listings;</li>
        <li>cancelled exchanges;</li>
        <li>missed meetings;</li>
        <li>theft;</li>
        <li>fraud committed by users;</li>
        <li>loss of profits;</li>
        <li>loss of goodwill;</li>
        <li>loss of opportunity;</li>
        <li>loss of data;</li>
        <li>indirect or consequential losses.</li>
      </ul>
      <p>
        Nothing in these Terms excludes or limits liability where such limitation would be unlawful, including
        liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation.
      </p>

      <h2>15. Indemnity</h2>
      <p>
        You agree to indemnify and hold harmless ShelfSwap, its directors, employees, contractors and affiliates from
        any claims, liabilities, damages, losses and reasonable legal costs arising from:
      </p>
      <ul>
        <li>your breach of these Terms;</li>
        <li>your misuse of the Service;</li>
        <li>your content;</li>
        <li>your interactions with other users;</li>
        <li>your violation of any applicable law or the rights of another person.</li>
      </ul>

      <h2>16. Suspension and Termination</h2>
      <p>We may suspend or terminate your access to the Service if we reasonably believe you have:</p>
      <ul>
        <li>breached these Terms;</li>
        <li>engaged in fraudulent or unlawful activity;</li>
        <li>placed other users or the Service at risk.</li>
      </ul>
      <p>
        You may stop using the Service and delete your account at any time. Termination does not affect any rights or
        obligations that arose before termination.
      </p>

      <h2>17. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Where changes are material, we will provide reasonable notice
        through the Service or by email where appropriate. Your continued use of ShelfSwap after updated Terms take
        effect constitutes acceptance of the revised Terms.
      </p>

      <h2>18. Governing Law</h2>
      <p>
        These Terms are governed by the laws of England and Wales. Any disputes arising from these Terms or your use of
        ShelfSwap shall be subject to the exclusive jurisdiction of the courts of England and Wales, except where
        mandatory consumer protection laws provide otherwise.
      </p>

      <h2>19. General</h2>
      <p>
        If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue
        in full force and effect. Our failure to enforce any provision of these Terms shall not constitute a waiver of
        that provision or any other rights.
      </p>
      <p>
        We may transfer or assign our rights and obligations under these Terms in connection with a merger, acquisition,
        sale of assets or by operation of law. You may not transfer your rights or obligations without our prior written
        consent.
      </p>
      <p>
        We shall not be liable for any delay or failure to perform our obligations where caused by events beyond our
        reasonable control, including natural disasters, internet outages, cyberattacks, industrial disputes,
        governmental actions or failures of third-party infrastructure.
      </p>
      <p>
        These Terms constitute the entire agreement between you and ShelfSwap regarding your use of the Service and
        supersede any prior agreements or understandings relating to the Service.
      </p>

      <h2>20. Contact</h2>
      <p>
        If you have any questions about these Terms, please contact us via the email address provided on our{" "}
        <a href="/contact">Contact</a> page.
      </p>
    </LegalDocShell>
  );
}
