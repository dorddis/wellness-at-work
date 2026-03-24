# Payment Provider Research (Mar 24, 2026)

**Context:** Choosing payment provider for Lumina SaaS - must support global subscriptions, Next.js integration, and sandbox/test mode.

**Decision: Stripe** (see rationale at bottom)

---

## Quick Comparison

| Provider | Fees | MoR? | Next.js SDK | Sandbox | Approval | Best For |
|----------|------|------|-------------|---------|----------|----------|
| **Stripe** | 2.9%+30c (+0.5% billing, +1% intl) | No | Vercel template | Excellent | Instant | Global SaaS, best DX |
| **Creem** | 3.9%+40c all-in | Yes | `@creem_io/nextjs` | Yes | Instant | Cheapest MoR, bootstrappers |
| **Polar.sh** | 4%+40c all-in | Yes | `@polar-sh/nextjs` | sandbox.polar.sh | Instant | Dev tools, indie hackers |
| **Dodo** | 4%+40c base (+0.5% subs, +1.5% intl) | Yes | Next.js adaptor | Yes | Instant | Looks cheap, hidden add-ons |
| **Paddle** | 5%+50c all-in | Yes | Official starter | Yes | 1-3 days live | Most mature MoR |
| **LemonSqueezy** | 5%+50c | Yes | No official SDK | Yes | Instant | Being merged into Stripe |
| **Razorpay** | 2%+GST domestic, 3%+GST intl | No | Community | Yes | 2-3 days | India-only |
| **Paystack** | 1.5% local, 3.9% intl | No | Community | Yes | 1-2 days | Africa-only |

---

## Effective Cost on $4/mo Plan (Global Subscription)

| Provider | Percentage | Flat Fee | Total Cost | % of Revenue |
|----------|-----------|----------|------------|--------------|
| **Stripe** | ~$0.18 (4.4%) | $0.30 | **$0.48** | **12%** |
| **Creem** | $0.16 (3.9%) | $0.40 | **$0.56** | **14%** |
| **Polar** | $0.16 (4%) | $0.40 | **$0.56** | **14%** |
| **Dodo** | $0.24 (6%) | $0.40 | **$0.64** | **16%** |
| **Paddle** | $0.20 (5%) | $0.50 | **$0.70** | **17.5%** |
| **LemonSqueezy** | $0.20 (5%) | $0.50 | **$0.70** | **17.5%** |

At $4/mo, the flat fee dominates. Stripe's lower flat fee ($0.30 vs $0.40-$0.50) makes it cheapest despite higher percentage.

At $8/mo (Pro plan), gap narrows. At $50+/mo, MoR providers become more competitive.

---

## Detailed Notes

### Stripe
- 2.9% + 30c base. +0.5% for Stripe Billing (subscriptions). +1% cross-border. +1% currency conversion.
- Stripe Tax is separate add-on for VAT/GST compliance.
- Stripe Checkout = hosted payment page (minimal code).
- Stripe Customer Portal = self-service billing management (cancel, update card, invoices).
- Vercel template: `vercel/nextjs-subscription-payments` (Next.js + Stripe + Supabase).
- Test mode: instant, test cards, test clocks for subscription lifecycle testing.
- 85%+ of Next.js SaaS templates use Stripe.

### Creem
- 3.9% + 40c all-inclusive (MoR, tax, subscriptions).
- $0 fees on first $1,000 revenue - great for launch.
- Official `@creem_io/nextjs` SDK with App Router support.
- Tax compliance in 28+ US states, EU, UK, South Korea.
- Launched 2024 - young platform.
- Next.js + Prisma template on GitHub.

### Polar.sh
- 4% + 40c all-inclusive.
- Official `@polar-sh/nextjs` npm package for App Router.
- Dedicated sandbox at sandbox.polar.sh.
- Built-in checkout component, customer portal, webhook handlers.
- Supabase starter available.
- Focused on dev tools / open source monetization.
- No PayPal support. US-only data hosting.

### Dodo Payments
- 4% + 40c BASE but add-ons stack: +0.5% subscriptions, +1.5% international, +3% PayPal, +3% BNPL.
- Effective global subscription cost: 6% + 40c.
- $30 chargeback fee, $25 SWIFT payout fee.
- Looks cheap, actually expensive for global SaaS.
- Official Next.js adaptor and Supabase starter kit.
- Founded 2024.

### Paddle
- 5% + 50c all-inclusive. Most mature MoR (200+ countries tax coverage).
- Official `paddle-nextjs-starter-kit` on GitHub.
- Instant sandbox, live approval takes 1-3 business days.
- Only supports digital/software products.
- Effective cost can reach ~7% with currency conversion.

### LemonSqueezy
- 5% + 50c. Acquired by Stripe July 2024.
- Payout fees reduced post-acquisition: 0% US, 1% international.
- Being merged into "Stripe Managed Payments" - unclear future.
- No official Next.js SDK.
- Hard to recommend with cheaper/better alternatives available.

### Razorpay
- 2% + GST domestic India. 3% + GST international. +0.99% subscriptions.
- Requires Indian business entity. Settles in INR.
- Not suitable for global SaaS priced in USD.

### Paystack
- Operates in 5 African countries only.
- Owned by Stripe. Not a global solution.

---

## Decision Rationale: Stripe

1. **Cheapest at $4/mo price point** - flat fee matters more than percentage
2. **Instant setup** - test mode with zero approval
3. **Best ecosystem** - Vercel template exists for Next.js + Supabase + Stripe
4. **Stripe Checkout** - hosted payment page, zero custom UI
5. **Stripe Customer Portal** - billing management for free
6. **Industry standard** - judges/users recognize it
7. **Tax compliance is deferred** - not needed for hackathon/MVP
8. **Migration path** - can add Stripe Tax later, or migrate to MoR if needed

**Future consideration:** If Lumina gets real revenue and global tax becomes painful, evaluate Polar.sh or Creem as MoR migration targets.

---

## Sources

- [Supastarter: SaaS Payment Providers Comparison](https://supastarter.dev/blog/saas-payment-providers-stripe-lemonsqueezy-polar-creem-comparison)
- [Stripe Pricing](https://stripe.com/pricing)
- [Vercel Next.js Subscription Payments](https://github.com/vercel/nextjs-subscription-payments)
- [Polar.sh Pricing](https://polar.sh/resources/pricing)
- [Polar.sh Next.js Guide](https://polar.sh/docs/guides/nextjs)
- [Creem.io](https://www.creem.io/)
- [Paddle Pricing](https://www.paddle.com/pricing)
- [Dodo Payments Pricing](https://dodopayments.com/pricing/)
- [LemonSqueezy 2026 Update](https://www.lemonsqueezy.com/blog/2026-update)
