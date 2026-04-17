import { SignUpForm } from "@/components/auth/SignUpForm";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignUpPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const defaultNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/app/home";

  return (
    <div className="flex min-h-dvh flex-col bg-base-200 p-4">
      <div className="flex flex-1 flex-col items-center justify-center">
        <SignUpForm defaultNext={defaultNext} />
      </div>
      <div className="flex shrink-0 flex-col items-center pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <MarketingFooter />
      </div>
    </div>
  );
}
