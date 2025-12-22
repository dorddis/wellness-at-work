-- Migration: 002_new_features.sql
-- Description: Add tables for break tracking, eye exercises, team challenges, and integrations
-- Created: 2024-12-22

-- ============================================================================
-- BREAK EVENTS TABLE
-- Track scheduled, completed, skipped, and postponed breaks
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.break_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    postponed_count INTEGER DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'completed', 'skipped', 'postponed')),
    break_type TEXT DEFAULT 'regular' CHECK (break_type IN ('regular', 'manual', 'forced')),
    duration_seconds INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_break_events_user_time ON public.break_events(user_id, scheduled_at DESC);
CREATE INDEX idx_break_events_org_time ON public.break_events(org_id, scheduled_at DESC);
CREATE INDEX idx_break_events_status ON public.break_events(status) WHERE status IN ('scheduled', 'in_progress');

-- ============================================================================
-- EYE EXERCISES TABLE
-- Library of guided eye exercises
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.eye_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
    instructions JSONB NOT NULL, -- Array: [{step: 1, text: "...", duration: 5}]
    category TEXT NOT NULL CHECK (category IN ('relaxation', 'focus', 'mobility', 'strain_relief')),
    difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    icon_name TEXT, -- lucide-react icon name
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_eye_exercises_active ON public.eye_exercises(is_active, sort_order);

-- ============================================================================
-- EXERCISE SESSIONS TABLE
-- Track user exercise completion history
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.exercise_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.eye_exercises(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exercise_sessions_user ON public.exercise_sessions(user_id, started_at DESC);
CREATE INDEX idx_exercise_sessions_org ON public.exercise_sessions(org_id, started_at DESC);

-- ============================================================================
-- TEAM CHALLENGES TABLE
-- Gamified wellness competitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.team_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    challenge_type TEXT NOT NULL CHECK (challenge_type IN ('break_compliance', 'posture_health', 'blink_health', 'wellness_week', 'exercise_streak')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    target_metric JSONB NOT NULL, -- {metric: 'break_count', target: 20, unit: 'breaks'}
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
    prize_description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_challenge_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_team_challenges_org ON public.team_challenges(org_id, start_date DESC);
CREATE INDEX idx_team_challenges_status ON public.team_challenges(status);

-- ============================================================================
-- CHALLENGE PARTICIPANTS TABLE
-- User participation and progress in challenges
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES public.team_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    department TEXT, -- Denormalized for easy grouping
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_progress INTEGER DEFAULT 0,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(challenge_id, user_id)
);

CREATE INDEX idx_challenge_participants_challenge ON public.challenge_participants(challenge_id, current_progress DESC);
CREATE INDEX idx_challenge_participants_user ON public.challenge_participants(user_id);

-- ============================================================================
-- INTEGRATIONS TABLE
-- Third-party service connections per organization
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    integration_type TEXT NOT NULL CHECK (integration_type IN ('google_calendar', 'microsoft_calendar', 'slack', 'microsoft_teams', 'bamboohr', 'workday')),
    status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
    credentials JSONB, -- Encrypted OAuth tokens, API keys (sensitive)
    config JSONB DEFAULT '{}'::jsonb, -- Integration-specific settings
    last_synced_at TIMESTAMPTZ,
    error_message TEXT,
    connected_by UUID REFERENCES auth.users(id),
    connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, integration_type)
);

CREATE INDEX idx_integrations_org ON public.integrations(org_id, integration_type);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Break Events RLS
ALTER TABLE public.break_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own breaks"
    ON public.break_events FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view org breaks"
    ON public.break_events FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Eye Exercises RLS (public read for active exercises)
ALTER TABLE public.eye_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active exercises"
    ON public.eye_exercises FOR SELECT
    USING (is_active = TRUE);

-- Exercise Sessions RLS
ALTER TABLE public.exercise_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own exercise sessions"
    ON public.exercise_sessions FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view org exercise sessions"
    ON public.exercise_sessions FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Team Challenges RLS
ALTER TABLE public.team_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read challenges"
    ON public.team_challenges FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage challenges"
    ON public.team_challenges FOR ALL
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Challenge Participants RLS
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own participation"
    ON public.challenge_participants FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can view challenge leaderboard"
    ON public.challenge_participants FOR SELECT
    USING (
        challenge_id IN (
            SELECT id FROM public.team_challenges tc
            WHERE tc.org_id IN (
                SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
            )
        )
    );

-- Integrations RLS (admin only)
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage integrations"
    ON public.integrations FOR ALL
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- SEED DATA: Default Eye Exercises
-- ============================================================================
INSERT INTO public.eye_exercises (name, description, duration_seconds, instructions, category, difficulty, icon_name, sort_order) VALUES
(
    '20-20-20 Rule',
    'Reduce eye strain by looking away from your screen every 20 minutes at something 20 feet away for 20 seconds.',
    20,
    '[{"step": 1, "text": "Look away from your screen", "duration": 3}, {"step": 2, "text": "Find an object about 20 feet (6 meters) away", "duration": 2}, {"step": 3, "text": "Focus on that distant object and relax your eyes", "duration": 15}]'::jsonb,
    'strain_relief',
    'beginner',
    'Eye',
    1
),
(
    'Eye Circles',
    'Improve eye mobility and relieve tension by slowly rotating your eyes in circles.',
    60,
    '[{"step": 1, "text": "Sit comfortably and relax your shoulders", "duration": 5}, {"step": 2, "text": "Look up, then slowly circle your eyes clockwise", "duration": 20}, {"step": 3, "text": "Reverse direction - circle counterclockwise", "duration": 20}, {"step": 4, "text": "Blink several times to relax", "duration": 15}]'::jsonb,
    'mobility',
    'beginner',
    'RotateCw',
    2
),
(
    'Palming',
    'Warm and relax your eyes by covering them with your palms in complete darkness.',
    90,
    '[{"step": 1, "text": "Rub your palms together vigorously to warm them", "duration": 10}, {"step": 2, "text": "Cup your warm palms gently over closed eyes", "duration": 5}, {"step": 3, "text": "Relax in the darkness and breathe deeply", "duration": 60}, {"step": 4, "text": "Slowly remove hands and open your eyes", "duration": 15}]'::jsonb,
    'relaxation',
    'beginner',
    'Hand',
    3
),
(
    'Focus Shifting',
    'Strengthen your focusing muscles by alternating between near and far objects.',
    45,
    '[{"step": 1, "text": "Hold your thumb about 10 inches from your face", "duration": 5}, {"step": 2, "text": "Focus intently on your thumb for 5 seconds", "duration": 5}, {"step": 3, "text": "Shift focus to an object 10-20 feet away", "duration": 5}, {"step": 4, "text": "Continue alternating: thumb, far, thumb, far...", "duration": 30}]'::jsonb,
    'focus',
    'intermediate',
    'Target',
    4
),
(
    'Figure Eight',
    'Trace an imaginary figure-eight with your eyes to improve control and flexibility.',
    60,
    '[{"step": 1, "text": "Imagine a large figure 8 lying on its side about 10 feet away", "duration": 5}, {"step": 2, "text": "Slowly trace the figure 8 with just your eyes", "duration": 25}, {"step": 3, "text": "Reverse direction and trace the other way", "duration": 25}, {"step": 4, "text": "Blink and rest your eyes", "duration": 5}]'::jsonb,
    'mobility',
    'intermediate',
    'Infinity',
    5
),
(
    'Blinking Exercise',
    'Combat dry eyes and screen fatigue with intentional, mindful blinking.',
    30,
    '[{"step": 1, "text": "Close your eyes fully and gently", "duration": 2}, {"step": 2, "text": "Pause for a moment with eyes closed", "duration": 1}, {"step": 3, "text": "Open your eyes", "duration": 1}, {"step": 4, "text": "Repeat this slow, deliberate blink every 4 seconds", "duration": 26}]'::jsonb,
    'strain_relief',
    'beginner',
    'EyeOff',
    6
);
