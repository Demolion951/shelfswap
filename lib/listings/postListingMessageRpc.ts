import type { SupabaseClient } from "@supabase/supabase-js";

type RpcPayload = { ok?: boolean; error?: string } | null;

type PostMessageArgs = {
  listingId: string;
  body: string;
  imageUrl?: string | null;
  threadBuyerId?: string | null;
};

function isLegacyPostMessageRpcError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42883") return true;
  const msg = (error.message ?? "").toLowerCase();
  return (
    msg.includes("post_listing_message") &&
    (msg.includes("does not exist") ||
      msg.includes("could not find") ||
      msg.includes("p_thread_buyer_id"))
  );
}

/** Calls post_listing_message; retries without thread param when migration not applied yet. */
export async function postListingMessageRpc(
  supabase: SupabaseClient,
  args: PostMessageArgs,
): Promise<{ data: RpcPayload; error: { message: string; code?: string } | null }> {
  const base: Record<string, string | null> = {
    p_listing_id: args.listingId,
    p_body: args.body,
  };
  if (args.imageUrl) {
    base.p_image_url = args.imageUrl;
  }

  const withThread =
    args.threadBuyerId != null && args.threadBuyerId.length > 0
      ? { ...base, p_thread_buyer_id: args.threadBuyerId }
      : base;

  let result = await supabase.rpc("post_listing_message", withThread);

  if (result.error && isLegacyPostMessageRpcError(result.error)) {
    result = await supabase.rpc("post_listing_message", base);
  }

  return {
    data: result.data as RpcPayload,
    error: result.error,
  };
}
