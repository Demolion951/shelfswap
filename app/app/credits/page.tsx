import { CreditPurchaseSection } from "@/components/credits/CreditPurchaseSection";
import { CREDIT_PACKS } from "@/lib/credits/packs";
import { stripePriceIdForPack } from "@/lib/stripe/prices";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

/**
 * Wallet + credit pack purchase (Stripe Checkout + webhook, or dev grant).
 * Location: app/app/credits/page.tsx
 */
function stripeCheckoutPackIds(): string[] {
  if (!getStripe()) return [];
  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) return [];
  return CREDIT_PACKS.map((p) => p.id).filter((id) => Boolean(stripePriceIdForPack(id)));
}

type PageProps = {
  searchParams: Promise<{ session_id?: string; canceled?: string }>;
};

export default async function CreditsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
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
  const checkoutPackIds = stripeCheckoutPackIds();

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="shelfswap-heading text-2xl font-semibold text-primary">Credits</h1>
        <p className="mt-1 text-sm text-base-content/65">
          Spend credits to unlock listings — then see pickup area and chat with the seller.
        </p>
      </div>

      {sp.session_id ? (
        <div role="status" className="alert alert-success text-sm">
          Payment received. If credits don&apos;t update in a few seconds, refresh this page — the
          webhook may still be processing.
        </div>
      ) : null}

      {sp.canceled === "1" ? (
        <div role="status" className="alert alert-warning text-sm">
          Checkout was canceled. No charge was made.
        </div>
      ) : null}

      <CreditPurchaseSection
        initialBalance={initialBalance}
        devPurchasesEnabled={devPurchasesEnabled}
        stripeCheckoutPackIds={checkoutPackIds}
      />

      <p className="text-center text-xs text-base-content/50">
        <Link href="/app/profile" className="link link-primary">
          Back to profile
        </Link>
      </p>
    </div>
  );
}
