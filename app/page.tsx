import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, ArrowRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/app/home");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-base-200">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-10 px-6 py-16">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BookOpen className="h-9 w-9" strokeWidth={1.5} aria-hidden />
          </div>
          <h1 className="shelfswap-heading text-4xl font-semibold text-primary">
            ShelfSwap
          </h1>
          <p className="text-base text-base-content/70 leading-relaxed">
            List and discover books near you. Browse for free — unlock to meet up and chat.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link href="/auth/sign-up" className="btn btn-primary btn-lg gap-2 shadow-md">
            Get started
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          <Link href="/auth/sign-in" className="btn btn-ghost btn-lg border border-base-300">
            Sign in
          </Link>
        </div>
        <MarketingFooter />
      </div>
    </div>
  );
}
