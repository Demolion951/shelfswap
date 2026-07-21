import { ensureProfileRowIfNeeded } from "@/lib/auth/ensureProfile";
import { AutoApproxLocationUpdater } from "@/components/AutoApproxLocationUpdater";
import { AppTopBar } from "@/components/nav/AppTopBar";
import { BadgeCountsProvider } from "@/components/nav/BadgeCountsProvider";
import { BottomTabs } from "@/components/nav/BottomTabs";
import { getOptionalUser } from "@/lib/auth/requireUser";
import { getBadgeCountsForUser } from "@/lib/notifications/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * App shell: top bar + tabs. Profile ensure is cookie-gated so tab switches skip that DB hit.
 * Location: app/app/layout.tsx
 */
export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOptionalUser();
  const isSignedIn = !!user;

  let badgeCounts = { unreadNotifications: 0, unreadMessages: 0 };

  if (user) {
    const supabase = await createClient();
    const [, counts] = await Promise.all([
      ensureProfileRowIfNeeded(),
      getBadgeCountsForUser(supabase, user.id),
    ]);
    badgeCounts = counts;
  }

  return (
    <BadgeCountsProvider initialCounts={badgeCounts}>
      <div className="flex min-h-dvh flex-col bg-base-200 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
        <AppTopBar isSignedIn={isSignedIn} />
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 space-y-4">
          {isSignedIn ? <AutoApproxLocationUpdater /> : null}
          {children}
        </main>
        <BottomTabs isSignedIn={isSignedIn} />
      </div>
    </BadgeCountsProvider>
  );
}
