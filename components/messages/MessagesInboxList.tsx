import { LocalDateTimeText } from "@/components/messages/LocalDateTimeText";
import { coverImageSrcForDisplay } from "@/lib/books/openLibraryCoverDisplay";
import type { InboxThread } from "@/lib/messages/inbox";
import Link from "next/link";

/**
 * Inbox of listing threads (buying / selling) with last message preview; links to listing detail.
 * Location: components/messages/MessagesInboxList.tsx
 */
type Props = {
  threads: InboxThread[];
};

export function MessagesInboxList({ threads }: Props) {
  if (threads.length === 0) {
    return (
      <div className="rounded-xl border border-base-300/80 bg-base-100 p-6 text-center text-sm text-base-content/60">
        <p className="mb-1 font-medium text-base-content">No conversations yet</p>
        <p>
          Unlock a listing to message a seller, or wait for buyers on your listings — threads will
          show up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {threads.map((t) => {
        const thumbRaw = t.coverUrl ? coverImageSrcForDisplay(t.coverUrl) ?? t.coverUrl : null;
        return (
          <li key={`${t.role}-${t.listingId}`}>
            <Link
              href={`/app/listings/${t.listingId}`}
              className="card card-border bg-base-100 border-base-300/80 shadow-sm transition hover:border-primary/30"
            >
              <div className="card-body flex-row gap-3 p-3">
                <figure className="relative h-[4.5rem] w-12 shrink-0 overflow-hidden rounded-md bg-base-300">
                  {thumbRaw ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbRaw}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[9px] text-base-content/35 px-0.5 text-center">
                      No cover
                    </div>
                  )}
                </figure>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="shelfswap-heading line-clamp-1 text-sm font-semibold leading-tight">
                      {t.title}
                    </h2>
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
                      {t.unlockCount} unlock{t.unlockCount === 1 ? "" : "s"} · shared thread
                    </p>
                  ) : null}
                  {t.preview ? (
                    <p className="mt-1 line-clamp-2 text-xs text-base-content/70">{t.preview}</p>
                  ) : (
                    <p className="mt-1 text-xs italic text-base-content/45">No messages yet</p>
                  )}
                  <LocalDateTimeText
                    iso={t.lastActivityAt}
                    className="mt-1 block text-[10px] text-base-content/40"
                  />
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
