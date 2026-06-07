"use client";

/**
 * Listing-scoped chat: seller, unlocked buyers, and buyers with a pending unlock request.
 * Location: components/listings/ListingMessagesThread.tsx
 */
import { sendListingMessageAction } from "@/app/app/listings/private-actions";
import { LocalDateTimeText } from "@/components/messages/LocalDateTimeText";
import type { ListingMessageRow } from "@/lib/listings/queries";
import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

type Props = {
  listingId: string;
  messages: ListingMessageRow[];
  currentUserId: string | null;
};

export function ListingMessagesThread({ listingId, messages, currentUserId }: Props) {
  const [localMessages, setLocalMessages] = useState(messages);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastId = localMessages.length ? localMessages[localMessages.length - 1]?.id : "";

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [localMessages.length, lastId]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || !currentUserId) return;
    setError(null);
    const fd = new FormData();
    fd.set("listing_id", listingId);
    fd.set("body", trimmed);
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: ListingMessageRow = {
      id: optimisticId,
      listing_id: listingId,
      sender_id: currentUserId,
      sender_display_name: "You",
      body: trimmed,
      created_at: new Date().toISOString(),
    };
    setBody("");
    setLocalMessages((prev) => [...prev, optimistic]);
    startTransition(async () => {
      const res = await sendListingMessageAction(fd);
      if (!res.ok) {
        setLocalMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setBody(trimmed);
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-base-300/80 bg-base-200/30 p-3">
        {localMessages.length === 0 ? null : (
          localMessages.map((m) => {
            const mine = currentUserId !== null && m.sender_id === currentUserId;
            return (
              <div
                key={m.id}
                className={`chat ${mine ? "chat-end" : "chat-start"}`}
              >
                <div className="chat-header text-[10px] opacity-70">
                  {mine ? "You" : m.sender_display_name}
                  <LocalDateTimeText iso={m.created_at} className="ml-1 opacity-60 inline" />
                </div>
                <div
                  className={`chat-bubble text-sm ${
                    mine ? "chat-bubble-primary" : "chat-bubble-secondary"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <form className="flex flex-col gap-2" onSubmit={onSubmit}>
        <textarea
          className="textarea textarea-bordered min-h-20 w-full text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          maxLength={2000}
          disabled={pending}
          aria-label="Message"
        />
        {error ? (
          <div role="alert" className="alert alert-error text-sm py-2">
            {error}
          </div>
        ) : null}
        <button type="submit" className="btn btn-primary btn-sm gap-2 self-end" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          Send
        </button>
      </form>
    </div>
  );
}
