"use client";

/**
 * Formats an ISO timestamp in the viewer's local timezone (fixes SSR UTC drift on the inbox).
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
