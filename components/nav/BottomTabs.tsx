"use client";

/**
 * Mobile-first bottom tab bar for the authenticated app shell (/app/*).
 * Icons via lucide-react; active state from pathname.
 */
import { Home, MessageCircle, PlusCircle, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/app/home", label: "Home", Icon: Home },
  { href: "/app/search", label: "Search", Icon: Search },
  { href: "/app/messages", label: "Messages", Icon: MessageCircle },
  { href: "/app/sell", label: "Add", Icon: PlusCircle },
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
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-base-300/90 bg-base-100/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      aria-label="Main navigation"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {tabs.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                prefetch={true}
                className={`flex flex-col items-center gap-0.5 py-2 text-[9px] font-medium transition-colors ${
                  active
                    ? "text-primary"
                    : "text-base-content/55 hover:text-base-content"
                }`}
              >
                <span className={href === "/app/messages" ? "indicator" : ""}>
                  {href === "/app/messages" && msgBadge ? (
                    <span className="indicator-item badge badge-primary badge-xs min-w-[1.1rem] px-1">
                      {msgBadge}
                    </span>
                  ) : null}
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={active ? 2.25 : 1.75}
                    aria-hidden
                  />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
