"use client";

/**
 * Formats an ISO timestamp in the viewer’s local timezone (avoids server-rendered UTC drift).
 * Use for inbox rows, listing threads, and Activity feed timestamps so times stay aligned.
 * Location: components/messages/LocalDateTimeText.tsx
 */
export function LocalDateTimeText({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return (
    <time dateTime={iso} className={className}>
      {d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </time>
  );
}
