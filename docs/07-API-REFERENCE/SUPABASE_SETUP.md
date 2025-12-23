# Supabase Setup Guide

**Status:** Active | Last Updated: Dec 23, 2025

---

## Prerequisites

- Supabase account ([Sign up](https://supabase.com/))
- Supabase CLI ([Installation](https://supabase.com/docs/guides/cli))
- PostgreSQL knowledge (basic SQL)

---

## Create Project

### 1. Sign Up & Create Project

1. Go to [app.supabase.com](https://app.supabase.com/)
2. Click "New Project"
3. Fill in details:
   - **Name:** lumina-production (or lumina-dev for staging)
   - **Database Password:** Generate secure password (save to password manager)
   - **Region:** Choose closest to users (us-east-1 for US, eu-west-1 for EU)
   - **Plan:** Free (0-250 users), Pro ($25/mo for 250+)

4. Wait 2-3 minutes for provisioning

### 2. Get API Credentials

**Dashboard:** Project Settings → API

Copy these values:
```bash
# Project URL
SUPABASE_URL=https://abcdefghijklmnop.supabase.co

# Anon (public) key
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service role (secret) key - NEVER expose to client
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Add to environment files:**

`lumina/apps/desktop/.env`:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

`lumina/apps/web/.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Database Setup

### 1. Enable TimescaleDB Extension

**Dashboard:** Database → Extensions

1. Search for "timescaledb"
2. Click "Enable"
3. Wait for activation (~30 seconds)

**Or via SQL Editor:**
```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

### 2. Run Migrations

**Option A: Supabase Dashboard (Simple)**

1. Dashboard → SQL Editor
2. Paste migration SQL (see below)
3. Click "Run"

**Option B: Supabase CLI (Recommended)**

```bash
# Initialize Supabase in project
cd lumina
supabase init

# Link to remote project
supabase link --project-ref your-project-ref

# Create migration file
supabase migration new initial_schema

# Edit file: supabase/migrations/YYYYMMDDHHMMSS_initial_schema.sql
# (Paste schema from below)

# Push to database
supabase db push
```

### 3. Initial Schema Migration

**File:** `supabase/migrations/20251223000000_initial_schema.sql`

```sql
-- Enable TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  plan TEXT DEFAULT 'free',
  max_users INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Org members (RBAC)
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'employee',
  department TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON org_members(organization_id);
CREATE INDEX idx_org_members_user ON org_members(user_id);

-- Wellness data (time-series)
CREATE TABLE wellness_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  blink_count INTEGER,
  avg_ear REAL,
  wellness_score INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('wellness_data', 'timestamp');

CREATE INDEX idx_wellness_data_user ON wellness_data(user_id, timestamp DESC);
CREATE INDEX idx_wellness_data_org ON wellness_data(organization_id, timestamp DESC);

-- Enable compression (10x storage reduction)
ALTER TABLE wellness_data SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'user_id, organization_id'
);

SELECT add_compression_policy('wellness_data', INTERVAL '7 days');

-- Add retention policy (auto-delete after 90 days)
SELECT add_retention_policy('wellness_data', INTERVAL '90 days');

-- Continuous aggregates (auto-updating views)
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

SELECT add_continuous_aggregate_policy('wellness_1hour_rollup',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);

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

SELECT add_continuous_aggregate_policy('wellness_1day_rollup',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day'
);

-- RLS policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_data ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see their own organization
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid())
  );

-- Org members: Users can see members of their organization
CREATE POLICY "Users can view own org members" ON org_members
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid())
  );

-- Wellness data: Users can only see/insert their own data
CREATE POLICY "Users can view own wellness data" ON wellness_data
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own wellness data" ON wellness_data
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can view all org data
CREATE POLICY "Admins can view org wellness data" ON wellness_data
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM org_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

---

## Authentication Setup

### 1. Configure Auth Providers

**Dashboard:** Authentication → Providers

#### Magic Link (Email OTP)

1. Enable "Email" provider
2. **Confirm email required:** ON (for production)
3. **Secure email change:** ON
4. **Email templates:** Customize (optional)

#### Google OAuth

1. Enable "Google" provider
2. Get credentials from [Google Cloud Console](https://console.cloud.google.com/):
   - Create OAuth 2.0 Client ID
   - Authorized JavaScript origins: `https://your-project.supabase.co`
   - Authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`
3. Paste **Client ID** and **Client Secret** into Supabase
4. Save

**Add to web app:**

`lumina/apps/web/.env.local`:
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 2. Configure Auth Settings

**Dashboard:** Authentication → Settings

```
Site URL: https://lumina.vercel.app (or your production URL)
Redirect URLs:
  - https://lumina.vercel.app/**
  - http://localhost:3000/** (for development)
  - lumina://auth/callback (for desktop app)
```

**JWT expiry:**
- Access token: 1 hour (default)
- Refresh token: 30 days (default)

---

## Row Level Security (RLS) Testing

### Verify RLS Policies

**Test as regular user:**

```sql
-- Set session to simulate user
SET request.jwt.claims.sub = 'user-uuid-here';

-- Try to query wellness data (should only see own data)
SELECT * FROM wellness_data;

-- Try to query other user's data (should return empty)
SELECT * FROM wellness_data WHERE user_id = 'other-user-uuid';
```

**Test as admin:**

```sql
-- Set session to admin user
SET request.jwt.claims.sub = 'admin-user-uuid';

-- Should see all org data
SELECT * FROM wellness_data WHERE organization_id = 'org-uuid';
```

---

## Seed Data (Development)

**Create test organization:**

```sql
-- Insert test org
INSERT INTO organizations (id, name, domain, plan, max_users)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme Corporation',
  'acme.com',
  'pro',
  100
);

-- Add test user to org
INSERT INTO org_members (organization_id, user_id, role, department)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  auth.uid(), -- Current user
  'admin',
  'Engineering'
);

-- Insert sample wellness data
INSERT INTO wellness_data (user_id, organization_id, timestamp, blink_count, avg_ear, wellness_score)
SELECT
  auth.uid(),
  '00000000-0000-0000-0000-000000000001',
  NOW() - (i * INTERVAL '1 minute'),
  10 + (random() * 10)::INTEGER,
  0.20 + (random() * 0.05),
  70 + (random() * 25)::INTEGER
FROM generate_series(1, 1440) AS i; -- 24 hours of data
```

---

## Performance Optimization

### 1. Indexes

**Check index usage:**

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

**Add missing indexes:**

```sql
-- If you find slow queries on wellness_score
CREATE INDEX idx_wellness_data_score ON wellness_data(wellness_score);

-- Composite index for common query patterns
CREATE INDEX idx_wellness_data_user_time_score
  ON wellness_data(user_id, timestamp DESC, wellness_score);
```

### 2. Compression

**Check compression stats:**

```sql
SELECT
  hypertable_name,
  total_bytes,
  compressed_total_bytes,
  ROUND(100.0 * compressed_total_bytes / NULLIF(total_bytes, 0), 2) AS compression_ratio
FROM timescaledb_information.hypertable_compression_stats;
```

**Expected:** ~10% (10x compression)

### 3. Query Performance

**Explain analyze queries:**

```sql
EXPLAIN ANALYZE
SELECT * FROM wellness_1day_rollup
WHERE user_id = 'user-uuid'
  AND day >= NOW() - INTERVAL '7 days'
ORDER BY day DESC;
```

**Optimize with:**
- Materialized views (continuous aggregates)
- Partition pruning (TimescaleDB automatic)
- Proper indexes

---

## Monitoring

### 1. Database Size

```sql
SELECT
  pg_size_pretty(pg_database_size(current_database())) AS total_size;

-- Per table
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 2. Active Connections

```sql
SELECT
  COUNT(*) AS connection_count,
  state
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;
```

### 3. Slow Queries

**Dashboard:** Reports → Query Performance

Or via SQL:
```sql
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Backup & Recovery

### Automatic Backups

**Free plan:** Daily backups (7-day retention)
**Pro plan:** Daily backups (30-day retention)

**Dashboard:** Database → Backups

### Manual Backup

```bash
# Export schema only
supabase db dump --schema-only > schema.sql

# Export data only
supabase db dump --data-only > data.sql

# Export everything
supabase db dump > backup.sql
```

### Restore

```bash
# Restore schema
psql postgres://[CONNECTION_STRING] < schema.sql

# Restore data
psql postgres://[CONNECTION_STRING] < data.sql
```

---

## Security Checklist

### Before Production

- [ ] Enable RLS on all tables
- [ ] Test RLS policies with multiple user roles
- [ ] Enable 2FA for Supabase account
- [ ] Rotate service role key (if exposed)
- [ ] Configure rate limiting (Dashboard → API Settings)
- [ ] Enable SSL enforcement (default ON)
- [ ] Review auth redirect URLs (no wildcards in production)
- [ ] Set up database alerts (Dashboard → Reports → Alerts)

---

## Common Issues

### Issue 1: "Permission denied for table"

**Cause:** RLS policy blocking query

**Fix:**
```sql
-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- View policies
\dp wellness_data

-- Temporarily disable RLS (development only)
ALTER TABLE wellness_data DISABLE ROW LEVEL SECURITY;
```

### Issue 2: Slow queries on wellness_data

**Cause:** Missing indexes or not using continuous aggregates

**Fix:**
```sql
-- Use continuous aggregates instead of raw table
SELECT * FROM wellness_1hour_rollup
WHERE user_id = 'uuid'
  AND hour >= NOW() - INTERVAL '24 hours';

-- Instead of:
SELECT * FROM wellness_data WHERE ...
```

### Issue 3: Storage limit exceeded

**Cause:** Retention policy not working or compression disabled

**Fix:**
```sql
-- Check retention policy
SELECT * FROM timescaledb_information.jobs
WHERE proc_name = 'policy_retention';

-- Manually run retention policy
CALL run_job(job_id);

-- Force compression
SELECT compress_chunk(i)
FROM show_chunks('wellness_data') i;
```

---

## Migration Workflow

### Development → Staging → Production

1. **Development:**
   ```bash
   supabase migration new feature_name
   # Edit migration file
   supabase db reset # Test locally
   ```

2. **Staging:**
   ```bash
   supabase link --project-ref staging-ref
   supabase db push
   # Test in staging
   ```

3. **Production:**
   ```bash
   supabase link --project-ref production-ref
   supabase db push
   # Verify with smoke tests
   ```

### Rollback

```bash
# View migration history
supabase migration list

# Rollback to specific version
supabase db reset --version YYYYMMDDHHMMSS
```

---

## Related Documentation

- **Database Schema:** [Full schema reference](DATABASE_SCHEMA.md)
- **Data Flow:** [Sync pipeline](../03-ARCHITECTURE/DATA_FLOW.md)
- **Deployment:** [Production setup](../04-IMPLEMENTATION/DEPLOYMENT.md)

---

**Questions?** See [Supabase Docs](https://supabase.com/docs) or [Documentation Index](../INDEX.md).
