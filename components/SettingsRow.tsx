/**
 * Reusable row for the Settings page (icon, title, helper text, right chevron).
 * Server Component: parents pass Lucide icon components; do not mark "use client"
 * or RSC parents cannot pass Icon (non-serializable across the server/client boundary).
 * Location: components/SettingsRow.tsx
 */
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

type Props = {
  href: string;
  Icon: LucideIcon;
  title: string;
  description?: string;
};

export function SettingsRow({ href, Icon, title, description }: Props) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-base-200/60">
        <Icon className="h-5 w-5 shrink-0 text-primary/80" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-base-content">{title}</div>
          {description ? (
            <div className="text-xs text-base-content/55 leading-snug">
              {description}
            </div>
          ) : null}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-base-content/40" aria-hidden />
      </Link>
    </li>
  );
}

