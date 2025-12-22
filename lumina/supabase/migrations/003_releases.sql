-- Migration: 003_releases.sql
-- Description: Add table for tracking application releases and download URLs
-- Created: 2025-12-22

CREATE TABLE IF NOT EXISTS public.releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL UNIQUE,
    windows_url TEXT,
    windows_size BIGINT,
    macos_url TEXT,
    macos_size BIGINT,
    release_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for version and time
CREATE INDEX IF NOT EXISTS idx_releases_version ON public.releases(version);
CREATE INDEX IF NOT EXISTS idx_releases_created_at ON public.releases(created_at DESC);

-- Enable RLS
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

-- Anyone can read releases (to see the download page)
CREATE POLICY "Anyone can view releases"
    ON public.releases FOR SELECT
    USING (true);

-- Only service key/admins can insert/update (handled by API/workflow)
-- Note: Service Role key bypasses RLS.
CREATE POLICY "Admins can manage releases"
    ON public.releases FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
