import { SignInForm } from "@/components/auth/SignInForm";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

type Props = {
  searchParams: Promise<{ next?: string; reset?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const { next, reset } = await searchParams;
  const defaultNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/app/home";

  return (
    <div className="flex min-h-dvh flex-col bg-base-200 p-4">
      <div className="flex flex-1 flex-col items-center justify-center">
        <SignInForm
          defaultNext={defaultNext}
          passwordResetSuccess={reset === "ok"}
        />
      </div>
      <div className="flex shrink-0 flex-col items-center pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <MarketingFooter />
      </div>
    </div>
  );
}
