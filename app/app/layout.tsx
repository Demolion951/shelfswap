import { ensureProfileRow } from "@/app/auth/actions";
import { AppTopBar } from "@/components/nav/AppTopBar";
import { BottomTabs } from "@/components/nav/BottomTabs";
import { requireUser } from "@/lib/auth/requireUser";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  await ensureProfileRow();

  return (
    <div className="flex min-h-dvh flex-col bg-base-200 pb-[calc(4.25rem+env(safe-area-inset-bottom))]">
      <AppTopBar />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4">{children}</main>
      <BottomTabs />
    </div>
  );
}
