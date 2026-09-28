## Code Quality Review -- Lumina Payment Integration

**Verdict:** NEEDS ATTENTION

The payment integration is clean for a hackathon-speed build. The Creem SDK usage is correct, the billing page is well-structured with extracted sub-components, and the DB migration is solid. However, there are several issues that would bite a future developer: unchecked Supabase errors in the webhook (silent data loss), duplicated plan/pricing data across 3 files, a fragile tier-detection heuristic, and an unused DB column. None are showstoppers, but most are straightforward to fix.


### Convention Violations

| # | Severity | File:Line | Issue | Convention | Fix |
|---|----------|-----------|-------|------------|-----|
| 1 | LOW | `billing/page.tsx:114` | Uses `isLoading` while most admin pages use `loading` (see analytics:40, alerts:24, employees:28, challenges:49, integrations:112). Settings page also uses `isLoading`, so there is a 50/50 split, but the majority pattern is `loading`. | Consistent naming within a directory | Rename to `loading` / `setLoading` to match the majority pattern in `admin/` pages, OR standardize all pages to `isLoading` (the `is` prefix is technically better for booleans -- pick one and apply everywhere) |
| 2 | LOW | `billing/page.tsx:18` | Imports `useAuth` from `'../../../providers'` which is the newer convention. Three older pages (alerts, dashboard/page, my-wellness) still import from `'../../../contexts/auth-context'`. Not a billing bug, but billing correctly follows the newer pattern. | Import path consistency | No change needed in billing. The older pages should be migrated to import from `providers`. |
| 3 | LOW | `checkout/route.ts` and `portal/route.ts` | Both duplicate `apiKey: process.env.CREEM_API_KEY!` and `testMode: process.env.NODE_ENV !== "production"`. | DRY config | Extract a shared `lib/creem.ts` with `const creemConfig = { apiKey: process.env.CREEM_API_KEY!, testMode: process.env.NODE_ENV !== "production" }` and import in both routes. Only 2 lines, but if a third Creem route is added (e.g., a product listing endpoint), this will drift. |
| 4 | MEDIUM | `billing/page.tsx:20-21` | Creem product IDs are hardcoded as constants at the top of a UI component. These are environment-specific (test vs prod products). | Env vars for environment-specific config | Move to env vars: `NEXT_PUBLIC_CREEM_PRODUCT_STARTER` and `NEXT_PUBLIC_CREEM_PRODUCT_PRO`. The current test product IDs will break in production. |
| 5 | LOW | `webhook/creem/route.ts:26,45,70,81,85` | Has 8 `console.log`/`console.error` statements. Other files in the codebase also use console for logging (middleware has ~10), so this is consistent with the project pattern. | Project convention (console logging is the norm here) | No immediate change. But note: for a webhook handler processing payments, structured logging with a proper logger (e.g., Pino) would be valuable for debugging production payment issues. Flag for later. |


### Structural Issues

| # | Severity | File:Line | Issue | Recommendation |
|---|----------|-----------|-------|----------------|
| 1 | **HIGH** | `webhook/creem/route.ts:29-35,51-60,72-77,92-95` | **All four Supabase `.update()` calls silently discard errors.** The webhook handler calls `await getSupabaseAdmin().from("organizations").update({...}).eq("id", orgId)` but never checks the returned `{ error }`. If the update fails (wrong orgId, RLS issue, network error), the webhook returns 200 to Creem (success), Creem considers the event delivered, and the org's billing state is silently wrong. The customer paid but the app never records it. | Capture and check the error on every update. If any update fails, throw or return an error so the Creem SDK returns a non-200 response, triggering Creem's retry logic. Pattern: `const { error } = await getSupabaseAdmin()...update(...)...; if (error) throw new Error(\`Failed to update org ${orgId}: ${error.message}\`);` |
| 2 | **HIGH** | `webhook/creem/route.ts:48` | **Tier detection is fragile.** `product.name?.toLowerCase().includes("pro") ? "pro" : "starter"` relies on the Creem product name containing the substring "pro". If someone renames the product to "Professional Plan" or "Premium", this still works by accident. If they name it "Growth Pro Starter", it matches the wrong tier. If they name it "Business", it defaults to "starter" silently. | Use the product ID for tier mapping, not the name. You already have `CREEM_PRODUCT_STARTER` and `CREEM_PRODUCT_PRO` in the billing page. Create a shared constant map: `const PRODUCT_TIER_MAP: Record<string, string> = { 'prod_56nknnNggE72huMOUqTjfe': 'starter', 'prod_76B3Bss2pIZmPSTVEqJJud': 'pro' };` Then use `product.id` to look up the tier. |
| 3 | MEDIUM | `webhook/creem/route.ts:49` | **Seat limits are hardcoded magic numbers** (`tier === "pro" ? 200 : 25`). These same numbers appear in `004_billing.sql:41-42` and `billing/page.tsx:276,293`. Three places to update if plans change. | Create a shared `PLAN_CONFIG` constant (could live in `@lumina/api` or a shared `constants.ts`): `{ starter: { seatLimit: 25 }, pro: { seatLimit: 200 } }`. Import everywhere. |
| 4 | MEDIUM | `billing/page.tsx` + `pricing/page.tsx` + `components/landing/PricingPreview.tsx` | **Plan definitions are duplicated in 3 files.** Prices ($4, $12), feature lists, seat limits, and plan names are independently hardcoded in the billing page, the public pricing page, and the landing page pricing preview. The feature lists already differ between billing and pricing pages (billing's Starter lists "Blink detection & smart alerts" while pricing's Starter lists the same but in different order; pricing's Pro has "Posture & fatigue monitoring" and "Calendar-aware alerts" which billing's Pro omits). | Extract a single `PLANS` constant (array or map) in a shared location (e.g., `packages/api/src/plans.ts` or `apps/web/src/lib/plans.ts`). All three pages import from there. This is the single source of truth for pricing. |
| 5 | MEDIUM | `middleware.ts:149-177` | **Trial enforcement logic is duplicated.** The middleware manually checks `subscription_status` and `trial_ends_at` to determine access, which is the same logic as `hasActiveAccess()` in `packages/api/src/queries.ts:1942-1953`. But the middleware cannot call `hasActiveAccess()` because it needs to use its own Supabase client (server-side, with cookies). | At minimum, extract the boolean logic into a pure function: `function isAccessValid(status: string, trialEndsAt: string | null): boolean` that both the middleware and `hasActiveAccess` can call. The Supabase query stays separate but the decision logic is shared. |
| 6 | LOW | `webhook/creem/route.ts:80-86` | `onSubscriptionActive` and `onSubscriptionCanceled` are logging-only stubs. `onSubscriptionActive` logs but does not update the org status. `onSubscriptionCanceled` logs but does not update the org status. These events may fire independently of `onGrantAccess`/`onRevokeAccess`, depending on Creem's webhook delivery order. | Either implement proper status updates in these handlers, or add a comment explaining why they are intentionally no-ops (e.g., "Handled by onGrantAccess/onRevokeAccess instead"). Currently a future developer cannot tell if these are TODO or intentional. |
| 7 | LOW | `004_billing.sql` | **No RLS policies for new billing columns.** The migration adds sensitive columns (`creem_customer_id`, `billing_email`, `subscription_status`, etc.) to the `organizations` table. The existing RLS policies from `001_initial_schema.sql` allow any org member to SELECT their organization. This means regular employees can see the `creem_customer_id` and `billing_email`. May be acceptable, but worth an explicit decision. | If billing data should be admin-only, add a column-level security policy or create a view that excludes billing columns for non-admin roles. At minimum, document the decision. |
| 8 | LOW | `billing/page.tsx:94` | `customer={{ email: userEmail, name: '' }}` passes an empty string for the customer name. Creem may display this as blank in their dashboard/invoices. | Pass the user's actual name if available from `useAuth()`, or the organization name. Check if `user?.email` alone suffices for the Creem SDK and omit `name` if it is optional. |
| 9 | LOW | `billing/page.tsx:340` | The billing page is 340 lines total. Not a god file, but the `BillingPage` component itself (lines 111-339 = 228 lines) mixes data fetching, URL parameter parsing, and rendering. The `StatusBadge` and `PlanCard` extractions are good. | Consider extracting the data-fetching + URL-parsing into a custom hook (`useBillingPage`) to keep the component focused on rendering. This is a nice-to-have, not urgent. |


### Duplication Found

| # | Files | Lines | Extract To |
|---|-------|-------|------------|
| 1 | `billing/page.tsx:273-305`, `pricing/page.tsx:8-60`, `PricingPreview.tsx:21` | Plan names, prices ($4/$12), feature lists, seat limits | `apps/web/src/lib/plans.ts` -- single `PLANS` constant with `{ name, price, priceDetail, features, seatLimit, productId }` |
| 2 | `webhook/creem/route.ts:49`, `004_billing.sql:40-43`, `billing/page.tsx:276,293` | Seat limits per tier (25 and 200) | Include in the shared `PLANS` constant above |
| 3 | `checkout/route.ts:4-5`, `portal/route.ts:4-5` | `apiKey` and `testMode` Creem config | `apps/web/src/lib/creem-config.ts` |
| 4 | `webhook/creem/route.ts:20-24,39-43,64-68` | orgId extraction + null check pattern (repeated 3 times identically in the webhook) | Extract helper: `function extractOrgId(metadata: any, context: string): string` that throws if missing |
| 5 | `middleware.ts:158-176`, `queries.ts:1942-1953` | Trial/subscription access check logic | Pure function `isSubscriptionAccessValid(status, trialEndsAt)` in `@lumina/api` |


### Dead Code / Unused

| # | Severity | File:Line | Issue |
|---|----------|-----------|-------|
| 1 | MEDIUM | `004_billing.sql:7` | Column `creem_subscription_id` is added in the migration and selected in `getOrgSettings` (queries.ts:496), but it is **never written to** by any webhook handler or any other code. The webhook only writes `creem_customer_id`. The `getBillingInfo` function (queries.ts:1900) does not even select it. The `BillingInfo` type does not include it. It is only present in the `OrgSettings` type (queries.ts:463) and query (queries.ts:516). This column appears to be planned but unimplemented. |
| 2 | LOW | `billing/page.tsx:9,14` | `XCircle` and `Zap` from lucide-react are imported and used, but `CreditCard` (line 5) is only used once in the section header. Not unused, but noting that all imports are accounted for -- no dead imports here. This is clean. |


### Environment Variable Handling

| # | Severity | File:Line | Issue | Recommendation |
|---|----------|-----------|-------|----------------|
| 1 | MEDIUM | All payment route files | Every `process.env.X!` uses the non-null assertion operator. If env vars are missing, the app will throw cryptic runtime errors deep in the Creem SDK or Supabase client, not at startup. | Add an `apps/web/src/lib/env.ts` that validates required env vars at import time using a simple check or zod schema. This is a project-wide gap (the auth callback route does the same), but it is especially important for payment-related secrets. |
| 2 | LOW | `webhook/creem/route.ts:9-10` | Uses `NEXT_PUBLIC_SUPABASE_URL` for the admin client. This works but `NEXT_PUBLIC_` vars are exposed to the browser bundle. The URL is not secret (it is public by design in Supabase), so this is fine. Just noting it is intentional. | No change needed. |


### Positive Notes

- **Good use of the Creem SDK.** The checkout, portal, and webhook routes correctly use the `@creem_io/nextjs` wrapper functions rather than hand-rolling API calls. This is the right approach.
- **Billing page component extraction.** `StatusBadge` and `PlanCard` are cleanly extracted as local components within the billing page. Good separation for a single-file approach.
- **Parallel data fetching.** `getBillingInfo` in `queries.ts:1897` uses `Promise.all` to fetch org data and member count simultaneously. This is a good pattern that other queries in the file do not use.
- **Lazy Supabase admin client.** The singleton pattern in `webhook/creem/route.ts:5-14` correctly handles the edge case where env vars are not available at build time. Good defensive coding.
- **Proper trial enforcement flow.** The middleware correctly exempts `/admin/billing` from the subscription check (line 150), preventing a redirect loop where expired users cannot reach the page to pay.
- **Migration is well-structured.** `004_billing.sql` uses `IF NOT EXISTS` / `IF EXISTS` for idempotency, includes a backfill for existing orgs, and adds partial indexes for the most common query patterns (creem customer lookup and trial expiration). The CHECK constraints on `subscription_status` match the TypeScript union type exactly.
- **Consistent auth pattern.** The billing page follows the same `useAuth()` -> `orgId` -> `useEffect` data loading pattern as the rest of the admin pages. A new developer would recognize this immediately.


### Priority Summary

If I had to pick the three things to fix first:

1. **Check Supabase errors in the webhook** (Structural #1). This is a real data-loss risk in production. A failed update means a customer paid but the app does not know.
2. **Fix tier detection to use product ID** (Structural #2). The product-name heuristic is a ticking time bomb.
3. **Move product IDs to env vars** (Convention #4). Test product IDs in source code will break in production.

Everything else is cleanup that improves maintainability but does not risk production bugs.
