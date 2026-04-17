import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

/**
 * Password reset request (email link via Supabase).
 * Location: app/auth/forgot-password/page.tsx
 */
export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-base-200 p-4">
      <div className="flex flex-1 flex-col items-center justify-center">
        <ForgotPasswordForm />
      </div>
      <div className="flex shrink-0 flex-col items-center pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <MarketingFooter />
      </div>
    </div>
  );
}
