import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";

/**
 * Completes password reset after Supabase redirects here from the email link.
 * Location: app/auth/update-password/page.tsx
 */
export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base-200 p-4">
      <UpdatePasswordForm />
    </div>
  );
}
