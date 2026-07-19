"use client";

/**
 * Inbox of listing threads with unread indicators; opening a thread syncs badge counts.
 * Location: components/messages/MessagesInboxList.tsx
 */
import { MarkListingReadLink } from "@/components/activity/MarkListingReadLink";
import { CoverImageChain } from "@/components/listings/CoverImageChain";
import { LocalDateTimeText } from "@/components/messages/LocalDateTimeText";
import type { InboxThread } from "@/lib/messages/inbox";

type Props = {
  threads: InboxThread[];
  unreadListingIds: string[];
};

export function MessagesInboxList({ threads, unreadListingIds }: Props) {
  const unreadSet = new Set(unreadListingIds);

  if (threads.length === 0) {
    return (
      <div className="rounded-xl border border-base-300/80 bg-base-100 p-6 text-center text-sm text-base-content/60">
        <p className="mb-1 font-medium text-base-content">No conversations yet</p>
        <p>
          Request unlock or wait for buyers — conversations appear here once there&apos;s
          activity.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {threads.map((t) => {
        const unread = unreadSet.has(t.listingId);
        return (
          <li key={`${t.role}-${t.listingId}`}>
            <MarkListingReadLink
              listingId={t.listingId}
              href={`/app/listings/${t.listingId}`}
              clearMessageAlerts={unread}
              className={`card card-border bg-base-100 shadow-sm transition hover:border-primary/30 ${
                unread ? "border-primary/35" : "border-base-300/80"
              }`}
            >
              <div className="card-body flex-row gap-3 p-3">
                <figure className="relative h-[4.5rem] w-12 shrink-0 overflow-hidden rounded-md bg-base-300">
                  <CoverImageChain
                    candidates={t.coverCandidates}
                    className="h-full w-full object-cover"
                    noCoverClassName="h-full w-full bg-base-300/50"
                    loading="lazy"
                  />
                  {unread ? (
                    <span
                      className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-base-100"
                      aria-hidden
                    />
                  ) : null}
                </figure>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="shelfswap-heading line-clamp-1 text-sm font-semibold leading-tight">
                      {t.title}
                    </h2>
                    {unread ? (
                      <span className="badge badge-primary badge-xs">New</span>
                    ) : null}
                    <span
                      className={
                        t.role === "seller"
                          ? "badge badge-ghost badge-xs border-primary/20 text-primary"
                          : "badge badge-ghost badge-xs border-secondary/25 text-secondary"
                      }
                    >
                      {t.role === "seller" ? "Selling" : "Buying"}
                    </span>
                  </div>
                  {t.author ? (
                    <p className="line-clamp-1 text-[11px] text-base-content/50">{t.author}</p>
                  ) : null}
                  {t.role === "seller" && t.unlockCount > 0 ? (
                    <p className="text-[10px] text-base-content/45 mt-0.5">
                      {t.unlockCount} conversation{t.unlockCount === 1 ? "" : "s"}
                    </p>
                  ) : null}
                  {t.preview ? (
                    <p
                      className={`mt-1 line-clamp-2 text-xs ${
                        unread ? "font-medium text-base-content" : "text-base-content/70"
                      }`}
                    >
                      {t.preview}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs italic text-base-content/45">No messages yet</p>
                  )}
                  <LocalDateTimeText
                    iso={t.lastActivityAt}
                    className="mt-1 block text-[10px] text-base-content/40"
                  />
                </div>
              </div>
            </MarkListingReadLink>
          </li>
        );
      })}
    </ul>
  );
}
