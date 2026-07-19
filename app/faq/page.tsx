import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { LegalDocShell } from "@/components/marketing/LegalDocShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Common questions about ShelfSwap — free listing and messaging, karma, swaps, and how deals work.",
};

/**
 * Frequently asked questions (public) — sectioned accordion layout.
 * Location: app/faq/page.tsx
 */
export default function FaqPage() {
  return (
    <LegalDocShell title="Frequently asked questions">
      <p className="!mt-0 text-base-content/70">
        Tap a question to expand it. Still stuck? Use the{" "}
        <a href="/contact">Contact</a> page.
      </p>

      <div className="not-prose mt-6">
        <FaqAccordion />
      </div>
    </LegalDocShell>
  );
}
