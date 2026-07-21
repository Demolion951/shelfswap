import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { LegalDocShell } from "@/components/marketing/LegalDocShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about ShelfSwap.",
};

/**
 * Frequently asked questions (public) — accordion layout.
 * Location: app/faq/page.tsx
 */
export default function FaqPage() {
  return (
    <LegalDocShell title="FAQs">
      <div className="not-prose">
        <FaqAccordion />
      </div>
    </LegalDocShell>
  );
}
