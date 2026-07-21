import { LegalDocShell } from "@/components/marketing/LegalDocShell";
import { supportEmail, supportMailtoHref } from "@/lib/site/support";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact ShelfSwap support.",
};

/**
 * Support contact (public). Email comes from lib/site/support.ts (env override supported).
 * Location: app/contact/page.tsx
 */
export default function ContactPage() {
  const email = supportEmail();
  const mailto = supportMailtoHref();

  return (
    <LegalDocShell title="Contact">
      <p>Questions, feedback, or need help with your account? We&apos;d love to hear from you.</p>
      <p>
        <a href={mailto} className="link link-primary font-semibold text-base">
          {email}
        </a>
      </p>
    </LegalDocShell>
  );
}
