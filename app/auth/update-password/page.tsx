import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

/**
 * Completes password reset after Supabase redirects here from the email link.
 * Location: app/auth/update-password/page.tsx
 */
export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-base-200 p-4">
      <div className="flex flex-1 flex-col items-center justify-center">
        <UpdatePasswordForm />
      </div>
      <div className="flex shrink-0 flex-col items-center pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <MarketingFooter />
      </div>
    </div>
  );
}
