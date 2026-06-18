import { GuestAccountPrompt } from "@/components/auth/GuestAccountPrompt";
import { MessagesInboxList } from "@/components/messages/MessagesInboxList";
import { getOptionalUser } from "@/lib/auth/requireUser";
import { fetchInboxThreads } from "@/lib/messages/inbox";
import { getUnreadMessageListingIdsForUser } from "@/lib/notifications/queries";
import { createClient } from "@/lib/supabase/server";
import { MessageCircle } from "lucide-react";

/**
 * Messages inbox: all listing threads the user is part of (buyer or seller).
 * Location: app/app/messages/page.tsx
 */
export default async function MessagesPage() {
  const user = await getOptionalUser();
  if (!user) {
    return (
      <GuestAccountPrompt
        title="Messages"
        description="Sign in to chat with sellers and buyers after you unlock a listing."
        Icon={MessageCircle}
        returnTo="/app/messages"
      />
    );
  }

  const supabase = await createClient();
  const [threads, unreadListingIds] = await Promise.all([
    fetchInboxThreads(user.id),
    getUnreadMessageListingIdsForUser(supabase, user.id),
  ]);

  return (
    <div className="space-y-4 pb-6 pt-1">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-6 w-6 text-primary" aria-hidden />
        <h1 className="shelfswap-heading text-xl font-semibold">Messages</h1>
      </div>
      <MessagesInboxList
        threads={threads}
        unreadListingIds={[...unreadListingIds]}
      />
    </div>
  );
}
