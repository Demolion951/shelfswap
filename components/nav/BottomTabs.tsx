"use client";

/**
 * Mobile-first bottom tab bar for the authenticated app shell (/app/*).
 * Centred icons and labels; slightly taller touch targets for a cleaner layout.
 * Location: components/nav/BottomTabs.tsx
 */
import { Home, MessageCircle, PlusCircle, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/app/home", label: "Home", Icon: Home },
  { href: "/app/search", label: "Search", Icon: Search },
  { href: "/app/sell", label: "Add", Icon: PlusCircle },
  { href: "/app/messages", label: "Messages", Icon: MessageCircle },
  { href: "/app/profile", label: "Profile", Icon: UserRound },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/app/home") {
    return pathname === "/app/home" || pathname === "/app";
  }
  if (href === "/app/search") {
    return (
      pathname.startsWith("/app/search") ||
      pathname.startsWith("/app/listings")
    );
  }
  if (href === "/app/messages") {
    return pathname.startsWith("/app/messages");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type Props = {
  unreadMessagesCount: number;
};

export function BottomTabs({ unreadMessagesCount }: Props) {
  const pathname = usePathname();
  const msgBadge =
    unreadMessagesCount > 9 ? "9+" : unreadMessagesCount > 0 ? String(unreadMessagesCount) : null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-base-300/70 bg-base-100/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md supports-[backdrop-filter]:bg-base-100/80"
      aria-label="Main navigation"
    >
      <ul className="mx-auto flex h-[4.5rem] max-w-lg items-stretch justify-around px-1">
        {tabs.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex min-w-0 flex-1">
              <Link
                href={href}
                prefetch={true}
                className={`flex flex-1 flex-col items-center justify-center gap-1 px-0.5 text-[10px] font-medium tracking-wide transition-colors ${
                  active
                    ? "text-primary"
                    : "text-base-content/50 hover:text-base-content/80"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-primary/12" : ""
                  } ${href === "/app/messages" ? "indicator" : ""}`}
                >
                  {href === "/app/messages" && msgBadge ? (
                    <span className="indicator-item badge badge-primary badge-xs min-w-[1.1rem] px-1">
                      {msgBadge}
                    </span>
                  ) : null}
                  <Icon
                    className="h-[1.35rem] w-[1.35rem]"
                    strokeWidth={active ? 2.25 : 1.85}
                    aria-hidden
                  />
                </span>
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
