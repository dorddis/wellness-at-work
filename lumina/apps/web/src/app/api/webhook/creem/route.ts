import { Webhook } from "@creem_io/nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazy-initialize Supabase admin client (env vars not available at build time)
let _supabase: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

// Product ID -> tier mapping. Uses IDs (stable) instead of names (can change).
function getTierFromProduct(productId: string): { tier: string; seatLimit: number } {
  const proId = process.env.NEXT_PUBLIC_CREEM_PRODUCT_PRO ?? "prod_76B3Bss2pIZmPSTVEqJJud";
  if (productId === proId) {
    return { tier: "pro", seatLimit: 200 };
  }
  return { tier: "starter", seatLimit: 25 };
}

// Centralized org update with error checking. Throws on failure so SDK returns
// 500 and Creem retries the webhook delivery.
async function updateOrg(orgId: string, data: Record<string, unknown>): Promise<void> {
  const { error, count } = await getSupabaseAdmin()
    .from("organizations")
    .update(data)
    .eq("id", orgId);

  if (error) {
    console.error(`[Creem Webhook] DB update failed for org=${orgId}: ${error.message}`);
    throw new Error(`Supabase update failed: ${error.message}`);
  }

  if (count === 0) {
    console.warn(`[Creem Webhook] No org found with id=${orgId}, update had no effect`);
  }
}

export const POST = Webhook({
  webhookSecret: process.env.CREEM_WEBHOOK_SECRET!,

  // Fires when checkout completes. Store customer info only --
  // access is granted via onGrantAccess when the subscription event fires.
  onCheckoutCompleted: async ({ customer, product, metadata }) => {
    const orgId = metadata?.referenceId as string;
    if (!orgId) {
      console.error("[Creem Webhook] No referenceId in checkout metadata");
      return;
    }

    console.log(`[Creem Webhook] Checkout completed: org=${orgId}, product=${product.id}`);

    if (customer) {
      await updateOrg(orgId, {
        creem_customer_id: customer.id,
        billing_email: customer.email,
      });
    }
  },

  // Fires for subscription.active, subscription.trialing, subscription.paid.
  // Single handler for all "user gets access" events.
  onGrantAccess: async (data) => {
    const orgId = data.metadata?.referenceId as string;
    if (!orgId) {
      console.error("[Creem Webhook] No referenceId in grant access");
      return;
    }

    const { reason, product, customer } = data;
    console.log(`[Creem Webhook] Grant access: org=${orgId}, reason=${reason}, product=${product.id}`);

    const { tier, seatLimit } = getTierFromProduct(product.id);
    const status = reason === "subscription_trialing" ? "trialing" : "active";

    await updateOrg(orgId, {
      subscription_status: status,
      subscription_tier: tier,
      seat_limit: seatLimit,
      creem_customer_id: customer.id,
      creem_subscription_id: data.id,
      billing_email: customer.email,
      current_period_end: data.current_period_end_date?.toISOString() ?? null,
    });
  },

  // Fires for subscription.paused and subscription.expired only.
  // subscription.canceled does NOT trigger this -- handled separately below.
  onRevokeAccess: async (data) => {
    const orgId = data.metadata?.referenceId as string;
    if (!orgId) {
      console.error("[Creem Webhook] No referenceId in revoke access");
      return;
    }

    console.log(`[Creem Webhook] Revoke access: org=${orgId}, reason=${data.reason}`);

    const status = data.reason === "subscription_paused" ? "paused" : "expired";
    await updateOrg(orgId, { subscription_status: status });
  },

  // subscription.active fires AFTER onGrantAccess for the same event.
  // Access granting is handled by onGrantAccess -- no duplicate logic here.
  onSubscriptionActive: async () => {
    // Intentionally empty -- onGrantAccess handles access granting
  },

  // subscription.canceled is a TERMINAL state. Does NOT trigger onRevokeAccess.
  // Must explicitly update DB here or the user keeps access forever.
  onSubscriptionCanceled: async (data) => {
    const orgId = data.metadata?.referenceId as string;
    if (!orgId) {
      console.error("[Creem Webhook] No referenceId in subscription canceled");
      return;
    }

    console.log(`[Creem Webhook] Subscription canceled: org=${orgId}`);

    await updateOrg(orgId, {
      subscription_status: "canceled",
    });
  },

  // Payment failed -- Creem will retry. Don't revoke access yet.
  onSubscriptionPastDue: async (data) => {
    const orgId = data.metadata?.referenceId as string;
    if (!orgId) return;

    console.log(`[Creem Webhook] Subscription past due: org=${orgId}`);

    await updateOrg(orgId, { subscription_status: "past_due" });
  },
});
