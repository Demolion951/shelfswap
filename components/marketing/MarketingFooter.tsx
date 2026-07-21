/**
 * Compact footer with links to help and legal pages for marketing/auth shells.
 * Location: components/marketing/MarketingFooter.tsx
 */
import Link from "next/link";

const links = [
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
] as const;

export function MarketingFooter() {
  return (
    <footer className="mt-8 w-full max-w-md text-center text-xs text-base-content/55">
      <nav aria-label="Legal and help" className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        {links.map(({ href, label }, i) => (
          <span key={href} className="inline-flex items-center gap-x-2">
            {i > 0 ? (
              <span className="select-none text-base-content/25" aria-hidden>
                |
              </span>
            ) : null}
            <Link href={href} className="link link-hover text-base-content/70">
              {label}
            </Link>
          </span>
        ))}
      </nav>
    </footer>
  );
}
