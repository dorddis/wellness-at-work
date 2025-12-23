# Database Schema Reference

**Status:** Active | Last Updated: Dec 23, 2025

---

## Overview

Lumina uses **two databases:**

1. **SQLite (Local)** - Desktop app, offline-first storage
2. **PostgreSQL/TimescaleDB (Cloud)** - Supabase, multi-tenant, admin dashboards

**Data flow:** SQLite → Minute rollups → Batch sync → Supabase → TimescaleDB aggregates

---

## SQLite Schema (Desktop App)

**Location:** `~/Library/Application Support/lumina/lumina.db` (macOS)

**WAL Mode:** Enabled for concurrent reads/writes

### 1. blink_events (Raw Frame Data)

**Purpose:** Store every frame's EAR values for debugging/analysis

**Retention:** 24 hours (auto-deleted)

```sql
CREATE TABLE blink_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,           -- Unix timestamp (milliseconds)
  ear_left REAL,                        -- Left eye aspect ratio
  ear_right REAL,                       -- Right eye aspect ratio
  ear_avg REAL,                         -- Average EAR
  is_blink BOOLEAN DEFAULT 0            -- 1 if blink detected
);

CREATE INDEX idx_blink_events_timestamp ON blink_events(timestamp);
```

**Example row:**
```json
{
  "id": 1,
  "timestamp": 1734955200000,
  "ear_left": 0.22,
  "ear_right": 0.23,
  "ear_avg": 0.225,
  "is_blink": 0
}
```

**Data volume:** 2.6M rows/day (30 FPS × 86,400 sec), auto-deleted after 24hr

---

### 2. minute_rollups (Aggregated Metrics)

**Purpose:** Store 60-second aggregated wellness metrics (primary sync table)

**Retention:** Indefinite (cleaned up 7 days after sync)

```sql
CREATE TABLE minute_rollups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  minute_start INTEGER NOT NULL,       -- Unix timestamp (rounded to minute)
  blink_count INTEGER DEFAULT 0,       -- Total blinks in minute
  avg_ear REAL,                        -- Average EAR
  min_ear REAL,                        -- Minimum EAR (deepest blink)
  max_ear REAL,                        -- Maximum EAR (widest open)
  wellness_score INTEGER,              -- 0-100 calculated score
  synced BOOLEAN DEFAULT 0,            -- 1 if uploaded to cloud
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE INDEX idx_minute_rollups_minute ON minute_rollups(minute_start);
CREATE INDEX idx_minute_rollups_synced ON minute_rollups(synced);
```

**Example row:**
```json
{
  "id": 1,
  "minute_start": 1734955200000,
  "blink_count": 17,
  "avg_ear": 0.22,
  "min_ear": 0.18,
  "max_ear": 0.26,
  "wellness_score": 88,
  "synced": 0,
  "created_at": 1734955260000
}
```

**Data volume:** 1,440 rows/day (24 hr × 60 min)

---

### 3. wellness_events (Posture/Yawns/Drowsiness)

**Purpose:** Store non-blink events (yawns, posture issues, fatigue)

**Retention:** 7 days (auto-deleted)

```sql
CREATE TABLE wellness_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  event_type TEXT NOT NULL,            -- 'yawn', 'posture_close', 'posture_tilt', 'drowsiness'
  severity TEXT,                       -- 'low', 'medium', 'high'
  metadata TEXT,                       -- JSON: {distance: 0.8, tilt: 15, lean: 0.3}
  synced BOOLEAN DEFAULT 0
);

CREATE INDEX idx_wellness_events_timestamp ON wellness_events(timestamp);
CREATE INDEX idx_wellness_events_type ON wellness_events(event_type);
```

**Example rows:**
```json
{
  "id": 1,
  "timestamp": 1734955300000,
  "event_type": "yawn",
  "severity": "low",
  "metadata": "{\"duration\": 2500}",
  "synced": 0
}
```

---

### 4. user_baseline (Auto-Calibration)

**Purpose:** Store user's personalized blink rate baseline

**Retention:** Persistent (updated every 7 days)

```sql
CREATE TABLE user_baseline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  p25 REAL NOT NULL,                   -- 25th percentile blink rate
  p50 REAL NOT NULL,                   -- Median blink rate
  p75 REAL NOT NULL,                   -- 75th percentile blink rate
  calibrated_at INTEGER NOT NULL,      -- Unix timestamp
  updated_at INTEGER DEFAULT (unixepoch() * 1000)
);
```

**Example row:**
```json
{
  "id": 1,
  "p25": 12.5,
  "p50": 15.8,
  "p75": 19.2,
  "calibrated_at": 1734348800000,
  "updated_at": 1734955200000
}
```

---

### 5. daily_progress (Gamification)

**Purpose:** Track daily wellness metrics for achievements/streaks

**Retention:** Indefinite (synced to cloud)

```sql
CREATE TABLE daily_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date INTEGER NOT NULL,               -- Unix timestamp (start of day)
  breaks INTEGER DEFAULT 0,            -- Number of breaks taken
  blink_minutes INTEGER DEFAULT 0,     -- Minutes with healthy blink rate
  posture_minutes INTEGER DEFAULT 0,   -- Minutes with good posture
  wellness_score INTEGER,              -- Average daily score
  synced BOOLEAN DEFAULT 0
);

CREATE UNIQUE INDEX idx_daily_progress_date ON daily_progress(date);
```

**Example row:**
```json
{
  "id": 1,
  "date": 1734912000000,
  "breaks": 4,
  "blink_minutes": 420,
  "posture_minutes": 300,
  "wellness_score": 85,
  "synced": 0
}
```

---

### 6. user_streaks (Gamification)

**Purpose:** Track user's current and best streaks

**Retention:** Persistent

```sql
CREATE TABLE user_streaks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  streak_type TEXT NOT NULL,           -- 'daily_use', 'healthy_eyes', 'break_master', 'good_posture'
  current INTEGER DEFAULT 0,           -- Current streak count
  best INTEGER DEFAULT 0,              -- Personal best
  last_updated INTEGER,                -- Unix timestamp
  freezes_used INTEGER DEFAULT 0,      -- Freezes used this month
  freezes_available INTEGER DEFAULT 1
);

CREATE UNIQUE INDEX idx_user_streaks_type ON user_streaks(streak_type);
```

---

### 7. user_achievements (Gamification)

**Purpose:** Track unlocked achievements

**Retention:** Persistent

```sql
CREATE TABLE user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  achievement_id TEXT NOT NULL,        -- 'first-steps', 'perfect-day', etc.
  unlocked_at INTEGER,                 -- Unix timestamp (NULL if locked)
  progress INTEGER DEFAULT 0,          -- 0-100 (for incremental achievements)
  synced BOOLEAN DEFAULT 0
);

CREATE UNIQUE INDEX idx_user_achievements_id ON user_achievements(achievement_id);
```

---

### 8. user_settings (Preferences)

**Purpose:** Store user preferences and app state

**Retention:** Persistent

```sql
CREATE TABLE user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,                   -- Setting name
  value TEXT,                          -- JSON value
  updated_at INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE UNIQUE INDEX idx_user_settings_key ON user_settings(key);
```

**Example rows:**
```json
[
  {"key": "onboarding_complete", "value": "true"},
  {"key": "meeting_mode_enabled", "value": "true"},
  {"key": "notifications_enabled", "value": "true"},
  {"key": "theme", "value": "light"}
]
```

---

### 9. exercise_sessions (Eye Exercises)

**Purpose:** Track eye exercise sessions

**Retention:** Indefinite

```sql
CREATE TABLE exercise_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_type TEXT NOT NULL,         -- '20-20-20', 'eye_yoga', 'palming'
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  duration INTEGER,                    -- Milliseconds
  completed BOOLEAN DEFAULT 0,
  synced BOOLEAN DEFAULT 0
);

CREATE INDEX idx_exercise_sessions_start ON exercise_sessions(start_time);
```

---

## Supabase Schema (Cloud)

**Database:** PostgreSQL 15 + TimescaleDB extension

**Multi-tenancy:** Row Level Security (RLS) policies

### 1. organizations (Multi-Tenant Isolation)

**Purpose:** Tenant table for enterprise customers

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,                         -- Email domain (e.g., 'acme.com')
  plan TEXT DEFAULT 'free',            -- 'free', 'pro', 'enterprise'
  max_users INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can only see their own organization
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid())
  );
```

---

### 2. org_members (Role-Based Access Control)

**Purpose:** Map users to organizations with roles

```sql
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'employee',  -- 'admin', 'manager', 'employee'
  department TEXT,                      -- 'Engineering', 'Sales', 'Support'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON org_members(organization_id);
CREATE INDEX idx_org_members_user ON org_members(user_id);

-- RLS: Users can only see members of their organization
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org members" ON org_members
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid())
  );
```

---

### 3. wellness_data (Hypertable - Time-Series)

**Purpose:** Minute rollups synced from desktop app

**Partitioning:** TimescaleDB hypertable (auto-partitions by timestamp)

```sql
CREATE TABLE wellness_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  blink_count INTEGER,
  avg_ear REAL,
  wellness_score INTEGER,
  metadata JSONB,                      -- {min_ear, max_ear, session_id}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable (TimescaleDB)
SELECT create_hypertable('wellness_data', 'timestamp');

-- Indexes
CREATE INDEX idx_wellness_data_user ON wellness_data(user_id, timestamp DESC);
CREATE INDEX idx_wellness_data_org ON wellness_data(organization_id, timestamp DESC);

-- Compression (10x storage reduction after 7 days)
ALTER TABLE wellness_data SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'user_id, organization_id'
);

SELECT add_compression_policy('wellness_data', INTERVAL '7 days');

-- Retention policy (auto-delete after 90 days)
SELECT add_retention_policy('wellness_data', INTERVAL '90 days');

-- RLS: Users can only see their own data
ALTER TABLE wellness_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wellness data" ON wellness_data
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own wellness data" ON wellness_data
  FOR INSERT WITH CHECK (user_id = auth.uid());
```

---

### 4. wellness_1hour_rollup (Continuous Aggregate)

**Purpose:** Auto-updated hourly aggregates for dashboards

```sql
CREATE MATERIALIZED VIEW wellness_1hour_rollup
WITH (timescaledb.continuous) AS
SELECT
  user_id,
  organization_id,
  time_bucket('1 hour', timestamp) AS hour,
  SUM(blink_count) AS total_blinks,
  AVG(avg_ear) AS avg_ear,
  AVG(wellness_score) AS avg_wellness_score,
  COUNT(*) AS sample_count
FROM wellness_data
GROUP BY user_id, organization_id, hour;

-- Refresh policy (update every hour)
SELECT add_continuous_aggregate_policy('wellness_1hour_rollup',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);

-- RLS
ALTER MATERIALIZED VIEW wellness_1hour_rollup OWNER TO postgres;
GRANT SELECT ON wellness_1hour_rollup TO authenticated;
```

---

### 5. wellness_1day_rollup (Continuous Aggregate)

**Purpose:** Daily aggregates for trend analysis

```sql
CREATE MATERIALIZED VIEW wellness_1day_rollup
WITH (timescaledb.continuous) AS
SELECT
  user_id,
  organization_id,
  time_bucket('1 day', timestamp) AS day,
  SUM(blink_count) AS total_blinks,
  AVG(avg_ear) AS avg_ear,
  AVG(wellness_score) AS avg_wellness_score,
  COUNT(*) AS sample_count
FROM wellness_data
GROUP BY user_id, organization_id, day;

-- Refresh policy (update daily at midnight)
SELECT add_continuous_aggregate_policy('wellness_1day_rollup',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day'
);
```

---

### 6. org_alerts (Admin Dashboard)

**Purpose:** Alert inbox for HR/wellness teams

```sql
CREATE TABLE org_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,            -- 'low_wellness_score', 'extended_drowsiness'
  severity TEXT,                       -- 'info', 'warning', 'critical'
  message TEXT,
  metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_alerts_org ON org_alerts(organization_id, created_at DESC);

-- RLS: Admins can see all org alerts
ALTER TABLE org_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view org alerts" ON org_alerts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );
```

---

## Migration Scripts

**Location:** `lumina/supabase/migrations/`

**Naming:** `YYYYMMDDHHMMSS_description.sql`

**Example: Initial schema**
```sql
-- File: 20251215000000_initial_schema.sql

BEGIN;

-- Organizations table
CREATE TABLE organizations (...);

-- Org members table
CREATE TABLE org_members (...);

-- Wellness data hypertable
CREATE TABLE wellness_data (...);
SELECT create_hypertable('wellness_data', 'timestamp');

-- Continuous aggregates
CREATE MATERIALIZED VIEW wellness_1hour_rollup ...;
CREATE MATERIALIZED VIEW wellness_1day_rollup ...;

-- RLS policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own organization" ...;

COMMIT;
```

**Run migrations:**
```bash
supabase db push
```

---

## Related Documentation

- **Data Flow:** [End-to-end pipeline](../03-ARCHITECTURE/DATA_FLOW.md)
- **Supabase Setup:** [Migration guide](SUPABASE_SETUP.md)
- **Offline-First:** [Local storage strategy](../03-ARCHITECTURE/OFFLINE_FIRST_DESIGN.md)

---

**Questions?** See [Documentation Index](../INDEX.md) or review `apps/desktop/src/main/database.ts` for SQLite schema.
