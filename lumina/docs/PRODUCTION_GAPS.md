# Lumina - Production Gaps (Full Audit)

**Date:** 2026-03-24
**Goal:** Make Lumina a fully production-ready SaaS that anyone anywhere can sign up, pay, and use.
**Live URL:** https://lumina-rho-sandy.vercel.app

---

## What's Already Solid

- Auth (magic link + Google OAuth via Supabase)
- Multi-tenant organizations with Row-Level Security
- Desktop app with offline-first sync (SQLite -> Supabase)
- Real-time blink detection (MediaPipe FaceLandmarker, 343 tests passing)
- Admin dashboard + employee personal dashboard
- Dark mode, landing page, blog, legal pages (privacy, terms)
- Pricing page (design only - no payment wired)
- Live deployment on Vercel
- 40K+ LOC monorepo (Turborepo + pnpm)

---

## Phase 1 - Foundation (~5hrs)

### 1.1 Payment Provider Setup
- [ ] Create payment provider account (Stripe or alternative)
- [ ] Create products: Starter ($4/user/mo), Pro ($8/user/mo)
- [ ] Get API keys (test mode)
- [ ] Add env vars: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`

### 1.2 Database Migration - Billing Columns
- [ ] Add to `organizations` table:
  - `stripe_customer_id TEXT`
  - `stripe_subscription_id TEXT`
  - `subscription_status TEXT DEFAULT 'trialing'` (trialing/active/past_due/canceled/unpaid)
  - `trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days')`
  - `current_period_end TIMESTAMPTZ`
  - `billing_email TEXT`
  - `seat_limit INTEGER DEFAULT 5`
- [ ] Update RLS policies for new columns
- [ ] Backfill existing orgs with trial dates

### 1.3 Install Dependencies
- [ ] `stripe` (server-side SDK)
- [ ] `@stripe/stripe-js` (client-side)
- [ ] Email SDK (Resend or SendGrid)

### 1.4 Trial Enforcement in Middleware
- [ ] Check `trial_ends_at` on every authenticated request
- [ ] If trial expired AND no active subscription -> redirect to `/billing`
- [ ] Show "X days left in trial" banner in dashboard header
- [ ] Grace period: 3 days after trial expiry before hard lock

---

## Phase 2 - Money In (~4hrs)

### 2.1 Checkout Flow
- [ ] API route: `POST /api/checkout` - creates Stripe Checkout Session
- [ ] Map org to Stripe customer (create if not exists)
- [ ] Redirect to Stripe hosted checkout (least code, handles 3DS, card input)
- [ ] Success page: `/billing?success=true`
- [ ] Cancel page: `/billing?canceled=true`

### 2.2 Webhook Handler
- [ ] API route: `POST /api/webhooks/stripe`
- [ ] Verify webhook signature
- [ ] Handle events:
  - `checkout.session.completed` -> activate subscription
  - `customer.subscription.updated` -> sync status
  - `customer.subscription.deleted` -> mark canceled
  - `invoice.payment_failed` -> mark past_due
  - `invoice.paid` -> mark active
- [ ] Update org `subscription_status`, `current_period_end` in Supabase

### 2.3 Customer Portal
- [ ] API route: `POST /api/billing/portal` - creates Stripe Customer Portal session
- [ ] Users manage payment method, cancel, upgrade/downgrade through Stripe's hosted portal
- [ ] No need to build custom billing management UI

---

## Phase 3 - Billing Management (~4hrs)

### 3.1 Billing Page (`/admin/billing`)
- [ ] Show current plan name + status
- [ ] Show next billing date + amount
- [ ] Show seat usage (X/Y seats used)
- [ ] "Manage Billing" button -> Stripe Customer Portal
- [ ] "Upgrade Plan" button -> checkout for higher tier
- [ ] Trial countdown if still trialing

### 3.2 Seat Counting & Enforcement
- [ ] Query `COUNT(org_members)` per org
- [ ] Starter: max 25 seats. Pro: max 200. Enterprise: unlimited.
- [ ] Block "Invite Member" when at limit -> show upgrade prompt
- [ ] RLS policy or app-level check on org_members INSERT

### 3.3 Feature Gating
- [ ] Create `canAccessFeature(orgId, feature)` helper
- [ ] Gate by tier:
  - Trial: All features for 14 days
  - Starter: Basic analytics, breaks, exercises. No integrations, no challenges.
  - Pro: Everything except SSO/SAML
  - Enterprise: Everything + SSO + priority support
- [ ] Show upgrade prompts on gated features (not just 403)
- [ ] Check in middleware for protected routes (`/admin/integrations`, `/admin/challenges`)

---

## Phase 4 - Communications (~3hrs)

### 4.1 Email System Setup
- [ ] Choose provider: Resend (simpler for Next.js) or SendGrid
- [ ] Set up domain verification for transactional emails
- [ ] Create email templates (React Email or plain HTML)

### 4.2 Transactional Emails
- [ ] Welcome email (after signup + org creation)
- [ ] Team invite email (when admin invites member)
- [ ] Trial expiring - Day 10: "4 days left"
- [ ] Trial expiring - Day 13: "Expires tomorrow"
- [ ] Trial expired: "Your trial has ended"
- [ ] Payment confirmation
- [ ] Payment failed (retry prompt)
- [ ] Subscription canceled confirmation

---

## Phase 5 - Polish (~6hrs)

### 5.1 Member Management
- [ ] Admin can remove users from org
- [ ] Admin can change user roles (employee -> manager -> admin)
- [ ] Admin can resend invite
- [ ] Confirmation dialogs for destructive actions

### 5.2 Error Handling
- [ ] Add `/app/error.tsx` (root error boundary)
- [ ] Add `/app/not-found.tsx` (custom 404)
- [ ] Add `/app/(dashboard)/error.tsx` (dashboard error boundary)
- [ ] Friendly error messages with "go back" / "contact support" links

### 5.3 Security - Invite Codes
- [ ] Replace slug-based invite codes with cryptographic tokens
- [ ] Generate 32-char random string on org creation
- [ ] Store in `organizations.invite_token`
- [ ] Expire/regenerate option for admins
- [ ] Rate limit join endpoint

### 5.4 Onboarding Wizard
- [ ] After org creation, guided 3-step flow:
  1. Configure alert thresholds + privacy mode
  2. Invite team members (enter emails)
  3. Download desktop app
- [ ] Skip option for each step
- [ ] Mark onboarding complete in org settings

### 5.5 SEO & Compliance
- [ ] Add Open Graph meta tags (title, description, image) to all public pages
- [ ] Add cookie consent banner (GDPR)
- [ ] Add canonical URLs
- [ ] Fix `robots.txt` if needed

### 5.6 Desktop Bug Fixes
- [ ] Toggle demo flag in `useAuth.ts:18`
- [ ] Wire `onShowNotification` callback in desktop UI
- [ ] Test camera init timing race condition

---

## NOT Blocking Launch (Future)

These are real features but can ship post-launch:

- Slack/Teams integration backend (UI exists, no OAuth flows)
- Google/Microsoft Calendar sync
- BambooHR/Workday integration
- Data export (API exists, needs verification)
- Annual billing toggle (20% discount)
- Dunning emails for failed payments (Stripe handles retry automatically)
- Invoice history page (Stripe Customer Portal covers this)
- SSO/SAML for enterprise
- Accessibility audit (WCAG 2.1 AA)
- Mobile app
- Usage-based metering dashboard

---

## Implementation Priority

| Phase | Hours | What You Get |
|-------|-------|--------------|
| Phase 1 | ~5h | Trial enforcement, billing schema, payment SDK ready |
| Phase 2 | ~4h | Users can actually pay. Money flows. |
| Phase 3 | ~4h | Billing page, seat limits, feature gates |
| Phase 4 | ~3h | Professional email communications |
| Phase 5 | ~6h | Polish: member mgmt, errors, security, onboarding |
| **Total** | **~22h** | **Fully production-ready SaaS** |

---

## Architecture Notes

**Payment Flow:**
```
User clicks "Subscribe" on /billing
    -> POST /api/checkout (creates Stripe Checkout Session)
    -> Redirect to Stripe hosted checkout
    -> User enters card, pays
    -> Stripe redirects to /billing?success=true
    -> Stripe fires webhook to POST /api/webhooks/stripe
    -> Webhook updates org subscription_status in Supabase
    -> Middleware sees active subscription -> full access
```

**Trial Flow:**
```
User creates org
    -> trial_ends_at = NOW() + 14 days
    -> Full access for 14 days
    -> Day 10: email reminder
    -> Day 13: email reminder
    -> Day 14: paywall redirect to /billing
    -> 3-day grace period (data preserved, access locked)
    -> After grace: data preserved indefinitely, access locked
```

**Seat Enforcement:**
```
Admin clicks "Invite Member"
    -> Check COUNT(org_members) vs seat_limit
    -> If at limit: show "Upgrade to add more members"
    -> If under limit: proceed with invite
```
