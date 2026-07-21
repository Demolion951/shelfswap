import { LegalDocShell } from "@/components/marketing/LegalDocShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How ShelfSwap uses cookies and similar technologies.",
};

/**
 * Cookie Policy (public) — referenced from Privacy Policy.
 * Location: app/cookies/page.tsx
 */
export default function CookiesPage() {
  return (
    <LegalDocShell title="Cookie Policy">
      <p className="text-xs text-base-content/60">Last Updated: 20/07/2026</p>

      <p>
        This Cookie Policy explains how ShelfSwap (&quot;ShelfSwap&quot;, &quot;we&quot;, &quot;our&quot;, or
        &quot;us&quot;) uses cookies and similar technologies on our website, mobile application and related services
        (collectively, the &quot;Service&quot;).
      </p>

      <h2>What are cookies?</h2>
      <p>
        Cookies are small text files stored on your device when you visit a website or use an app. Similar technologies
        may include local storage and session identifiers used to keep you signed in and protect your account.
      </p>

      <h2>How we use cookies</h2>
      <p>
        ShelfSwap uses cookies and similar technologies that are necessary for the operation of the Service, such as:
      </p>
      <ul>
        <li>keeping you signed in;</li>
        <li>remembering your preferences;</li>
        <li>maintaining the security of your account.</li>
      </ul>

      <h2>Optional cookies</h2>
      <p>
        If we introduce optional analytics, advertising or marketing cookies in the future, we will update this Cookie
        Policy and request your consent where required by applicable law.
      </p>

      <h2>More information</h2>
      <p>
        For details on how we handle personal information more broadly, see our{" "}
        <a href="/privacy">Privacy Policy</a>. Questions? Visit our <a href="/contact">Contact</a> page.
      </p>
    </LegalDocShell>
  );
}
