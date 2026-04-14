"use client";

/**
 * Sign-out control using the server action from a client boundary (avoids RSC/action binding edge cases on some hosts).
 * Location: components/auth/SignOutForm.tsx
 */
import { signOut } from "@/app/auth/actions";
import { LogOut } from "lucide-react";

type Props = {
  /** Optional class on the form element (e.g. pt-4). */
  className?: string;
};

export function SignOutForm({ className }: Props) {
  return (
    <form action={signOut} className={className}>
      <button type="submit" className="btn btn-ghost btn-block gap-2 text-base-content/70">
        <LogOut className="h-4 w-4" aria-hidden />
        Sign out
      </button>
    </form>
  );
}
