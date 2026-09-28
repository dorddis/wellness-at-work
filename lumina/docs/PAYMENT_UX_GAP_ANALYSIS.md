## Gap Analysis -- Lumina Payment System

**Verdict:** GAPS FOUND

**Date:** 2026-03-25
**Scope:** Complete user journey from pricing page through checkout, billing management, trial enforcement, and subscription lifecycle.
**Files reviewed:** 18 source files across web app, API package, Supabase migrations, and docs.

---

### 1. Missing Pieces

| # | Priority | What's Missing | Where | Impact if Shipped |
|---|----------|----------------|-------|-------------------|
| 1 | CRITICAL | **Pro price mismatch: $8 vs $12.** The Creem product description (`docs/CREEM_PRODUCT_DESCRIPTION.md` line 7) and production gaps doc (`docs/PRODUCTION_GAPS.md` line 27) say Pro is $8/user/mo. The pricing page (`apps/web/src/app/pricing/page.tsx` line 27) and billing page (`apps/web/src/app/(dashboard)/admin/billing/page.tsx` line 290) display $12/user/mo. Creem's actual product price is whatever was configured in their dashboard. Users see one price on the site and may be charged a different amount. | Pricing page + billing page vs docs | Users charged a different amount than displayed. Potential legal liability and chargebacks. |
| 2 | CRITICAL | **No cancel return URL.** The `CreemCheckout` components pass `successUrl="/admin/billing?success=true"` but never pass a `cancelUrl`. If the user abandons the Creem checkout, there is no defined behavior for where they return. The checkout route handler (`apps/web/src/app/checkout/route.ts`) only sets `defaultSuccessUrl`. | `checkout/route.ts` line 6, `billing/page.tsx` lines 95, 328 | User clicks "Subscribe", decides not to pay, and gets stranded on Creem's domain with no way back. |
| 3 | CRITICAL | **`onSubscriptionCanceled` is a no-op.** The webhook handler logs the event but does NOT update the database. Compare with `onSubscriptionPastDue` which does update. If a user cancels through the Creem portal, the org's subscription_status stays "active" forever. | `apps/web/src/app/api/webhook/creem/route.ts` lines 84-86 | Canceled customers keep full access indefinitely. Revenue leakage. |
| 4 | CRITICAL | **`onSubscriptionActive` is a no-op.** Same problem -- logs but does nothing. If Creem sends a "subscription reactivated" event (e.g., after a past_due payment succeeds), the org stays in whatever status it was in. | `apps/web/src/app/api/webhook/creem/route.ts` lines 80-82 | User pays overdue invoice, but org remains in past_due/expired state. User is locked out despite paying. |
| 5 | HIGH | **No seat enforcement on join.** The join page (`apps/web/src/app/join/page.tsx`) counts members and displays the count, but never checks it against `seat_limit`. The `handleJoin` function proceeds regardless of seat count. | `apps/web/src/app/join/page.tsx` lines 57-87 | Organizations exceed their paid seat limit. An org paying for 25 seats could have 200 members. |
| 6 | HIGH | **No trial banner in the dashboard header.** The `PRODUCTION_GAPS.md` spec (line 51) says "Show X days left in trial banner in dashboard header." The dashboard layout (`apps/web/src/app/(dashboard)/layout.tsx`) has no trial awareness at all. The trial warning only appears on the billing page itself, which regular employees cannot even see (it is admin-only). | `apps/web/src/app/(dashboard)/layout.tsx` lines 216-236 | Trial users have zero visibility into their remaining time until they are hard-locked out with no warning. |
| 7 | HIGH | **Employees see a confusing lockout.** When trial expires, middleware redirects to `/admin/billing`. But the sidebar marks billing as `adminOnly: true`. An employee with role "employee" will be redirected to `/admin/billing` by the middleware, which then gets blocked by the admin check in the same middleware and redirected to `/dashboard`, which triggers the trial check again -- creating an infinite redirect loop. | `middleware.ts` lines 142-177 | Employees are stuck in a redirect loop when the trial expires. The app becomes completely unusable for non-admin users. |
| 8 | HIGH | **No grace period implemented.** The spec (line 52 of `PRODUCTION_GAPS.md`) says "3 days after trial expiry before hard lock." The middleware (`middleware.ts` line 164) does a hard check: if `now > trialEnd`, redirect immediately. There is no 3-day grace. | `middleware.ts` lines 161-168 | Users lose access the instant the 14-day clock expires, with zero buffer for payment processing delays or timezone differences. |
| 9 | HIGH | **No `current_period_end` ever written.** The database column exists, the billing page reads it, but no webhook handler ever updates it. `onGrantAccess` sets subscription_status and tier but not the period end date. | `apps/web/src/app/api/webhook/creem/route.ts` lines 38-61 | The "Next Billing" date on the billing page always shows "N/A" for paying customers. |
| 10 | HIGH | **No `creem_subscription_id` ever written.** The column exists in the migration (line 7 of `004_billing.sql`) and is queried by `getOrgSettings`, but no webhook handler stores it. | Webhook handler: all callbacks | Cannot look up or manage subscriptions in Creem's API. Portal functionality may be impaired. |
| 11 | MEDIUM | **No error state shown to user on billing load failure.** If `getBillingInfo` throws, the billing page catches the error, logs to console, and renders the generic "Failed to load billing information" message with no retry button and no guidance. | `billing/page.tsx` lines 137-139, 154-159 | User sees a dead-end page with no way to recover. No "try again" button, no "contact support" link. |
| 12 | MEDIUM | **No email system at all.** No transactional email provider (Resend, SendGrid, etc.) is integrated. Zero emails are sent: no welcome email, no trial expiring warnings, no payment confirmations, no payment failure alerts, no cancellation confirmations. | Entire codebase | Users get no communication outside the app. A user whose payment fails will not know until they try to log in. An admin whose trial is expiring gets no warning email. |
| 13 | MEDIUM | **Referral page is a non-functional shell.** The referral page generates a code from the user ID prefix, links to `/signup?ref=CODE` (a route that does not exist -- the actual signup is at `/login` or `/join`), and shows hardcoded "0 referred / 0 free months earned" with no backend. | `apps/web/src/app/referral/page.tsx` | Users share referral links that 404. "Free month" promises cannot be fulfilled. |
| 14 | MEDIUM | **Feature gating not implemented.** The spec (lines 99-108 of `PRODUCTION_GAPS.md`) describes `canAccessFeature(orgId, feature)` with tier-based gating. No such function exists. All features are accessible to all tiers. Starter users get Slack integration, challenges, etc. | Entire codebase | No revenue differentiation between Starter and Pro. Users on Starter have no reason to upgrade because they already have everything. |
| 15 | MEDIUM | **No downgrade path.** An active Pro subscriber can only "Manage billing" through the Creem portal, but there is no UI to switch from Pro to Starter. The billing page only shows upgrade CTAs. | `billing/page.tsx` lines 310-337 | Users who want to downgrade have no self-service option. They would need to cancel and re-subscribe, losing continuity. |
| 16 | LOW | **FAQ claims "SOC 2 Type II compliant."** This is Supabase's compliance, not Lumina's. The FAQ wording ("We are SOC 2 Type II compliant") is misleading. | `PricingFAQ.tsx` line 25 | Legal/compliance risk. Customers making purchasing decisions based on a false compliance claim. |
| 17 | LOW | **FAQ claims annual billing with 20% discount.** No annual billing option exists anywhere in the product. | `PricingFAQ.tsx` line 35 | Users expecting annual billing find it does not exist. |
| 18 | LOW | **No error boundary pages.** Neither `error.tsx` nor `not-found.tsx` exists at any level in the app directory. | `apps/web/src/app/` | Any unhandled error shows the default Next.js error page. A 404 shows the built-in page with no navigation back. |

---

### 2. Dead Code / Cleanup

| # | File:Line | Issue | Action |
|---|-----------|-------|--------|
| 1 | `middleware.ts` lines 95-105, 125-139 | 8 `console.log` statements with user IDs and membership data. These leak PII (user IDs, org membership status) into production Vercel logs. | Remove or replace with structured logging that redacts PII. |
| 2 | `webhook/creem/route.ts` lines 22, 26, 41, 45, 66, 70, 81, 85 | 8 `console.log`/`console.error` statements logging customer emails and org IDs. | Replace with a proper logging library or at minimum redact email addresses. |
| 3 | `auth-context.tsx` lines 44, 48, 51, 72, 96, 101, 106, 108, 144 | 9 `console.log`/`console.error` statements in the auth context. Some log full user objects. | Remove debug logging. |
| 4 | `billing/page.tsx` line 138 | `console.error('Failed to load billing info:', err)` -- error object logged to browser console. | Remove or replace with user-facing error reporting. |
| 5 | `.env.local` (web app) lines 6-11 | **Test-mode API keys and service role key committed to repo.** The Creem test API key, webhook secret, and Supabase service role key are in `.env.local`. The service role key bypasses all RLS. | Rotate all keys immediately. Add `.env.local` to `.gitignore` if not already there. Use environment variables from Vercel dashboard for production. |
| 6 | `billing/page.tsx` lines 20-21 | Hardcoded Creem product IDs (`prod_56nknnNggE72huMOUqTjfe`, `prod_76B3Bss2pIZmPSTVEqJJud`). These are likely test-mode product IDs. | Move to environment variables so test and production use different product IDs. |

---

### 3. Error Handling Gaps

| # | File:Line | Scenario | What Happens Now | Should Happen |
|---|-----------|----------|------------------|---------------|
| 1 | `webhook/creem/route.ts` lines 29-35 | Supabase `.update()` fails during checkout webhook (e.g., network error, RLS issue) | Error is silently swallowed. No `.then()` or error check on the await. The update may fail and Creem will consider the webhook handled. | Check for Supabase error. Return a 500 status so Creem retries the webhook. Log the error with context. |
| 2 | `webhook/creem/route.ts` lines 50-60 | Supabase `.update()` fails during grant access | Same as above. Subscription is activated in Creem but org stays as "trialing" in Supabase. | Add error handling. Return non-200 so Creem retries. |
| 3 | `webhook/creem/route.ts` lines 72-77 | Supabase `.update()` fails during revoke access | Subscription is canceled in Creem but org stays "active" in Supabase. | Same pattern: check error, return retry-able response. |
| 4 | `webhook/creem/route.ts` lines 19-23 | Webhook arrives without `referenceId` in metadata | Logs an error and returns. The checkout completed but the org is never linked to the customer. | Should alert/notify an admin. This means money was collected but the customer's org was never activated. |
| 5 | `billing/page.tsx` lines 131-144 | `getBillingInfo` throws or returns null | User sees "Failed to load billing information" with no actions available. | Show retry button. Show "Contact support at support@lumina.app" link. Consider auto-retry after a delay. |
| 6 | `billing/page.tsx` line 162 | `user?.email` is undefined | `userEmail` becomes empty string. Passed to `CreemCheckout` as `customer.email: ''`. | Creem may reject the checkout or create a customer with no email. Validate email exists before rendering checkout buttons. |
| 7 | `middleware.ts` lines 151-155 | Supabase query to check org subscription fails | The `if (org)` check means a failed query silently allows access. If Supabase is down, all trial/subscription checks are bypassed. | Default to denying access on query failure (fail-closed). Show an error page rather than granting access. |
| 8 | `billing/page.tsx` lines 177-185 | Success banner shows after returning from Creem, but webhook has not processed yet | User sees "Payment successful! Your subscription is now active" but the subscription is still "trialing" because the webhook hasn't arrived. The page shows conflicting information. | Poll for status update after showing the success banner. Or show "Payment received -- activating your subscription..." with a spinner until the status actually changes. |

---

### 4. Production Risks

| # | Risk | Dev Behavior | Prod Behavior | Fix |
|---|------|-------------|---------------|-----|
| 1 | **Creem test mode left on in all non-production environments.** `testMode: process.env.NODE_ENV !== "production"` means Vercel preview deployments (which run as "production" builds) use real payment mode. But the API key in `.env.local` is a test key (`creem_test_`). | Works with test key in test mode. | Vercel production uses `NODE_ENV=production` which sets `testMode: false`, but if the test API key is deployed, Creem will reject it. If a real key is deployed, preview deployments will process real charges. | Use a dedicated `CREEM_TEST_MODE` env var rather than deriving from `NODE_ENV`. |
| 2 | **Product IDs are hardcoded.** `CREEM_PRODUCT_STARTER` and `CREEM_PRODUCT_PRO` are inline constants in the billing page. Test-mode products and production products have different IDs in Creem. | Test products work in test mode. | Wrong product IDs in production means checkout fails or charges for the wrong product. | Move to `NEXT_PUBLIC_CREEM_PRODUCT_STARTER` and `NEXT_PUBLIC_CREEM_PRODUCT_PRO` env vars. |
| 3 | **Tier detection by product name is fragile.** Webhook (`route.ts` line 48): `product.name?.toLowerCase().includes("pro") ? "pro" : "starter"`. If the Creem product is named "Professional" or "Lumina Pro Plan", it might work. If named "Premium", it won't. | Works if test products are named exactly right. | Any product name change in Creem dashboard breaks tier detection. A product called "Lumina Starter Program" would match "pro" because of "Program" (it does not contain "pro", but "Starter" would fall through to "starter" anyway -- however the inverse is dangerous). | Use product ID comparison instead of name matching. Map `product.id` to tier. |
| 4 | **Service role key exposure.** `.env.local` contains the Supabase service role key in plaintext. This key bypasses all RLS. If this file is committed to git, anyone with repo access can read/write all data. | Developers have full access anyway. | If the repo is public or shared, all customer data is exposed. | Verify `.env.local` is in `.gitignore`. Rotate the key. Use Vercel environment variables for production. |
| 5 | **Webhook handler has no idempotency protection.** If Creem retries a webhook (network timeout, 500 response), the handler will process it again. `onGrantAccess` will overwrite existing data, which is mostly safe, but `onCheckoutCompleted` could trigger duplicate processing. | Single delivery in dev. | Creem retries on failure. Could cause duplicate processing or race conditions. | Add idempotency checks. Store and check webhook event IDs before processing. |
| 6 | **Employee redirect loop on trial expiry.** Middleware redirects expired-trial users to `/admin/billing`. Middleware also blocks non-admin users from `/admin/*` routes. Employees hit an infinite redirect. | Works in dev because the developer is always an admin. | First employee account to experience trial expiry will be locked in a redirect loop. The browser will eventually show "too many redirects." | Create a non-admin billing/upgrade page, or exempt employees from the billing redirect and instead show them a "contact your admin" message. |
| 7 | **No webhook endpoint verification in production.** The webhook secret is set, but there is no monitoring or alerting if webhooks stop arriving. If the Vercel URL changes or the webhook endpoint is misconfigured in Creem's dashboard, all payment events are silently lost. | Manually tested. | Webhook URL mismatch means payments are collected but subscriptions are never activated. Users pay but get no access. | Add a health check or monitoring for webhook delivery. Set up Creem webhook failure notifications. |

---

### 5. UX Gaps

| # | Issue | Where | Impact | Recommendation |
|---|-------|-------|--------|----------------|
| 1 | **No "past_due" user messaging.** The `StatusBadge` shows "Past Due" in amber, but the billing page has no explanatory banner or action prompt for `past_due` status. The user sees a label but no guidance on what to do. | `billing/page.tsx` | User sees "Past Due" but does not know their payment failed or what action to take. | Add a red banner: "Your last payment failed. Please update your payment method to avoid losing access." with a direct link to the Creem portal. |
| 2 | **Billing page has zero accessibility attributes.** No `aria-label`, no `role`, no `tabIndex`, no `onKeyDown` handlers. The `StatusBadge` is a `<span>` with no semantic meaning. Plan cards have buttons inside `CreemCheckout` wrappers with unclear focus management. | `billing/page.tsx` | Screen readers cannot convey subscription status or plan information. Keyboard users cannot navigate the plan selection. | Add `role="status"` to the status badge, `aria-live="polite"` to the success/warning banners, and ensure all interactive elements are focusable. |
| 3 | **Success banner is ephemeral and misleading.** The `showSuccess` state is set on page load from URL params but is cleared on navigation. If the user refreshes before the webhook processes, the banner disappears and they see their old "trialing" status with no success indication. | `billing/page.tsx` lines 119-129 | User pays, sees "success" for 2 seconds, refreshes, and sees "Trial" status. Thinks payment did not go through. May attempt to pay again. | Store a "payment pending" state (e.g., in localStorage with a timestamp). Show "Payment processing..." until the subscription status actually changes. Clear after 5 minutes or on status change. |
| 4 | **No "cancel" feedback after abandoned checkout.** There is no `?canceled=true` handling. The billing page checks for `?success=true` but never for `?canceled=true`. | `billing/page.tsx` lines 119-129 | User abandons checkout, returns to billing page, and sees no indication of what happened. No "You can try again whenever you are ready" message. | Handle `?canceled=true` query param. Show a gentle banner: "Checkout was not completed. You can subscribe whenever you are ready." |
| 5 | **Plan cards do not indicate current plan when already subscribed.** When `isActive && subscriptionTier === 'starter'`, the plan selection cards are hidden (they only show for trialing/needsPayment/expired). The user sees the "Upgrade to Pro" CTA but cannot compare plans side by side. | `billing/page.tsx` lines 264-308 | Active Starter subscribers cannot see what they are paying for vs what Pro offers in a comparative view. The upgrade CTA is a single line with no feature comparison. | Always show plan cards for active subscribers. Mark the current plan. Show upgrade and downgrade options. |
| 6 | **No confirmation before initiating checkout.** Clicking "Upgrade" or "Switch Plan" immediately opens the Creem checkout. No intermediate confirmation of what they are buying, at what price, for how many seats. | `billing/page.tsx` `PlanCard` component | Users may accidentally start checkout. The seat count passed to Creem (`units={seatCount \|\| 1}`) may surprise users who do not realize they are being charged per seat. | Add a confirmation dialog: "You are subscribing to Pro at $X/user/mo for Y users. Total: $Z/mo. Continue?" |
| 7 | **Dark mode colors are broken for trial/error banners.** The banners use hardcoded light-mode colors (`bg-green-50`, `bg-amber-50`, `bg-red-50`, `text-green-800`, etc.) that will look wrong or be unreadable in dark mode. The `StatusBadge` has the same issue. | `billing/page.tsx` lines 177-206 | In dark mode, banners appear as bright colored blocks with poor contrast. Status badges may be illegible. | Use theme-aware color tokens (`bg-green-50 dark:bg-green-950`, etc.) or use the design system's semantic color classes. |
| 8 | **Pricing page is disconnected from checkout.** All three plan CTAs on the pricing page link to `/login`. After logging in, the user lands on `/dashboard`, not `/admin/billing`. There is no flow from "I chose Pro on the pricing page" to "Start checkout for Pro." The plan choice is lost. | `apps/web/src/app/pricing/page.tsx` lines 20, 39, 56 | User picks Pro on pricing page, signs up, and then has to navigate to Settings > Billing and pick Pro again. The pricing page's plan selection is purely decorative. | After login/signup, detect the intended plan (via URL params or session storage) and redirect to billing with the plan pre-selected. |
| 9 | **Notification bell shows hardcoded "3".** The top header bar shows a red badge with "3" on the bell icon, regardless of actual alert count. | `apps/web/src/app/(dashboard)/layout.tsx` lines 231-233 | Every user always sees "3 notifications." This is clearly a placeholder. Users will click it expecting real notifications and lose trust. | Fetch actual alert count or remove the badge until real notification counting is implemented. |
| 10 | **Mobile responsiveness gap on plan cards.** The plan comparison grid uses `md:grid-cols-2` which stacks on mobile. But each `PlanCard` has internal padding and button layout that may overflow on very small screens (320px width). The `CreemCheckout` wrapper's button has no max-width constraint. | `billing/page.tsx` line 270 | On small phones, plan cards may have text overflow or buttons that extend beyond the card boundary. | Test at 320px width. Add responsive text sizing and constrain button width. |

---

### 6. Suggested Tests (top 5 most valuable)

1. **Webhook integration test: checkout.completed -> grant access -> verify org status.** Simulate a Creem webhook payload for `onCheckoutCompleted` followed by `onGrantAccess`. Verify that the org in Supabase transitions from `trialing` to `active` with the correct tier, seat_limit, customer_id, and billing_email. This is the highest-risk untested path because if it fails, customers pay but get no access.

2. **Employee redirect loop test.** Create a user with role "employee" in an org where `subscription_status = 'trialing'` and `trial_ends_at` is in the past. Verify the middleware does NOT create an infinite redirect. Currently this is a guaranteed production bug.

3. **Webhook error handling test.** Simulate a Supabase failure (mock the client to return an error) during `onGrantAccess`. Verify that the webhook handler returns a non-200 status code so Creem retries. Currently, errors are swallowed and the webhook is considered "handled."

4. **Seat limit enforcement test.** Create an org at seat limit (25 members, Starter plan). Attempt to join via `/join` with a valid invite code. Verify the join is blocked with a clear error message. Currently there is no enforcement -- this test would fail immediately.

5. **Price consistency test.** Automated test that extracts all price strings (`$4`, `$8`, `$12`) from the pricing page, billing page, landing page preview, FAQ, and docs, and verifies they are all consistent with each other and with the Creem product configuration.

---

### 7. Summary of User Journey Gaps

**Journey: "I want to pay"**
```
Pricing Page ($12 Pro)
    -> "Start Free Trial" -> /login -> signup/login -> /dashboard
    -> [DEAD END: user is on dashboard, plan choice is lost]
    -> User must manually find: Sidebar > System > Billing
    -> Billing page shows $12 Pro (but Creem product may be $8)
    -> Click "Upgrade" -> Creem checkout (no cancel URL)
    -> Pay -> redirect to /admin/billing?success=true
    -> See "Payment successful!" banner
    -> [BUT: webhook may not have processed yet, so status still shows "Trial"]
    -> Refresh -> banner gone, status still "Trial"
    -> [User panics, tries to pay again]
    -> Eventually webhook processes -> status changes to "active"
    -> [BUT: current_period_end is never set -> "Next Billing: N/A"]
```

**Journey: "My trial expired" (as employee)**
```
Employee logs in
    -> Middleware checks trial -> expired
    -> Redirect to /admin/billing
    -> Middleware checks role -> not admin
    -> Redirect to /dashboard
    -> Middleware checks trial -> expired
    -> Redirect to /admin/billing
    -> [INFINITE LOOP: browser shows "too many redirects"]
```

**Journey: "I canceled my subscription"**
```
User goes to Creem portal -> cancels
    -> Creem fires onSubscriptionCanceled webhook
    -> Webhook handler logs the event
    -> [DOES NOTHING: org stays "active"]
    -> User keeps full access forever
```

These three journeys represent the most critical gaps. The employee redirect loop (journey 2) will break the app for all non-admin users the moment any trial expires. The cancellation no-op (journey 3) means revenue leakage from day one.
