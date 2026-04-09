"use server";

import { getPackById } from "@/lib/credits/packs";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PurchasePackResult =
  | { ok: true; newBalance: number }
  | { ok: false; error: string };

/**
 * Dev / sandbox: grants credits when SUPABASE_SERVICE_ROLE_KEY + ALLOW_DEV_CREDIT_PURCHASE=1.
 * Production card payments: replace with Stripe Checkout + webhook calling the same RPC.
 */
export async function purchaseCreditPack(packId: string): Promise<PurchasePackResult> {
  const pack = getPackById(packId);
  if (!pack) {
    return { ok: false, error: "Unknown pack." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: "Sign in to buy credits." };
  }

  const devOk = process.env.ALLOW_DEV_CREDIT_PURCHASE === "1";
  if (!devOk) {
    return {
      ok: false,
      error:
        "Card checkout is not enabled yet. When Stripe is connected, you will pay here and credits will appear instantly. For local testing, set ALLOW_DEV_CREDIT_PURCHASE=1 and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    };
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return {
      ok: false,
      error: "Server is missing SUPABASE_SERVICE_ROLE_KEY — cannot grant credits.",
    };
  }

  const { data, error } = await admin.rpc("add_credits_to_user", {
    p_user_id: user.id,
    p_delta: pack.credits,
  });

  if (error) {
    console.error("[purchaseCreditPack] rpc", error.message);
    return { ok: false, error: error.message };
  }

  const newBalance = typeof data === "number" ? data : Number(data);
  if (!Number.isFinite(newBalance)) {
    return { ok: false, error: "Unexpected response from wallet." };
  }

  revalidatePath("/app/credits");
  revalidatePath("/app/profile");
  return { ok: true, newBalance };
}
