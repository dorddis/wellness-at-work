-- Lumina Billing Schema - Creem Payment Integration
-- Migration 004: Add billing columns to organizations

-- Add billing columns to organizations table
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS creem_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS creem_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trialing'
        CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'expired', 'paused', 'unpaid')),
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS billing_email TEXT,
    ADD COLUMN IF NOT EXISTS seat_limit INTEGER NOT NULL DEFAULT 5;

-- Update subscription_tier CHECK to include 'pro' (was missing, only had trial/starter/enterprise)
ALTER TABLE public.organizations
    DROP CONSTRAINT IF EXISTS organizations_subscription_tier_check;
ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_subscription_tier_check
    CHECK (subscription_tier IN ('trial', 'starter', 'pro', 'enterprise'));

-- Index for looking up orgs by Creem customer ID (webhook lookups)
CREATE INDEX IF NOT EXISTS idx_organizations_creem_customer
    ON public.organizations(creem_customer_id)
    WHERE creem_customer_id IS NOT NULL;

-- Index for trial expiration queries
CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends
    ON public.organizations(trial_ends_at)
    WHERE subscription_status = 'trialing';

-- Backfill existing orgs: set trial_ends_at for any org that doesn't have it
UPDATE public.organizations
SET trial_ends_at = created_at + INTERVAL '14 days'
WHERE trial_ends_at IS NULL;

-- Set seat_limit based on existing subscription_tier
UPDATE public.organizations
SET seat_limit = CASE
    WHEN subscription_tier = 'trial' THEN 5
    WHEN subscription_tier = 'starter' THEN 25
    WHEN subscription_tier = 'pro' THEN 200
    WHEN subscription_tier = 'enterprise' THEN 10000
    ELSE 5
END
WHERE seat_limit = 5;
