import { SignUpForm } from "@/components/auth/SignUpForm";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignUpPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const defaultNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/app/home";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 p-4">
      <SignUpForm defaultNext={defaultNext} />
    </div>
  );
}
