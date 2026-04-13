import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

/**
 * Password reset request (email link via Supabase).
 * Location: app/auth/forgot-password/page.tsx
 */
export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base-200 p-4">
      <ForgotPasswordForm />
    </div>
  );
}
