import { LegalDocShell } from "@/components/marketing/LegalDocShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ShelfSwap handles personal data.",
};

/**
 * Privacy Policy (public).
 * Location: app/privacy/page.tsx
 */
export default function PrivacyPage() {
  return (
    <LegalDocShell title="Privacy Policy">
      <p className="text-xs text-base-content/60">Last Updated: 20/07/2026</p>

      <p>
        At ShelfSwap (&quot;ShelfSwap&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), we are committed to
        protecting your privacy and handling your personal information responsibly. This Privacy Policy explains what
        information we collect, how we use it, when we share it, and the choices and rights available to you when using
        our website, mobile application and related services (collectively, the &quot;Service&quot;).
      </p>
      <p>
        By creating an account or using the Service, you acknowledge that your personal information will be processed in
        accordance with this Privacy Policy.
      </p>

      <h2>1. Who We Are</h2>
      <p>
        ShelfSwap is an online platform that helps readers discover books, connect with one another and arrange local
        book exchanges. If you have any questions about this Privacy Policy or how we process your personal information,
        please contact us using the details provided on our <a href="/contact">Contact</a> page.
      </p>

      <h2>2. Information We Collect</h2>
      <p>Depending on how you use ShelfSwap, we may collect the following information.</p>

      <h3 className="!mt-4 !mb-1 !text-sm !font-semibold">Account Information</h3>
      <p>When you create an account, we may collect:</p>
      <ul>
        <li>Your name or display name</li>
        <li>Email address</li>
        <li>Authentication credentials</li>
        <li>Profile picture (if provided)</li>
        <li>Biography or profile information</li>
        <li>Account preferences</li>
      </ul>

      <h3 className="!mt-4 !mb-1 !text-sm !font-semibold">Book Listings</h3>
      <p>When you create a listing, we may collect:</p>
      <ul>
        <li>Book titles</li>
        <li>Authors</li>
        <li>ISBNs (where available)</li>
        <li>Book descriptions</li>
        <li>Photographs</li>
        <li>Listing status</li>
        <li>Any additional information you choose to include</li>
      </ul>

      <h3 className="!mt-4 !mb-1 !text-sm !font-semibold">Messages</h3>
      <p>
        If you communicate with other users through ShelfSwap, we process the messages you send and receive in order to
        provide our messaging service, help maintain the safety of the platform and investigate reports of misuse where
        necessary.
      </p>

      <h3 className="!mt-4 !mb-1 !text-sm !font-semibold">Approximate Location</h3>
      <p>
        To help readers discover books nearby, we may process your approximate location, such as your town, postcode
        district or general area. We do not display your precise home address to other users unless you choose to share
        it yourself.
      </p>

      <h3 className="!mt-4 !mb-1 !text-sm !font-semibold">Technical Information</h3>
      <p>When you use ShelfSwap, we may automatically collect certain technical information, including:</p>
      <ul>
        <li>Device type</li>
        <li>Browser type</li>
        <li>Operating system</li>
        <li>IP address</li>
        <li>Log files</li>
        <li>Crash reports</li>
        <li>Diagnostic information</li>
        <li>Security-related information</li>
        <li>Dates and times of access</li>
      </ul>
      <p>This information helps us operate, maintain and protect the Service.</p>

      <h2>3. How We Use Your Information</h2>
      <p>We use your information to:</p>
      <ul>
        <li>Create and manage your account</li>
        <li>Display your profile and book listings</li>
        <li>Enable communication between users</li>
        <li>Help readers discover books nearby</li>
        <li>Operate, maintain and improve ShelfSwap</li>
        <li>Detect fraud, spam and misuse</li>
        <li>Investigate reports and enforce our Terms &amp; Conditions</li>
        <li>Respond to enquiries and provide customer support</li>
        <li>Comply with our legal obligations</li>
      </ul>
      <p>
        Where applicable, we process your personal information because it is necessary to provide the Service, comply
        with legal obligations, pursue our legitimate interests in operating and improving ShelfSwap, or because you have
        given your consent where required, such as for marketing communications.
      </p>
      <p>If you choose to receive marketing communications, we may occasionally send you emails about:</p>
      <ul>
        <li>New features</li>
        <li>Product updates</li>
        <li>Community news</li>
        <li>Reader events</li>
        <li>Other ShelfSwap announcements</li>
      </ul>
      <p>
        You can unsubscribe from marketing emails at any time by using the unsubscribe link included in our emails or by
        updating your account preferences where available.
      </p>

      <h2>4. Sharing Your Information</h2>
      <p>
        We do not sell your personal information. We may share information with trusted third-party service providers who
        help us operate ShelfSwap, including providers of:
      </p>
      <ul>
        <li>Cloud hosting</li>
        <li>Authentication</li>
        <li>Databases</li>
        <li>Email delivery</li>
        <li>Analytics</li>
        <li>Security services</li>
      </ul>
      <p>
        These providers process information on our behalf and are required to protect it appropriately and process it
        only as permitted by applicable law.
      </p>
      <p>We may also disclose information where required by law or where reasonably necessary to:</p>
      <ul>
        <li>Comply with legal obligations</li>
        <li>Protect ShelfSwap, our users or the public</li>
        <li>Investigate suspected fraud or illegal activity</li>
        <li>Enforce our Terms &amp; Conditions</li>
        <li>Protect our legal rights</li>
      </ul>
      <p>
        Some of our service providers may process personal information outside the United Kingdom. Where this occurs, we
        take reasonable steps to ensure appropriate safeguards are in place to protect your personal information in
        accordance with applicable data protection laws.
      </p>

      <h2>5. Information Visible to Other Users</h2>
      <p>
        Certain information is visible to other users so that ShelfSwap can function as intended. This may include:
      </p>
      <ul>
        <li>Your display name</li>
        <li>Profile picture</li>
        <li>Biography (if provided)</li>
        <li>Book listings</li>
        <li>Book photographs</li>
        <li>Approximate location</li>
        <li>Messages you send to another user</li>
      </ul>
      <p>Please avoid sharing sensitive or confidential personal information through your profile or messages.</p>

      <h2>6. Data Retention</h2>
      <p>
        We retain your personal information only for as long as necessary to provide the Service, comply with legal
        obligations, resolve disputes and protect the integrity of ShelfSwap. If you delete your account, we will take
        reasonable steps to delete or anonymise your personal information, except where we are required or permitted by
        law to retain certain information. Backups may temporarily retain limited information before being securely
        overwritten.
      </p>

      <h2>7. Keeping Your Information Secure</h2>
      <p>
        We use appropriate technical and organisational measures designed to protect your personal information against
        unauthorised access, alteration, disclosure or destruction. While we work hard to safeguard your information, no
        method of transmitting or storing information over the internet can be guaranteed to be completely secure.
      </p>

      <h2>8. Your Rights</h2>
      <p>Depending on where you live, you may have the right to:</p>
      <ul>
        <li>Access your personal information</li>
        <li>Correct inaccurate or incomplete information</li>
        <li>Request deletion of your personal information</li>
        <li>Object to certain processing</li>
        <li>Request that we restrict certain processing</li>
        <li>Withdraw your consent where processing relies on consent</li>
        <li>Request a copy of your personal information in a portable format</li>
        <li>Lodge a complaint with your local data protection authority</li>
      </ul>
      <p>
        If you wish to exercise any of these rights, please contact us using the details provided on our{" "}
        <a href="/contact">Contact</a> page.
      </p>

      <h2>9. Cookies</h2>
      <p>
        ShelfSwap uses cookies and similar technologies that are necessary for the operation of the Service, such as
        keeping you signed in, remembering your preferences and maintaining the security of your account. If we introduce
        optional analytics, advertising or marketing cookies in the future, we will update this Privacy Policy and
        request your consent where required by applicable law. See also our <a href="/cookies">Cookie Policy</a>.
      </p>

      <h2>10. Age Requirement</h2>
      <p>
        ShelfSwap is intended for users aged 18 years or older. We do not knowingly permit individuals under the age of
        18 to create an account or use the Service. If we become aware that an account has been created by someone who
        does not meet this age requirement, we may suspend or remove the account and delete associated personal
        information where appropriate.
      </p>

      <h2>11. Changes to This Privacy Policy</h2>
      <p>
        We may update this Privacy Policy from time to time to reflect changes to ShelfSwap, our services or applicable
        laws. Where appropriate, we will notify users of significant changes through the Service or by email. The latest
        version of this Privacy Policy will always be available on this page, and the &quot;Last Updated&quot; date at
        the top of this Privacy Policy indicates when it was most recently revised.
      </p>

      <h2>12. Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy or how we process your personal information, please contact
        us using the details provided on our <a href="/contact">Contact</a> page.
      </p>
      <p>
        This Privacy Policy should be read alongside our <a href="/terms">Terms &amp; Conditions</a>,{" "}
        <a href="/cookies">Cookie Policy</a> and any other policies referenced within the Service.
      </p>
    </LegalDocShell>
  );
}
