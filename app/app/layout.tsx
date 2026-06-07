import { ensureProfileRow } from "@/app/auth/actions";
import { AutoApproxLocationUpdater } from "@/components/AutoApproxLocationUpdater";
import { AppTopBar } from "@/components/nav/AppTopBar";
import { BottomTabs } from "@/components/nav/BottomTabs";
import { getOptionalUser } from "@/lib/auth/requireUser";
import {
  getUnreadMessageNotificationCountForUser,
  getUnreadNotificationCountForUser,
} from "@/lib/notifications/queries";
import { createClient } from "@/lib/supabase/server";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOptionalUser();
  const isSignedIn = !!user;

  let unreadNotifications = 0;
  let unreadMessages = 0;

  if (user) {
    const supabase = await createClient();
    const [, notifCount, msgCount] = await Promise.all([
      ensureProfileRow(),
      getUnreadNotificationCountForUser(supabase, user.id),
      getUnreadMessageNotificationCountForUser(supabase, user.id),
    ]);
    unreadNotifications = notifCount;
    unreadMessages = msgCount;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-base-200 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
      <AppTopBar isSignedIn={isSignedIn} unreadCount={unreadNotifications} />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 space-y-4">
        {isSignedIn ? <AutoApproxLocationUpdater /> : null}
        {children}
      </main>
      <BottomTabs isSignedIn={isSignedIn} unreadMessagesCount={unreadMessages} />
    </div>
  );
}
