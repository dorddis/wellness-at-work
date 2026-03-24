import { Webhook } from "@creem_io/nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazy-initialize Supabase client (env vars not available at build time)
let _supabase: SupabaseClient | null = null;
function getSupabaseAdmin() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

export const POST = Webhook({
  webhookSecret: process.env.CREEM_WEBHOOK_SECRET!,

  onCheckoutCompleted: async ({ customer, product, metadata }) => {
    const orgId = metadata?.referenceId as string;
    if (!orgId) {
      console.error("[Creem Webhook] No referenceId (orgId) in checkout metadata");
      return;
    }

    console.log(`[Creem Webhook] Checkout completed: org=${orgId}, customer=${customer.email}, product=${product.name}`);

    // Store Creem customer ID on the org
    await getSupabaseAdmin()
      .from("organizations")
      .update({
        creem_customer_id: customer.id,
        billing_email: customer.email,
      })
      .eq("id", orgId);
  },

  onGrantAccess: async ({ reason, customer, product, metadata }) => {
    const orgId = metadata?.referenceId as string;
    if (!orgId) {
      console.error("[Creem Webhook] No referenceId (orgId) in grant access");
      return;
    }

    console.log(`[Creem Webhook] Grant access: org=${orgId}, reason=${reason}, product=${product.name}`);

    // Determine tier from product name/price
    const tier = product.name?.toLowerCase().includes("pro") ? "pro" : "starter";
    const seatLimit = tier === "pro" ? 200 : 25;

    await getSupabaseAdmin()
      .from("organizations")
      .update({
        subscription_status: "active",
        subscription_tier: tier,
        seat_limit: seatLimit,
        creem_customer_id: customer.id,
        billing_email: customer.email,
      })
      .eq("id", orgId);
  },

  onRevokeAccess: async ({ reason, customer, product, metadata }) => {
    const orgId = metadata?.referenceId as string;
    if (!orgId) {
      console.error("[Creem Webhook] No referenceId (orgId) in revoke access");
      return;
    }

    console.log(`[Creem Webhook] Revoke access: org=${orgId}, reason=${reason}`);

    await getSupabaseAdmin()
      .from("organizations")
      .update({
        subscription_status: reason === "paused" ? "paused" : "expired",
      })
      .eq("id", orgId);
  },

  onSubscriptionActive: async (data) => {
    console.log("[Creem Webhook] Subscription active:", data);
  },

  onSubscriptionCanceled: async (data) => {
    console.log("[Creem Webhook] Subscription canceled:", data);
  },

  onSubscriptionPastDue: async (data) => {
    const orgId = data?.metadata?.referenceId as string;
    if (!orgId) return;

    await getSupabaseAdmin()
      .from("organizations")
      .update({ subscription_status: "past_due" })
      .eq("id", orgId);
  },
});
