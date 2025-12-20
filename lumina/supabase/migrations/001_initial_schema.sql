-- Lumina B2B Wellness Platform - Initial Schema
-- Run this in Supabase SQL Editor

-- ============================================================================
-- Organizations (tenants)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    privacy_mode TEXT NOT NULL DEFAULT 'anonymous'
        CHECK (privacy_mode IN ('anonymous', 'named', 'manager_only')),
    subscription_tier TEXT NOT NULL DEFAULT 'trial'
        CHECK (subscription_tier IN ('trial', 'starter', 'enterprise')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for slug lookup
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- ============================================================================
-- Organization Members
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'employee'
        CHECK (role IN ('admin', 'manager', 'employee')),
    department TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id);

-- ============================================================================
-- Wellness Data (minute rollups from desktop app)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wellness_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    blink_count INTEGER NOT NULL CHECK (blink_count >= 0),
    avg_ear REAL CHECK (avg_ear >= 0 AND avg_ear <= 1),
    session_id UUID
);

-- Indexes for time-series queries
CREATE INDEX IF NOT EXISTS idx_wellness_data_user_time
    ON public.wellness_data(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wellness_data_org_time
    ON public.wellness_data(org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wellness_data_session
    ON public.wellness_data(session_id) WHERE session_id IS NOT NULL;

-- ============================================================================
-- Organization Alerts (for admin visibility)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.org_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    message TEXT,
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_alerts_org_time
    ON public.org_alerts(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_alerts_unacked
    ON public.org_alerts(org_id) WHERE acknowledged = FALSE;

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_alerts ENABLE ROW LEVEL SECURITY;

-- Organizations: Members can read their own org
CREATE POLICY "Members can read their organization"
    ON public.organizations FOR SELECT
    USING (
        id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid()
        )
    );

-- Organizations: Only admins can update
CREATE POLICY "Admins can update their organization"
    ON public.organizations FOR UPDATE
    USING (
        id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Org Members: Members can see other members in their org
CREATE POLICY "Members can see org members"
    ON public.org_members FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid()
        )
    );

-- Org Members: Anyone can insert (join org) - validation in application
CREATE POLICY "Users can join organizations"
    ON public.org_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Org Members: Admins can update/delete members
CREATE POLICY "Admins can manage members"
    ON public.org_members FOR ALL
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Wellness Data: Users can insert their own data
CREATE POLICY "Users can insert own wellness data"
    ON public.wellness_data FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Wellness Data: Users can read their own data
CREATE POLICY "Users can read own wellness data"
    ON public.wellness_data FOR SELECT
    USING (user_id = auth.uid());

-- Wellness Data: Admins/managers can read all org data
CREATE POLICY "Admins can read all org wellness data"
    ON public.wellness_data FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Org Alerts: Users can insert alerts for themselves
CREATE POLICY "Users can create own alerts"
    ON public.org_alerts FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Org Alerts: Admins/managers can read all org alerts
CREATE POLICY "Admins can read org alerts"
    ON public.org_alerts FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Org Alerts: Admins can acknowledge alerts
CREATE POLICY "Admins can update alerts"
    ON public.org_alerts FOR UPDATE
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_org()
RETURNS UUID AS $$
    SELECT org_id FROM public.org_members
    WHERE user_id = auth.uid()
    LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_org_admin(check_org_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.org_members
        WHERE user_id = auth.uid()
        AND org_id = check_org_id
        AND role = 'admin'
    );
$$ LANGUAGE SQL SECURITY DEFINER;
