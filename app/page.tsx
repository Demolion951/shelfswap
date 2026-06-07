import { redirect } from "next/navigation";

/**
 * Root URL opens the browse feed — guests and signed-in users land on the same app home.
 * Marketing/legal pages live at /faq, /contact, /terms, /privacy; auth at /auth/*.
 * Location: app/page.tsx
 */
export default function RootPage() {
  redirect("/app/home");
}
