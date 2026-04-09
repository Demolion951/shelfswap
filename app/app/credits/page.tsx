import { CreditPurchaseSection } from "@/components/credits/CreditPurchaseSection";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

/**
 * Wallet + credit pack purchase (Stripe later; dev instant grant when env allows).
 * Location: app/app/credits/page.tsx
 */
export default async function CreditsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialBalance = 0;
  if (user) {
    const { data: row } = await supabase
      .from("profiles")
      .select("credit_balance")
      .eq("id", user.id)
      .maybeSingle();
    const raw = row?.credit_balance;
    initialBalance = typeof raw === "number" ? raw : Number(raw ?? 0) || 0;
  }

  const devPurchasesEnabled = process.env.ALLOW_DEV_CREDIT_PURCHASE === "1";

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="shelfswap-heading text-2xl font-semibold text-primary">Credits</h1>
        <p className="mt-1 text-sm text-base-content/65">
          Spend credits to unlock listings — then see pickup area and chat with the seller.
        </p>
      </div>

      <CreditPurchaseSection
        initialBalance={initialBalance}
        devPurchasesEnabled={devPurchasesEnabled}
      />

      <p className="text-center text-xs text-base-content/50">
        <Link href="/app/profile" className="link link-primary">
          Back to profile
        </Link>
      </p>
    </div>
  );
}
