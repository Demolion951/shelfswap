/**
 * Sign-in / sign-up prompt when guests open account-only areas (profile, sell, messages).
 * Location: components/auth/GuestAccountPrompt.tsx
 */
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type Props = {
  title?: string;
  description: string;
  Icon: LucideIcon;
  /** App path to return to after auth (query: next=). */
  returnTo: string;
  showBrowseLink?: boolean;
};

export function GuestAccountPrompt({
  title = "Sign in to continue",
  description,
  Icon,
  returnTo,
  showBrowseLink = true,
}: Props) {
  const next = encodeURIComponent(returnTo);
  const signInHref = `/auth/sign-in?next=${next}`;
  const signUpHref = `/auth/sign-up?next=${next}`;

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-14 text-center px-2">
      <div className="rounded-full bg-primary/12 p-5 text-primary">
        <Icon className="h-10 w-10" strokeWidth={1.5} aria-hidden />
      </div>
      <div className="space-y-2 max-w-xs">
        <h1 className="shelfswap-heading text-xl font-semibold">{title}</h1>
        <p className="text-sm text-base-content/65 leading-relaxed">{description}</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Link href={signInHref} className="btn btn-primary">
          Sign in
        </Link>
        <Link href={signUpHref} className="btn btn-outline btn-primary">
          Create account
        </Link>
      </div>
      {showBrowseLink ? (
        <Link href="/app/home" className="link link-neutral text-sm">
          Continue browsing
        </Link>
      ) : null}
    </div>
  );
}
