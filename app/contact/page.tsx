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
      <p>
        For account issues, bugs, safety concerns, or general questions, email us and we will do our best to
        reply within a few business days.
      </p>
      <p>
        <a href={mailto} className="link link-primary font-medium text-base">
          {email}
        </a>
      </p>
      <p className="text-xs text-base-content/55">
        To change this address in production, set <code className="text-[0.7rem] bg-base-200 px-1 rounded">NEXT_PUBLIC_SUPPORT_EMAIL</code> in your
        deployment environment.
      </p>
    </LegalDocShell>
  );
}
