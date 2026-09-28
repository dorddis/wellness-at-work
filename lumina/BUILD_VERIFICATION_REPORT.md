## Build & Lint Verification

**Verdict:** FAIL
**Frontend (web app build):** PASS (0 errors, 26 warnings)
**Frontend (typecheck):** FAIL (30 type errors)
**Backend (@lumina/api typecheck):** FAIL (23 type errors -- same root cause)
**UI package (@lumina/ui typecheck):** PASS
**Lint:** PASS (0 errors, 26 warnings)

### Summary

The Next.js production build succeeds because `next.config.ts` has `typescript.ignoreBuildErrors: true`, which means **type errors are silently skipped during `next build`**. The app will deploy, but `tsc --noEmit` reveals 30 real type errors, 27 of which are in payment/billing code from the Creem integration. These would become runtime errors if the Supabase queries return unexpected shapes.

ESLint passes cleanly (0 errors, 26 warnings -- all are unused-variable warnings, none blocking).

### Failures

#### Category 1: Supabase Generated Types Out of Sync (23 errors)

**Root cause:** `packages/api/src/database.types.ts` was not regenerated after migration `004_billing.sql` added 7 new columns to the `organizations` table. The Supabase TypeScript client sees `subscription_status` etc. in the `.select()` call but the generated types say those columns do not exist, producing `SelectQueryError` at the type level.

**Affected columns (all missing from generated types):**
`subscription_status`, `trial_ends_at`, `current_period_end`, `creem_customer_id`, `creem_subscription_id`, `billing_email`, `seat_limit`

| # | File:Line | Error | Pre-existing? | Fix |
|---|-----------|-------|---------------|-----|
| 1 | `packages/api/src/queries.ts:506-518` | Properties `id`, `name`, `slug`, `privacy_mode`, `subscription_tier`, etc. do not exist on `SelectQueryError<"column 'subscription_status' does not exist on 'organizations'">` (13 errors in `getOrgSettings`) | No -- introduced with billing migration | Regenerate Supabase types: `npx supabase gen types typescript --linked > packages/api/src/database.types.ts` |
| 2 | `packages/api/src/queries.ts:1919-1933` | Same `SelectQueryError` cascade (10 errors in `getBillingInfo`) | No -- same cause | Same fix as above |

#### Category 2: Creem Webhook Type Errors (4 errors)

| # | File:Line | Error | Pre-existing? | Fix |
|---|-----------|-------|---------------|-----|
| 3 | `apps/web/src/app/api/webhook/creem/route.ts:26` | TS18048: `'customer' is possibly 'undefined'` -- `NormalizedCheckoutEntity.customer` is typed as `CustomerEntity?` (optional) | No -- payment code is new | Add null check: `if (!customer) return;` before accessing `customer.email` on line 26 |
| 4 | `apps/web/src/app/api/webhook/creem/route.ts:32-33` | TS18048: Same -- `customer.id` and `customer.email` access without null guard | No | Same guard as above |
| 5 | `apps/web/src/app/api/webhook/creem/route.ts:75` | TS2367: Comparison `reason === "paused"` is unreachable -- `RevokeAccessReason` is `"subscription_paused" \| "subscription_expired"`, not `"paused"` | No -- logic bug | Change to `reason === "subscription_paused"` |

#### Category 3: Footer Type Errors (3 errors)

| # | File:Line | Error | Pre-existing? | Fix |
|---|-----------|-------|---------------|-----|
| 6 | `apps/web/src/components/landing/Footer.tsx:89-94` | TS2339: Property `external` does not exist on `{ label: string; href: string; }` | Likely pre-existing | Either add `external?: boolean` to the link objects in `footerLinks.resources` that need it, or remove the `link.external` references since no resource links currently use it |

### Logic Bug (Payment-Critical)

**Line 75 of `apps/web/src/app/api/webhook/creem/route.ts` contains a logic bug that would silently break subscription pause handling at runtime:**

```typescript
// CURRENT (BROKEN):
subscription_status: reason === "paused" ? "paused" : "expired",

// CORRECT:
subscription_status: reason === "subscription_paused" ? "paused" : "expired",
```

The Creem SDK defines `RevokeAccessReason` as `"subscription_paused" | "subscription_expired"`. The current comparison against `"paused"` will NEVER match, meaning all revocations -- including intentional pauses -- will be marked as `"expired"`. This is a real production bug.

### Dependency Health

| Package | Version | Last Published | Known Issues |
|---------|---------|---------------|--------------|
| `@creem_io/nextjs` | 0.6.0 | ~1 month ago | No documented issues. Latest version. |
| `next` | 15.5.9 | - | **HIGH: 2 vulnerabilities.** DoS via insecure RSC deserialization (GHSA-h25m-26qc-wcjf, patched in 15.5.10). Unbounded image cache disk growth (GHSA-3x4c-7xq6-9pq8, patched in 15.5.14). Recommend upgrading to `>=15.5.14`. |
| `tar` | 6.2.1 | - | HIGH: Hardlink path traversal (GHSA-34x7-hfp2-rc4v). Desktop-only (electron-builder). Not web-facing. |

**Total audit findings:** 32 vulnerabilities (1 low, 7 moderate, 24 high). Most are in the desktop/electron-builder chain and not relevant to the web app deployment. The two `next` vulnerabilities are relevant.

### Warnings (non-blocking, 26 total)

All 26 ESLint warnings are `@typescript-eslint/no-unused-vars` or `react-hooks/exhaustive-deps`. None are errors. Notable ones:

- `apps/web/src/app/api/webhook/creem/route.ts:63` -- `customer` and `product` destructured but unused in `onRevokeAccess`. Prefix with underscore: `_customer`, `_product`.
- `apps/web/src/app/(dashboard)/admin/page.tsx:157` -- `useEffect` missing `userRole` dependency. Could cause stale closures if `userRole` changes.
- `apps/web/src/app/(dashboard)/dashboard/exercises/page.tsx:13` -- Shadowing global `Infinity`. Rename the variable.

### Build Configuration Note

`next.config.ts` has `typescript: { ignoreBuildErrors: true }`. This means `pnpm build:web` will always succeed regardless of type errors. The `pnpm typecheck` command is the real gatekeeper. If this project has CI, ensure `typecheck` runs as a separate step.

### Recommended Actions (Priority Order)

1. **CRITICAL:** Fix the `"paused"` vs `"subscription_paused"` logic bug in `route.ts:75` -- this WILL break pause handling in production.
2. **HIGH:** Regenerate `database.types.ts` from the live Supabase schema to resolve all 23 SelectQueryError type errors.
3. **HIGH:** Add null guard for `customer` in `onCheckoutCompleted` callback (lines 26, 32-33).
4. **MEDIUM:** Upgrade `next` from 15.5.9 to >=15.5.14 to patch the two security advisories.
5. **LOW:** Fix Footer `external` property type mismatch (either add the property to links or remove the references).
6. **LOW:** Clean up 26 unused-variable warnings.
