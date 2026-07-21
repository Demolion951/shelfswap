/**
 * Simple layout for static legal/help pages: back link, title, prose content.
 * Location: components/marketing/LegalDocShell.tsx
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Props = {
  title: string;
  children: React.ReactNode;
};

export function LegalDocShell({ title, children }: Props) {
  return (
    <div className="min-h-dvh bg-base-200">
      <div className="mx-auto max-w-2xl px-4 py-8 pb-16">
        <Link
          href="/"
          className="btn btn-ghost btn-sm -ml-2 mb-6 gap-1 text-base-content/80"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Home
        </Link>
        <article className="rounded-2xl border border-base-300/80 bg-base-100 p-6 shadow-sm sm:p-8">
          <h1 className="shelfswap-heading text-2xl font-semibold text-primary mb-6">{title}</h1>
          <div className="space-y-4 text-sm text-base-content/90 leading-relaxed [&_h2]:shelfswap-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-primary [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:link [&_a]:link-primary">
            {children}
          </div>
        </article>
      </div>
    </div>
  );
}
