# Lumina Payment System - Consolidated Review

**Date:** 2026-03-25
**Reviewed by:** 5 specialized agents (security, logic, gaps/UX, quality, build)
**Verdict:** BLOCK - multiple critical issues that will break in production

---

## The 403 Bug - ROOT CAUSE FOUND

**File:** `apps/web/src/app/checkout/route.ts:5`

```
testMode: process.env.NODE_ENV !== "production"
```

On Vercel, `NODE_ENV` = `"production"`, so `testMode` = `false`. This makes the SDK hit `https://api.creem.io` (production endpoint). But the API key is `creem_test_...` -- a **test** key. Production endpoint rejects test keys with **403 Forbidden**. The product IDs were also created in test mode and don't exist on the production endpoint.

**Fix:** Either:
- (a) Force `testMode: true` while using test credentials, OR
- (b) Use a `CREEM_TEST_MODE=true` env var, OR
- (c) Get production credentials from Creem and use those on Vercel

---

## Priority 1: CRITICAL (Will break users)

| # | Bug | File | Impact |
|---|-----|------|--------|
| 1 | **403 on checkout** (see above) | `checkout/route.ts:5` | Nobody can pay |
| 2 | **Infinite redirect loop for employees** on expired trial | `middleware.ts:142-177` | Middleware sends expired-trial users to `/admin/billing`, but non-admins get bounced to `/dashboard`, re-triggering trial check. Every employee locked out forever. |
| 3 | **onSubscriptionCanceled is a no-op** | `webhook/creem/route.ts:84-86` | Only logs. Users who cancel keep full access forever. SDK does NOT trigger onRevokeAccess for cancellations. |
| 4 | **onSubscriptionActive is a no-op** | `webhook/creem/route.ts:80-82` | Past-due payments that succeed never reactivate the org. |
| 5 | **onGrantAccess overwrites "trialing" with "active"** | `webhook/creem/route.ts:54` | When Creem fires `subscription.trialing`, SDK calls onGrantAccess. Handler ignores reason and sets status to "active", destroying all trial tracking. |
| 6 | **reason === "paused" never matches** | `webhook/creem/route.ts:75` | Should be `"subscription_paused"`. All paused subs get marked "expired" instead. TypeScript caught this (TS2367). |
| 7 | **All webhook DB writes silently discard errors** | `webhook/creem/route.ts:29-95` | None of the 6 `.update()` calls check the returned `{ error }`. Failed writes go unnoticed, Creem gets 200, won't retry. Real data-loss path. |

---

## Priority 2: HIGH (Security / data integrity)

| # | Issue | File | Impact |
|---|-------|------|--------|
| 8 | **Secrets on disk** (.env.local) | `apps/web/.env.local` | Creem API key, webhook secret, Supabase service role key. Verify they were never committed to git. Rotate all three. |
| 9 | **Vercel OIDC JWT on disk** | `.env.local` (root) | Full JWT with project identity. Remove. |
| 10 | **No auth on /checkout route** | `checkout/route.ts` | Anyone can craft URL to initiate checkout for any org via `referenceId` param. |
| 11 | **No auth on /portal route** | `portal/route.ts` | Anyone who guesses a Creem customer ID can access another customer's billing portal. |
| 12 | **Webhook signature timing attack** | `@creem_io/nextjs` SDK | Uses `!==` instead of `crypto.timingSafeEqual()`. Allows byte-by-byte signature guessing. |
| 13 | **No onSubscriptionUnpaid handler** | webhook config | Orgs with permanently failed payments stay active. |
| 14 | **PII in logs** | `webhook/creem/route.ts:26,45,70,81` | Customer emails, org IDs, full data objects logged. |
| 15 | **Next.js 15.5.9 has 2 HIGH CVEs** | `package.json` | DoS via RSC deserialization + unbounded image cache. Upgrade to >=15.5.14. |

---

## Priority 3: MEDIUM (UX / quality / correctness)

| # | Issue | File | Notes |
|---|-------|------|-------|
| 16 | **creem_subscription_id + current_period_end never written** | webhook handler | "Next Billing" always shows "N/A" on billing page. |
| 17 | **Price inconsistency** | docs vs website | Pro is $8 in CREEM_PRODUCT_DESCRIPTION.md but $12 on pricing/billing pages. |
| 18 | **Tier detection by string matching** | `webhook/creem/route.ts:48` | `product.name?.includes("pro")` -- should match on product ID. |
| 19 | **Supabase types out of sync** | `packages/api/src/database.types.ts` | 30 type errors. Not regenerated after 004_billing.sql migration. |
| 20 | **customer can be undefined** | `webhook/creem/route.ts:26,32` | SDK types `customer` as `CustomerEntity | undefined`. No null guard. |
| 21 | **No seat enforcement** on org join flow | middleware + join logic | `seat_limit` column exists but never checked. |
| 22 | **No grace period** | middleware | Spec says 3 days after trial expiry. Not implemented. |
| 23 | **No trial banner** outside billing page | dashboard | Users have no warning their trial is expiring. |
| 24 | **No RLS policies for billing columns** | 004_billing.sql | Any org admin can UPDATE billing columns via client SDK. |
| 25 | **Hardcoded product IDs** in client code | `billing/page.tsx:20-21` | Should be env vars for test/prod switching. |
| 26 | **Duplicated plan/pricing data** | 3 files | billing page, pricing page, landing preview all define plans separately. |
| 27 | **Footer type errors** | `Footer.tsx:89-94` | Accesses `link.external` which doesn't exist on type. |
| 28 | **Unused creem_subscription_id column** | DB | Never written by any code path. |

---

## Build Status

| Check | Result |
|-------|--------|
| `next build` | PASS (ignoreBuildErrors: true masks type errors) |
| `tsc --noEmit` | FAIL (30 type errors, 27 in payment code) |
| `eslint` | PASS (0 errors, 26 warnings) |
| `pnpm audit` | 2 HIGH (next.js CVEs) |

---

## Recommended Fix Order (45-min sprint)

### Sprint 1: Make checkout work (15 min)
1. Fix testMode flag (force true or use env var)
2. Move product IDs to env vars
3. Verify checkout works end-to-end

### Sprint 2: Fix data-loss webhook bugs (15 min)
4. Check Supabase errors on all .update() calls
5. Fix reason === "paused" → "subscription_paused"
6. Implement onSubscriptionCanceled (update DB)
7. Implement onSubscriptionActive (reactivate org)
8. Handle onGrantAccess trialing reason correctly
9. Use product ID for tier detection instead of name

### Sprint 3: Fix redirect loop + auth (10 min)
10. Fix middleware: redirect expired employees to a non-admin billing page or show inline banner
11. Add auth checks to /checkout and /portal routes

### Sprint 4: Type safety + cleanup (5 min)
12. Regenerate database.types.ts
13. Add null guard for customer in webhook
14. Fix Footer type errors

### Post-sprint (not blocking)
- Rotate secrets
- Upgrade Next.js
- Add trial banner
- Implement grace period
- Seat enforcement
- Consolidate pricing data
