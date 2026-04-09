import { Bell, Sparkles } from "lucide-react";

export default function ActivityPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-2">
      <div className="rounded-full bg-accent/15 p-5 text-accent">
        <Bell className="h-10 w-10" strokeWidth={1.5} aria-hidden />
      </div>
      <div className="space-y-2 max-w-xs">
        <h1 className="shelfswap-heading text-xl font-semibold">No activity yet</h1>
        <p className="text-sm text-base-content/65">
          Unlocks, messages, and nearby drops will show up here. We&apos;ll wire notifications after
          credits and chat.
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-base-content/45">
        <Sparkles className="h-4 w-4" aria-hidden />
        <span>Coming soon</span>
      </div>
    </div>
  );
}
