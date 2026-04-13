import { SignInForm } from "@/components/auth/SignInForm";

type Props = {
  searchParams: Promise<{ next?: string; reset?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const { next, reset } = await searchParams;
  const defaultNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/app/home";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 p-4">
      <SignInForm
        defaultNext={defaultNext}
        passwordResetSuccess={reset === "ok"}
      />
    </div>
  );
}
