import { redirect } from "next/navigation";

/**
 * Legacy credits wallet — redirects to Premium subscription page.
 * Location: app/app/credits/page.tsx
 */
export default function CreditsPage() {
  redirect("/app/subscribe");
}
