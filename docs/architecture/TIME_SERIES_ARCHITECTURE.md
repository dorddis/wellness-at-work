# WellnessGuard Time-Series Architecture Proposal

**Author:** Data Infrastructure Architect
**Date:** 2025-12-18
**Purpose:** Solve Critical Six + 10 Scaling Challenges with purpose-built time-series infrastructure

---

## Executive Summary

This architecture leverages **TimescaleDB** (PostgreSQL extension) as the primary time-series database to handle 30Hz sensor data from thousands of users while solving all Critical Six and 10 Scaling Challenges. TimescaleDB was chosen for its SQL familiarity, automatic partitioning, compression (90%+ ratio), continuous aggregates, and seamless integration with existing Supabase/PostgreSQL ecosystem.

**Key Performance Targets:**
- 30,000 writes/sec sustained (1,000 concurrent users @ 30Hz)
- Dashboard queries <100ms for 30-day aggregations
- 95%+ compression on raw data older than 7 days
- 30-day raw data retention, 1-year aggregated retention
- GDPR deletion <5 seconds for any user
- Offline queue sync handling 216,000 points/user

---

## 1. High-Level Architecture

```
                                 USER DEVICES (1K-100K users)
+-----------------------------------------------------------------------------+
|                                                                             |
|  +------------------+    +------------------+    +------------------+       |
|  | Desktop App 1    |    | Desktop App 2    |    | Desktop App N    |       |
|  |------------------|    |------------------|    |------------------|       |
|  | MediaPipe (30Hz) |    | MediaPipe (30Hz) |    | MediaPipe (30Hz) |       |
|  | Posture (1Hz)    |    | Posture (1Hz)    |    | Posture (1Hz)    |       |
|  | Fatigue (0.1Hz)  |    | Fatigue (0.1Hz)  |    | Fatigue (0.1Hz)  |       |
|  +--------+---------+    +--------+---------+    +--------+---------+       |
|           |                       |                       |                 |
|           |   SQLite Local Queue (Offline-First)          |                 |
|           |   - Batched writes (5-10 sec buffers)         |                 |
|           |   - Idempotency keys (UUID per batch)         |                 |
|           |   - Sync checkpoints (track last synced)      |                 |
|           |                       |                       |                 |
+-----------|-----------------------------------------------------------+-------+
            |                       |                       |         |
            |            HTTPS (Rate Limited)               |         |
            |                       |                       |         |
+-----------|-----------------------------------------------------------+-------+
|           v                       v                       v         v       |
|  +--------------------------------------------------------------------+     |
|  |                    INGESTION API LAYER                             |     |
|  |  (FastAPI/Node.js with Connection Pooling)                         |     |
|  |--------------------------------------------------------------------|     |
|  |  - PgBouncer connection pooler (1000+ clients -> 50 DB conns)      |     |
|  |  - Rate limiter (per-user: 100 req/min, burst: 200)                |     |
|  |  - Backpressure (queue >10K = HTTP 429, client exponential backoff)|     |
|  |  - Batch writer (accumulate 1000 rows or 500ms, whichever first)   |     |
|  |  - Idempotency check (Redis cache: batch_id -> processed)          |     |
|  +--------------------------------------------------------------------+     |
|                                    |                                        |
|                                    v                                        |
|  +--------------------------------------------------------------------+     |
|  |                       TIMESCALEDB CLUSTER                           |     |
|  |  (PostgreSQL 17 + TimescaleDB 2.20.2)                              |     |
|  |--------------------------------------------------------------------|     |
|  |  PRIMARY NODE (Write/Read)                                          |     |
|  |  - Hypertables with automatic chunking (1-hour chunks)             |     |
|  |  - Native compression (90-95% reduction, 7-day policy)             |     |
|  |  - Continuous aggregates (5-min, 1-hour, daily rollups)            |     |
|  |  - Partitioning by user_id + time for query isolation              |     |
|  |                                                                    |     |
|  |  REPLICA NODES (Read-only, optional for >10K users)                 |     |
|  |  - Async streaming replication                                     |     |
|  |  - Serve dashboard queries, admin analytics                        |     |
|  +--------------------------------------------------------------------+     |
|                                    |                                        |
+-----------------------------------|----------------------------------------+
                                    |
                                    v
+-----------------------------------+----------------------------------------+
|                         CACHING & ALERT LAYER                              |
|  +--------------------------------------------------------------------+     |
|  |  Redis (Hot path for real-time alerts)                             |     |
|  |  - Session state (active sessions, last_sync_timestamp)            |     |
|  |  - Alert cooldowns (prevent spam: alert_type:user_id -> expires)   |     |
|  |  - Rolling window metrics (last 2 min blink count for alerts)      |     |
|  |  - Idempotency keys (batch_id cache, 24-hour TTL)                  |     |
|  +--------------------------------------------------------------------+     |
|                                                                             |
+-----------------------------------------------------------------------------+
                                    |
                                    v
+-----------------------------------+----------------------------------------+
|                           WEB DASHBOARD                                    |
|  (Next.js + React Query)                                                   |
|  - Queries continuous aggregates (NOT raw data)                            |
|  - Pre-generated daily/weekly/monthly reports                              |
|  - Pagination for all list views (100 rows/page max)                       |
|  - GDPR export triggers async job (S3 presigned URL)                       |
+-----------------------------------------------------------------------------+
```

---

## 2. Database Selection: TimescaleDB

### Why TimescaleDB?

| Criterion | TimescaleDB | InfluxDB | QuestDB | ClickHouse |
|-----------|-------------|----------|---------|------------|
| **SQL Compatibility** | Native PostgreSQL SQL | Flux (custom language) | SQL-like with extensions | SQL dialect |
| **Write Performance** | 20-100K inserts/sec | 50-500K inserts/sec | 100K-1M inserts/sec | 100K-1M inserts/sec |
| **Query Performance** | Good (14,000x faster than PG) | Good | Excellent (25ms avg) | Excellent (fast complex queries) |
| **Compression** | 90-95% (native) | 80-90% | 85-90% | 95-98% |
| **Continuous Aggregates** | Yes (automatic refresh) | Yes (tasks) | Yes (recently added) | Yes (materialized views) |
| **Ecosystem** | PostgreSQL (Supabase!) | Limited | Growing | Large but complex |
| **Learning Curve** | Low (standard SQL) | Medium | Low | Medium-High |
| **Cost @ 1K users** | $25-50/month (Timescale Cloud) | $100+/month | Self-host or paid | Self-host or paid |
| **GDPR Compliance** | Easy (PostgreSQL features) | Manual | Manual | Manual |
| **Retention Policies** | Built-in (drop_chunks) | Built-in | Manual | Manual TTL |

**Winner: TimescaleDB**

**Reasons:**
1. **Zero migration cost** - Extends existing PostgreSQL/Supabase setup
2. **Team familiarity** - Standard SQL, no new query language
3. **Automatic compression** - 90-95% reduction with native columnar storage
4. **Continuous aggregates** - Automatic materialized views with refresh policies
5. **Proven at scale** - 100K+ sensors, 10M inserts/sec in production deployments
6. **Cost-effective** - Free tier for development, scales with startup growth

**Benchmarks:**
- TimescaleDB vs PostgreSQL: **20x faster inserts**, **14,000x faster time-range queries**
- TimescaleDB vs InfluxDB (IoT workload): **1.04-3.3x faster ingestion**
- Compression: 864,000 points/user/day = **100MB raw** -> **5-10MB compressed** (90-95% reduction)

Sources:
- [TimescaleDB IoT Industrial Case Studies](https://www.timescale.com/industrial-iot)
- [Time-Series Databases 2025 Comparison](https://markaicode.com/time-series-databases-2025-comparison/)
- [TSBS IoT Performance Report](https://tdengine.com/tsbs-iot-performance-report-tdengine-influxdb-and-timescaledb/)

---

## 3. Schema Design (Optimized for Time-Series)

### 3.1 Core Hypertables

```sql
-- ============================================================================
-- USERS (Regular PostgreSQL table, not a hypertable)
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    gdpr_consent BOOLEAN DEFAULT FALSE,
    consent_timestamp TIMESTAMPTZ,
    baseline_blink_rate FLOAT,  -- Personalized baseline (Challenge #5)
    baseline_calibrated_at TIMESTAMPTZ,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preferences JSONB: flow state hours, alert thresholds, quiet hours
-- {
--   "flow_state_schedule": [{"start": "09:00", "end": "12:00", "days": ["Mon", "Tue"]}],
--   "blink_alert_threshold_offset": -2.0,  -- Alert if 2 below personal baseline
--   "quiet_hours": {"start": "22:00", "end": "08:00"}
-- }

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);


-- ============================================================================
-- SESSIONS (Regular table with time index, low cardinality)
-- ============================================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    total_blinks INTEGER DEFAULT 0,
    avg_blink_rate FLOAT,
    wellness_score INTEGER,
    summary JSONB,  -- Posture alerts, fatigue events, breaks taken
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_time ON sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_ended_null ON sessions(user_id) WHERE ended_at IS NULL;


-- ============================================================================
-- BLINK_DATA (HYPERTABLE - 30 Hz time-series data)
-- ============================================================================
CREATE TABLE blink_data (
    time TIMESTAMPTZ NOT NULL,  -- Primary time column (NOT id!)
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    blink_count SMALLINT NOT NULL,  -- Blinks detected in this sample
    ear_value REAL,  -- Eye Aspect Ratio (0.0-1.0)
    confidence REAL DEFAULT 1.0,  -- Mediapipe confidence

    -- Indexing optimization: include frequently filtered columns
    PRIMARY KEY (user_id, time)  -- Composite key for partition pruning
);

-- Convert to hypertable with 1-hour chunks (optimal for 30Hz data)
SELECT create_hypertable(
    'blink_data',
    'time',
    chunk_time_interval => INTERVAL '1 hour',
    partitioning_column => 'user_id',
    number_partitions => 16,  -- Distribute across partitions for parallel writes
    if_not_exists => TRUE
);

-- Enable compression on chunks older than 7 days
ALTER TABLE blink_data SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'user_id, session_id',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('blink_data', INTERVAL '7 days');

-- Retention policy: Drop raw data older than 30 days
SELECT add_retention_policy('blink_data', INTERVAL '30 days');


-- ============================================================================
-- POSTURE_DATA (HYPERTABLE - 1 Hz time-series data)
-- ============================================================================
CREATE TABLE posture_data (
    time TIMESTAMPTZ NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    head_position JSONB,  -- {x, y, z, pitch, yaw, roll}
    posture_score SMALLINT CHECK (posture_score >= 0 AND posture_score <= 100),
    is_slouching BOOLEAN,
    is_leaning_forward BOOLEAN,

    PRIMARY KEY (user_id, time)
);

SELECT create_hypertable(
    'posture_data',
    'time',
    chunk_time_interval => INTERVAL '6 hours',  -- Lower frequency = larger chunks
    partitioning_column => 'user_id',
    number_partitions => 16
);

ALTER TABLE posture_data SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'user_id, session_id',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('posture_data', INTERVAL '7 days');
SELECT add_retention_policy('posture_data', INTERVAL '30 days');


-- ============================================================================
-- FATIGUE_EVENTS (Regular table, low frequency ~0.1 Hz)
-- ============================================================================
CREATE TABLE fatigue_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    event_type TEXT NOT NULL,  -- 'yawn', 'drowsy_eyes', 'slow_blink'
    confidence REAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fatigue_user_time ON fatigue_events(user_id, timestamp DESC);


-- ============================================================================
-- ALERTS (Regular table, low frequency)
-- ============================================================================
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,  -- 'blink', 'posture', 'fatigue', 'break'
    severity TEXT NOT NULL,  -- 'info', 'warning', 'critical'
    message TEXT NOT NULL,
    dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_created ON alerts(user_id, created_at DESC);
CREATE INDEX idx_alerts_dismissed ON alerts(dismissed) WHERE NOT dismissed;


-- ============================================================================
-- SYNC_CHECKPOINTS (Idempotency tracking for offline sync)
-- ============================================================================
CREATE TABLE sync_checkpoints (
    batch_id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    batch_start_time TIMESTAMPTZ NOT NULL,
    batch_end_time TIMESTAMPTZ NOT NULL,
    record_count INTEGER NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate syncs
    UNIQUE(user_id, batch_start_time, batch_end_time)
);

CREATE INDEX idx_sync_checkpoints_user ON sync_checkpoints(user_id, synced_at DESC);

-- Cleanup old checkpoints (keep 30 days for debugging)
SELECT add_retention_policy('sync_checkpoints', INTERVAL '30 days');
```

### 3.2 Continuous Aggregates (Pre-computed for Dashboard)

```sql
-- ============================================================================
-- 5-MINUTE BLINK RATE ROLLUP (for real-time charts)
-- ============================================================================
CREATE MATERIALIZED VIEW blink_rate_5min
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('5 minutes', time) AS bucket,
    user_id,
    session_id,
    COUNT(*) as sample_count,
    SUM(blink_count) as total_blinks,
    AVG(blink_count) as avg_blink_count,
    AVG(ear_value) as avg_ear,
    MIN(ear_value) as min_ear,
    MAX(ear_value) as max_ear,
    -- Calculate blink rate: (total_blinks / samples) * 60 samples/min
    (SUM(blink_count)::FLOAT / COUNT(*)::FLOAT) * 60.0 as blinks_per_minute
FROM blink_data
GROUP BY bucket, user_id, session_id;

-- Refresh policy: Update every 5 minutes, lag 1 minute for late data
SELECT add_continuous_aggregate_policy('blink_rate_5min',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '5 minutes'
);

-- Compression on the materialized view
ALTER MATERIALIZED VIEW blink_rate_5min SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'user_id, session_id',
    timescaledb.compress_orderby = 'bucket DESC'
);

SELECT add_compression_policy('blink_rate_5min', INTERVAL '7 days');
SELECT add_retention_policy('blink_rate_5min', INTERVAL '1 year');


-- ============================================================================
-- HOURLY WELLNESS METRICS (for daily/weekly charts)
-- ============================================================================
CREATE MATERIALIZED VIEW wellness_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', b.time) AS bucket,
    b.user_id,
    b.session_id,

    -- Blink metrics
    (SUM(b.blink_count)::FLOAT / COUNT(b.*)::FLOAT) * 60.0 as avg_blink_rate,
    AVG(b.ear_value) as avg_ear,

    -- Posture metrics (join with posture_data)
    AVG(p.posture_score) as avg_posture_score,
    SUM(CASE WHEN p.is_slouching THEN 1 ELSE 0 END)::FLOAT / COUNT(p.*)::FLOAT * 100 as slouch_percentage,

    -- Sample counts
    COUNT(b.*) as blink_samples,
    COUNT(p.*) as posture_samples
FROM blink_data b
LEFT JOIN posture_data p
    ON b.user_id = p.user_id
    AND b.session_id = p.session_id
    AND time_bucket('1 minute', b.time) = time_bucket('1 minute', p.time)
GROUP BY bucket, b.user_id, b.session_id;

SELECT add_continuous_aggregate_policy('wellness_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '1 hour'
);

ALTER MATERIALIZED VIEW wellness_hourly SET (timescaledb.compress);
SELECT add_compression_policy('wellness_hourly', INTERVAL '30 days');
SELECT add_retention_policy('wellness_hourly', INTERVAL '1 year');


-- ============================================================================
-- DAILY SUMMARY (for weekly/monthly reports)
-- ============================================================================
CREATE MATERIALIZED VIEW wellness_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', bucket) AS day,
    user_id,
    AVG(avg_blink_rate) as daily_avg_blink_rate,
    MIN(avg_blink_rate) as daily_min_blink_rate,
    MAX(avg_blink_rate) as daily_max_blink_rate,
    AVG(avg_posture_score) as daily_avg_posture_score,
    AVG(slouch_percentage) as daily_slouch_percentage,
    SUM(blink_samples + posture_samples) as total_samples
FROM wellness_hourly
GROUP BY day, user_id;

SELECT add_continuous_aggregate_policy('wellness_daily',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 day'
);
```

---

## 4. Retention and Downsampling Strategy

### 4.1 Data Lifecycle

```
+----------------+-------------------+-----------------+------------------+
| Data Type      | Raw Retention     | Aggregated      | Storage/User/Day |
+----------------+-------------------+-----------------+------------------+
| Blink (30Hz)   | 30 days           | 5-min: 1 year   | 100MB -> 5MB     |
|                | (compressed)      | Hourly: 1 year  | (95% reduction)  |
|                |                   | Daily: Forever  |                  |
+----------------+-------------------+-----------------+------------------+
| Posture (1Hz)  | 30 days           | Hourly: 1 year  | 3.3MB -> 0.3MB   |
|                | (compressed)      | Daily: Forever  | (90% reduction)  |
+----------------+-------------------+-----------------+------------------+
| Fatigue Events | 90 days           | N/A             | <1KB             |
+----------------+-------------------+-----------------+------------------+
| Alerts         | 1 year            | N/A             | <10KB            |
+----------------+-------------------+-----------------+------------------+
| Sessions       | Forever           | N/A             | <1KB             |
+----------------+-------------------+-----------------+------------------+
```

### 4.2 Compression Policies

TimescaleDB's native compression uses columnar storage with specialized codecs:

- **Delta encoding** for timestamps (timestamp differences, not absolute)
- **Gorilla compression** for floating-point values (ear_value, confidence)
- **Run-length encoding** for repeated values (user_id, session_id)
- **Dictionary encoding** for low-cardinality columns

**Expected compression ratios:**
- Blink data: **90-95%** (864,000 rows/day -> 43,200-86,400 stored rows compressed)
- Posture data: **85-90%** (86,400 rows/day -> 8,640-12,960 stored rows)

**Storage calculation (1,000 users, 30 days raw + 1 year aggregated):**

```
Raw Data (30 days):
- Blink: 1000 users * 30 days * 5MB/day = 150GB compressed
- Posture: 1000 users * 30 days * 0.3MB/day = 9GB compressed
Total raw: ~160GB

Aggregated Data (1 year):
- 5-min rollups: 1000 users * 365 days * 288 buckets/day * 100 bytes = 10.5GB
- Hourly rollups: 1000 users * 365 days * 24 buckets/day * 200 bytes = 1.75GB
- Daily rollups: 1000 users * 365 days * 500 bytes = 180MB
Total aggregated: ~12.5GB

TOTAL STORAGE @ 1K USERS: ~175GB
```

At $0.10/GB/month (Timescale Cloud pricing), this is **$17.50/month** for storage alone.

Sources:
- [Data Compression Techniques for Time-Series](https://questdb.com/glossary/data-compression-techniques-for-time-series/)
- [TimescaleDB Downsampling Best Practices](https://www.tigerdata.com/blog/how-to-proactively-manage-long-term-data-storage-with-downsampling)

---

## 5. Solving the Critical Six Challenges

### Challenge #1: Glasses Detection Failure
**Architecture Solution:**
- **Edge processing** - Detection runs on client, server only stores results
- **Confidence scoring** - Store `confidence` field with each blink sample
- **Adaptive thresholding** - If median confidence <0.7 for 5 minutes, trigger calibration prompt
- **No server dependency** - Server architecture doesn't need to solve this; focus on reliable data ingestion

**SQL for monitoring detection quality:**
```sql
SELECT
    user_id,
    time_bucket('5 minutes', time) as bucket,
    AVG(confidence) as avg_confidence,
    COUNT(CASE WHEN confidence < 0.5 THEN 1 END) as low_confidence_samples
FROM blink_data
WHERE time > NOW() - INTERVAL '1 hour'
GROUP BY user_id, bucket
HAVING AVG(confidence) < 0.7;
```

---

### Challenge #2: Lighting Robustness
**Architecture Solution:**
- **Same as #1** - Edge detection problem, not server architecture problem
- **Metadata tracking** - Store ambient light level in `device_info` JSONB if available
- **Quality metrics dashboard** - Show detection quality trends to users

---

### Challenge #3: Alert Fatigue & Timing
**Architecture Solution:**

**Redis-based alert cooldown system:**
```python
# Alert engine (runs server-side or client-side)
def should_fire_alert(user_id, alert_type, severity):
    cooldown_key = f"alert_cooldown:{user_id}:{alert_type}"

    # Check cooldown in Redis
    if redis.exists(cooldown_key):
        return False  # Still in cooldown

    # Check flow state schedule (from user preferences)
    user = db.query(User).get(user_id)
    if is_in_flow_state(user.preferences):
        # Batch alerts for later (store in Redis queue)
        redis.lpush(f"deferred_alerts:{user_id}", json.dumps({
            'type': alert_type,
            'severity': severity,
            'timestamp': datetime.now().isoformat()
        }))
        return False

    # Fire alert and set cooldown
    cooldown_seconds = get_cooldown_for_alert(alert_type, severity)
    redis.setex(cooldown_key, cooldown_seconds, "1")
    return True

def is_in_flow_state(preferences):
    # Check if current time matches user's flow state schedule
    flow_schedule = preferences.get('flow_state_schedule', [])
    now = datetime.now()

    for period in flow_schedule:
        if (now.strftime('%a') in period['days'] and
            period['start'] <= now.time() <= period['end']):
            return True
    return False
```

**Alert acknowledgment tracking:**
```sql
-- Track alert engagement to detect fatigue
CREATE MATERIALIZED VIEW alert_engagement_weekly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 week', created_at) as week,
    user_id,
    alert_type,
    COUNT(*) as total_alerts,
    SUM(CASE WHEN dismissed THEN 1 ELSE 0 END) as dismissed_count,
    SUM(CASE WHEN dismissed THEN 1 ELSE 0 END)::FLOAT / COUNT(*)::FLOAT * 100 as dismissal_rate,
    AVG(EXTRACT(EPOCH FROM (dismissed_at - created_at))) as avg_response_time_seconds
FROM alerts
GROUP BY week, user_id, alert_type;

-- Auto-adjust alert sensitivity if dismissal rate >80% (fatigue detected)
```

**Success metric:** >50% of alerts acknowledged after 30 days (per spec).

---

### Challenge #4: Privacy/Surveillance Perception
**Architecture Solution:**

**Zero image storage proof:**
- No camera frames ever leave device
- No image blobs in database schema (impossible to store)
- Only numeric metrics stored (blink_count, ear_value, posture_score)

**GDPR transparency table:**
```sql
CREATE TABLE data_processing_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,  -- 'data_collected', 'data_exported', 'data_deleted'
    data_types TEXT[],  -- ['blink_data', 'posture_data']
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- User can query: "What data do you have about me?"
SELECT
    'blink_data' as table_name,
    COUNT(*) as record_count,
    MIN(time) as oldest_record,
    MAX(time) as newest_record,
    pg_size_pretty(pg_total_relation_size('blink_data')) as storage_size
FROM blink_data
WHERE user_id = :user_id

UNION ALL

SELECT
    'posture_data', COUNT(*), MIN(time), MAX(time),
    pg_size_pretty(pg_total_relation_size('posture_data'))
FROM posture_data
WHERE user_id = :user_id;
```

**Privacy dashboard query (sub-100ms):**
```sql
-- Materialized view for instant privacy dashboard
CREATE MATERIALIZED VIEW user_data_summary AS
SELECT
    user_id,
    SUM(CASE WHEN table_name = 'blink_data' THEN record_count ELSE 0 END) as blink_records,
    SUM(CASE WHEN table_name = 'posture_data' THEN record_count ELSE 0 END) as posture_records,
    MAX(last_updated) as last_data_timestamp
FROM (
    SELECT user_id, 'blink_data' as table_name, COUNT(*) as record_count, MAX(time) as last_updated
    FROM blink_data GROUP BY user_id
    UNION ALL
    SELECT user_id, 'posture_data', COUNT(*), MAX(time)
    FROM posture_data GROUP BY user_id
) t
GROUP BY user_id;

REFRESH MATERIALIZED VIEW user_data_summary;  -- Run hourly via cron
```

---

### Challenge #5: Individual Baseline Calibration
**Architecture Solution:**

**Two-hour calibration period:**
```sql
-- After user's first 2 hours (7200 seconds) of data
UPDATE users
SET
    baseline_blink_rate = (
        SELECT AVG(blinks_per_minute)
        FROM blink_rate_5min
        WHERE user_id = :user_id
        AND bucket >= (SELECT MIN(started_at) FROM sessions WHERE user_id = :user_id)
        AND bucket <= (SELECT MIN(started_at) + INTERVAL '2 hours' FROM sessions WHERE user_id = :user_id)
    ),
    baseline_calibrated_at = NOW()
WHERE id = :user_id;
```

**Seasonal recalibration (dry winter air, medication changes):**
```sql
-- Recalibrate baseline every 30 days using rolling average
CREATE OR REPLACE FUNCTION recalibrate_baseline() RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN
        SELECT id FROM users
        WHERE baseline_calibrated_at < NOW() - INTERVAL '30 days'
    LOOP
        UPDATE users
        SET baseline_blink_rate = (
            SELECT AVG(blinks_per_minute)
            FROM blink_rate_5min
            WHERE user_id = user_record.id
            AND bucket > NOW() - INTERVAL '14 days'  -- Last 2 weeks
        ),
        baseline_calibrated_at = NOW()
        WHERE id = user_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron (daily at 3am)
SELECT cron.schedule('recalibrate-baselines', '0 3 * * *', 'SELECT recalibrate_baseline()');
```

**Alert threshold based on personal baseline:**
```python
# In alert engine
def check_low_blink_alert(user_id, current_blink_rate):
    user = db.query(User).get(user_id)
    baseline = user.baseline_blink_rate or 15.0  # Default if not calibrated

    # Alert if 2 blinks/min below personal baseline (per preferences)
    threshold_offset = user.preferences.get('blink_alert_threshold_offset', -2.0)
    threshold = baseline + threshold_offset

    if current_blink_rate < threshold:
        return True  # Fire alert
    return False
```

**Success metric:** Alert accuracy >85% for individual (per spec).

---

### Challenge #6: Flow State Interruption
**Architecture Solution:**

**Flow state detection (heuristic):**
```python
def detect_flow_state(user_id, session_id):
    """
    Heuristic flow state detection:
    - No mouse/keyboard idle >30 seconds in last 10 minutes
    - Blink rate stable (low variance) indicating focus
    - Duration >20 minutes (flow takes time to enter)
    """

    # Query last 10 minutes of activity
    metrics = db.execute("""
        SELECT
            AVG(blinks_per_minute) as avg_blink_rate,
            STDDEV(blinks_per_minute) as blink_rate_variance,
            EXTRACT(EPOCH FROM (NOW() - MIN(bucket))) as session_duration_sec
        FROM blink_rate_5min
        WHERE user_id = :user_id AND session_id = :session_id
        AND bucket > NOW() - INTERVAL '10 minutes'
    """, {'user_id': user_id, 'session_id': session_id}).fetchone()

    if metrics.session_duration_sec > 1200:  # 20+ minutes
        if metrics.blink_rate_variance < 2.0:  # Stable blink rate
            return True  # Likely in flow state

    return False
```

**User-defined flow periods (stored in `preferences` JSONB):**
```json
{
    "flow_state_schedule": [
        {"days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "start": "09:00", "end": "12:00"},
        {"days": ["Mon", "Wed"], "start": "14:00", "end": "16:00"}
    ]
}
```

**Deferred alert queue (Redis):**
- When alert would fire during flow state, push to Redis list
- When flow state ends (session ends or user takes break), flush deferred alerts as summary notification
- Example: "While you were focused: 2 posture alerts, 1 low blink alert. Review now?"

**Success metric:** Zero interruptions during user-defined focus periods (per spec).

---

## 6. Solving the 10 Scaling Challenges

### Challenge #1: Offline Queue & Sync Storm
**Architecture Solution:**

**Client-side batching:**
```python
# SQLite local queue on desktop app
class OfflineQueue:
    def __init__(self):
        self.db = sqlite3.connect('local_queue.db')
        self.current_batch = []
        self.batch_size = 1000  # Max records per batch
        self.batch_timeout = 10  # Max seconds before forced flush

    def enqueue_blink(self, timestamp, blink_count, ear_value, confidence):
        self.current_batch.append({
            'time': timestamp,
            'blink_count': blink_count,
            'ear_value': ear_value,
            'confidence': confidence
        })

        if len(self.current_batch) >= self.batch_size:
            self.flush_batch()

    def flush_batch(self):
        if not self.current_batch:
            return

        # Generate unique batch ID
        batch_id = str(uuid.uuid4())
        batch_start = self.current_batch[0]['time']
        batch_end = self.current_batch[-1]['time']

        # Store batch in SQLite with metadata
        self.db.execute("""
            INSERT INTO pending_batches (batch_id, batch_start, batch_end, data, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (batch_id, batch_start, batch_end, json.dumps(self.current_batch), datetime.now()))

        self.current_batch = []

        # Attempt sync if online
        if is_online():
            self.sync_batches()

    def sync_batches(self):
        """Sync pending batches with exponential backoff on 429 errors"""
        batches = self.db.execute(
            "SELECT batch_id, data FROM pending_batches ORDER BY created_at LIMIT 10"
        ).fetchall()

        for batch_id, data_json in batches:
            try:
                response = requests.post(
                    'https://api.wellnessguard.com/v1/sync',
                    headers={'Authorization': f'Bearer {get_token()}'},
                    json={
                        'batch_id': batch_id,
                        'data': json.loads(data_json)
                    },
                    timeout=30
                )

                if response.status_code == 200:
                    # Success, delete batch
                    self.db.execute("DELETE FROM pending_batches WHERE batch_id = ?", (batch_id,))
                    self.db.commit()
                    time.sleep(random.uniform(1, 3))  # Rate limit ourselves

                elif response.status_code == 429:
                    # Rate limited, exponential backoff
                    retry_after = int(response.headers.get('Retry-After', 60))
                    print(f"Rate limited, waiting {retry_after}s")
                    time.sleep(retry_after)
                    break  # Stop syncing, try again later

                else:
                    # Other error, log and continue
                    print(f"Sync error: {response.status_code}")
                    break

            except Exception as e:
                print(f"Sync exception: {e}")
                break
```

**Server-side rate limiting & backpressure:**
```python
# FastAPI endpoint with rate limiting
from fastapi import FastAPI, HTTPException, Header, Depends
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

app = FastAPI()
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Per-user rate limit: 100 requests/minute, burst 200
@app.post("/v1/sync")
@limiter.limit("100/minute")
async def sync_batch(
    batch: BatchData,
    user_id: str = Depends(get_current_user),
    batch_id: str = Header(...)
):
    # Check idempotency (Redis cache, 24-hour TTL)
    if redis.exists(f"batch:{batch_id}"):
        return {"status": "already_processed"}

    # Check queue depth (backpressure)
    queue_depth = redis.llen(f"write_queue:{user_id}")
    if queue_depth > 10000:
        raise HTTPException(
            status_code=429,
            detail="Write queue full, retry later",
            headers={"Retry-After": "60"}
        )

    # Enqueue for batched write
    redis.lpush(f"write_queue:{user_id}", json.dumps({
        'batch_id': batch_id,
        'user_id': user_id,
        'data': batch.data
    }))

    # Mark as processing
    redis.setex(f"batch:{batch_id}", 86400, "processing")  # 24-hour TTL

    return {"status": "queued"}
```

**Background batch writer (500ms or 1000 rows, whichever first):**
```python
import asyncio
from collections import defaultdict

class BatchWriter:
    def __init__(self):
        self.buffers = defaultdict(list)  # user_id -> [records]
        self.buffer_max_size = 1000
        self.buffer_max_age = 0.5  # 500ms

    async def run(self):
        while True:
            await asyncio.sleep(self.buffer_max_age)
            await self.flush_all_buffers()

    async def flush_all_buffers(self):
        for user_id, records in self.buffers.items():
            if records:
                await self.write_batch(user_id, records)
                self.buffers[user_id] = []

    async def write_batch(self, user_id, records):
        """Bulk insert using COPY (fastest method in PostgreSQL)"""
        try:
            # Build COPY statement
            copy_sql = """
                COPY blink_data (time, user_id, session_id, blink_count, ear_value, confidence)
                FROM STDIN WITH (FORMAT CSV)
            """

            # Generate CSV data
            csv_data = io.StringIO()
            for record in records:
                csv_data.write(f"{record['time']},{user_id},{record['session_id']},"
                              f"{record['blink_count']},{record['ear_value']},{record['confidence']}\n")
            csv_data.seek(0)

            # Execute COPY (10-100x faster than individual INSERTs)
            async with db_pool.acquire() as conn:
                await conn.copy_from_table('blink_data', source=csv_data, columns=[...], format='csv')

            # Mark batches as complete
            for record in records:
                redis.setex(f"batch:{record['batch_id']}", 86400, "completed")

            print(f"Wrote {len(records)} records for user {user_id}")

        except Exception as e:
            print(f"Write error: {e}")
            # Re-queue for retry
            for record in records:
                redis.lpush(f"write_queue:{user_id}", json.dumps(record))
```

**Expected performance:**
- 500 users offline for 2 hours = 500 * 216,000 = 108M data points
- Batches of 1000 records = 108,000 API requests
- Rate limit: 100 req/min/user = ~18 hours to sync all users (staggered)
- With 500ms batching + COPY: **50,000-100,000 inserts/sec** sustained

Sources:
- [Backpressure Handling in Time-Series Systems](https://questdb.com/glossary/backpressure-handling/)
- [AWS Queue Backlog Avoidance](https://aws.amazon.com/builders-library/avoiding-insurmountable-queue-backlogs/)

---

### Challenge #2: Write Path & Connection Limits
**Architecture Solution:**

**PgBouncer connection pooler:**
```ini
# pgbouncer.ini
[databases]
wellnessguard = host=timescaledb port=5432 dbname=wellnessguard

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Connection pooling mode
pool_mode = transaction  # Return connection after each transaction

# Connection limits
max_client_conn = 10000  # Accept 10K client connections
default_pool_size = 50   # But only use 50 actual DB connections
reserve_pool_size = 10   # Extra 10 for overflow

# Timeouts
server_idle_timeout = 60
```

**Result:**
- 1,000 concurrent clients -> 50 DB connections
- Each connection handles ~20 clients (10,000 / 50 = 200 theoretical, 20 practical)
- TimescaleDB connection limit: 100 (default) -> Increase to 150 for safety

**Batched writes (covered in Challenge #1):**
- 30,000 individual inserts/sec -> 30-60 batch writes/sec
- Each batch: 500-1000 rows via COPY
- Connection time per batch: <10ms (vs 1ms * 1000 = 1000ms for individual inserts)

---

### Challenge #3: Data Volume & Retention Policy
**Architecture Solution:**

**Already covered in Section 4:**
- 30-day raw data retention
- Compression after 7 days (90-95% reduction)
- Continuous aggregates kept for 1 year
- Daily summaries kept forever

**Storage costs at scale:**

| Users | Raw (30d) | Aggregated (1yr) | Total | Cost/month |
|-------|-----------|------------------|-------|------------|
| 1K | 160GB | 12.5GB | 173GB | $17 |
| 10K | 1.6TB | 125GB | 1.725TB | $173 |
| 100K | 16TB | 1.25TB | 17.25TB | $1,725 |

**At 100K users:** $1,725/month storage + $500/month compute = **$2,225/month** ($0.02/user/month)

---

### Challenge #4: Dashboard Query Performance
**Architecture Solution:**

**Query continuous aggregates, NOT raw data:**
```sql
-- BAD: Queries 25.9 million rows (30 days * 864K/day)
SELECT
    time_bucket('1 hour', time) as hour,
    AVG(blink_count) as avg_blinks
FROM blink_data
WHERE user_id = :user_id
AND time > NOW() - INTERVAL '30 days'
GROUP BY hour
ORDER BY hour;

-- GOOD: Queries 720 pre-aggregated rows (30 days * 24 hours)
SELECT
    bucket as hour,
    avg_blink_rate
FROM wellness_hourly
WHERE user_id = :user_id
AND bucket > NOW() - INTERVAL '30 days'
ORDER BY bucket;
```

**Performance comparison:**
- Raw data query: **5-10 seconds** (full table scan, millions of rows)
- Continuous aggregate query: **10-50ms** (index scan, hundreds of rows)

**Chart rendering optimization:**
```javascript
// Frontend: Limit chart data points
const MAX_CHART_POINTS = 1000;

async function fetchChartData(userId, timeRange) {
    // Automatically select appropriate bucket size
    const bucketSize = calculateBucketSize(timeRange, MAX_CHART_POINTS);

    // Query appropriate continuous aggregate
    const endpoint = bucketSize === '5min' ? '/api/wellness/5min' :
                     bucketSize === '1hour' ? '/api/wellness/hourly' :
                     '/api/wellness/daily';

    const response = await fetch(`${endpoint}?user_id=${userId}&range=${timeRange}`);
    return response.json();
}

function calculateBucketSize(timeRange, maxPoints) {
    const rangeDays = parseRange(timeRange);  // '30d' -> 30

    if (rangeDays <= 1) return '5min';   // 288 points
    if (rangeDays <= 7) return '1hour';  // 168 points
    return 'daily';                       // 30-365 points
}
```

**Success metric:** Dashboard queries <100ms for 30-day aggregations.

---

### Challenge #5: Real-Time Alert Latency
**Architecture Solution:**

**Client-side real-time alerts (preferred):**
```python
# Desktop app: Evaluate alerts locally using rolling window
class RealTimeAlertEngine:
    def __init__(self):
        self.rolling_window = deque(maxlen=3600)  # Last 60 minutes @ 1 sample/sec

    def process_blink_sample(self, blink_count, ear_value, confidence):
        now = time.time()
        self.rolling_window.append({
            'timestamp': now,
            'blink_count': blink_count,
            'ear_value': ear_value
        })

        # Check 2-minute window (120 samples)
        recent_2min = [s for s in self.rolling_window if s['timestamp'] > now - 120]

        if len(recent_2min) >= 60:  # At least 1 minute of data
            avg_blink_rate = sum(s['blink_count'] for s in recent_2min) / len(recent_2min) * 60

            # Check against personal baseline (from server, cached locally)
            if avg_blink_rate < self.user_baseline - 2.0:
                self.fire_alert('low_blink_rate', {
                    'current_rate': avg_blink_rate,
                    'baseline': self.user_baseline
                })
```

**Server-side real-time alerts (for web dashboard):**
```python
# Redis-based streaming aggregation
class ServerSideAlertEngine:
    def on_blink_data_received(self, user_id, session_id, timestamp, blink_count):
        # Push to Redis sorted set (score = timestamp)
        redis.zadd(f"blink_stream:{user_id}", {
            json.dumps({'blink_count': blink_count}): timestamp.timestamp()
        })

        # Trim to last 2 minutes
        two_minutes_ago = (timestamp - timedelta(minutes=2)).timestamp()
        redis.zremrangebyscore(f"blink_stream:{user_id}", '-inf', two_minutes_ago)

        # Calculate rolling average
        recent_samples = redis.zrange(f"blink_stream:{user_id}", 0, -1)
        if len(recent_samples) >= 60:
            avg_blink_rate = sum(json.loads(s)['blink_count'] for s in recent_samples) / len(recent_samples) * 60

            # Check threshold
            if avg_blink_rate < get_user_baseline(user_id) - 2.0:
                # Fire alert via WebSocket
                websocket_manager.send_alert(user_id, {
                    'type': 'low_blink_rate',
                    'severity': 'warning',
                    'current_rate': avg_blink_rate
                })
```

**Alert latency:**
- Client-side: **<100ms** (local computation)
- Server-side: **1-3 seconds** (network + Redis + WebSocket)

**Success metric:** Alert fires within seconds, not minutes.

---

### Challenge #6: GDPR Deletion at Scale
**Architecture Solution:**

**Fast deletion via partitioning:**
```sql
-- SLOW: Delete with foreign key cascade (scans entire table)
-- For user with 25M rows, this takes 30-60 seconds
DELETE FROM users WHERE id = :user_id;  -- Cascades to all related tables

-- FAST: Drop chunks directly (TimescaleDB feature)
-- For user with 25M rows across 720 chunks (30 days), this takes 1-2 seconds
DO $$
DECLARE
    chunk_name TEXT;
BEGIN
    -- Find all chunks containing data for this user
    FOR chunk_name IN
        SELECT chunk_schema || '.' || chunk_name
        FROM timescaledb_information.chunks
        WHERE hypertable_name IN ('blink_data', 'posture_data')
        AND range_start <= NOW()
        AND range_end >= (SELECT MIN(created_at) FROM sessions WHERE user_id = :user_id)
    LOOP
        -- Delete user's data from this chunk
        EXECUTE format('DELETE FROM %s WHERE user_id = $1', chunk_name)
        USING :user_id;
    END LOOP;

    -- Delete from non-hypertables
    DELETE FROM sessions WHERE user_id = :user_id;
    DELETE FROM alerts WHERE user_id = :user_id;
    DELETE FROM fatigue_events WHERE user_id = :user_id;
    DELETE FROM sync_checkpoints WHERE user_id = :user_id;
    DELETE FROM users WHERE id = :user_id;
END $$;
```

**Async deletion for better UX:**
```python
# API endpoint
@app.delete("/api/user/delete")
async def request_deletion(user_id: str = Depends(get_current_user)):
    # Mark user for deletion
    db.execute(
        "UPDATE users SET deletion_requested_at = NOW() WHERE id = :user_id",
        {'user_id': user_id}
    )

    # Queue async deletion job
    celery_app.send_task('delete_user_data', args=[user_id])

    return {
        "status": "deletion_queued",
        "message": "Your data will be deleted within 24 hours. You will receive confirmation email."
    }

# Celery task
@celery_app.task
def delete_user_data(user_id):
    try:
        # Execute deletion (1-5 seconds)
        db.execute(deletion_sql, {'user_id': user_id})

        # Send confirmation email
        send_email(user_id, "Your data has been deleted")

        # Log for audit
        audit_log.info(f"Deleted user {user_id} at {datetime.now()}")

    except Exception as e:
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60)
```

**Success metric:** Deletion completes <5 seconds, user receives confirmation within 24 hours.

---

### Challenge #7: Session Management
**Architecture Solution:**

**Heartbeat mechanism:**
```python
# Client sends heartbeat every 30 seconds
class SessionManager:
    def __init__(self):
        self.session_id = None
        self.heartbeat_thread = None

    def start_session(self):
        # Create session
        response = requests.post('/api/sessions/start', json={
            'device_info': get_device_info()
        })
        self.session_id = response.json()['session_id']

        # Start heartbeat thread
        self.heartbeat_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self.heartbeat_thread.start()

    def _heartbeat_loop(self):
        while True:
            time.sleep(30)
            try:
                requests.post(f'/api/sessions/{self.session_id}/heartbeat', timeout=5)
            except:
                pass  # Network error, will retry

    def end_session(self):
        requests.post(f'/api/sessions/{self.session_id}/end')
        self.session_id = None

# Server-side heartbeat tracking (Redis)
@app.post("/api/sessions/{session_id}/heartbeat")
async def heartbeat(session_id: str):
    redis.setex(f"session_heartbeat:{session_id}", 90, "alive")  # 90-sec TTL
    return {"status": "ok"}

# Background job: Close zombie sessions (run every 5 minutes)
@celery_app.task
def close_zombie_sessions():
    # Find sessions with no heartbeat in last 90 seconds
    zombie_sessions = db.execute("""
        SELECT id FROM sessions
        WHERE ended_at IS NULL
        AND started_at < NOW() - INTERVAL '90 seconds'
        AND NOT EXISTS (
            SELECT 1 FROM redis_keys WHERE key = 'session_heartbeat:' || sessions.id
        )
    """).fetchall()

    for session_id in zombie_sessions:
        # Close session, set ended_at to last known activity
        last_activity = db.execute("""
            SELECT MAX(time) FROM blink_data WHERE session_id = :session_id
        """, {'session_id': session_id}).scalar()

        db.execute("""
            UPDATE sessions
            SET ended_at = :ended_at,
                duration_seconds = EXTRACT(EPOCH FROM (:ended_at - started_at))
            WHERE id = :session_id
        """, {'session_id': session_id, 'ended_at': last_activity})
```

**Success metric:** <1% zombie sessions (sessions with ended_at = NULL after 24 hours).

---

### Challenge #8: Partial Sync Failure & Idempotency
**Architecture Solution:**

**Already covered in Challenge #1:**
- Batch ID per sync request (UUID)
- Redis idempotency cache (batch_id -> status, 24-hour TTL)
- Client tracks last successful batch timestamp
- On reconnect, client resumes from last successful batch

**Upsert logic (for handling duplicates):**
```sql
-- Use ON CONFLICT to handle duplicate batches
INSERT INTO blink_data (time, user_id, session_id, blink_count, ear_value, confidence)
VALUES (:time, :user_id, :session_id, :blink_count, :ear_value, :confidence)
ON CONFLICT (user_id, time) DO UPDATE SET
    blink_count = EXCLUDED.blink_count,
    ear_value = EXCLUDED.ear_value,
    confidence = EXCLUDED.confidence;
```

**Success metric:** Zero duplicate data points, zero data loss on network failures.

---

### Challenge #9: Supabase Tier Limits
**Architecture Solution:**

**Supabase is NOT used for time-series data:**
- Supabase: Auth only (users table, session tokens)
- TimescaleDB (self-hosted or Timescale Cloud): All time-series data

**Supabase usage:**
```
Auth requests: ~1000/day (user logins)
Database queries: 0 (no time-series in Supabase)
Storage: <1GB (avatars only)
Egress: <10GB/month
```

Supabase free tier limits:
- 500MB database -> Not used
- Unlimited auth -> Perfect
- 1GB file storage -> Plenty for avatars

**When to self-host TimescaleDB vs Timescale Cloud:**

| Metric | Timescale Cloud Free | Timescale Cloud Paid | Self-Hosted (AWS/GCP) |
|--------|----------------------|----------------------|-----------------------|
| Cost @ 1K users | $0 | $50/month | $100/month (t3.medium + 200GB) |
| Cost @ 10K users | N/A (exceeds limits) | $200/month | $300/month (t3.large + 2TB) |
| Cost @ 100K users | N/A | $1,500/month | $2,000/month (r5.2xlarge + 20TB) |
| Ops overhead | Zero | Zero | High (backups, monitoring, updates) |

**Decision matrix:**
- <1K users: Timescale Cloud Free Tier
- 1K-10K users: Timescale Cloud Paid ($50-200/month)
- 10K-50K users: Evaluate costs, likely Timescale Cloud
- >50K users: Self-host for cost optimization

---

### Challenge #10: Burst Traffic Handling
**Architecture Solution:**

**Auto-scaling compute (Kubernetes HPA):**
```yaml
# Horizontal Pod Autoscaler for API pods
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: wellnessguard-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: wellnessguard-api
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100  # Double pods every minute during spike
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50  # Halve pods every 5 minutes after spike
        periodSeconds: 300
```

**Graceful degradation:**
```python
# API endpoint with circuit breaker
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=60)
def write_to_timescaledb(data):
    # Attempt write
    return db.execute(insert_sql, data)

@app.post("/v1/sync")
async def sync_batch(batch: BatchData):
    try:
        # Try normal path
        result = write_to_timescaledb(batch.data)
        return {"status": "written"}

    except CircuitBreakerError:
        # Database overloaded, queue to Redis (degraded mode)
        redis.lpush("degraded_queue", json.dumps(batch.data))
        return {
            "status": "queued_degraded",
            "message": "High load, data queued for later processing"
        }

# Background worker: Drain degraded queue when DB recovers
@celery_app.task
def drain_degraded_queue():
    while redis.llen("degraded_queue") > 0:
        batch_json = redis.rpop("degraded_queue")
        try:
            write_to_timescaledb(json.loads(batch_json))
        except:
            redis.lpush("degraded_queue", batch_json)  # Re-queue
            time.sleep(5)
            break
```

**Peak traffic handling:**
- Normal: 1,000 users * 30 samples/sec = 30,000 writes/sec
- 9am Monday spike: 10x = 300,000 writes/sec
- Batch writer: 300,000 / 1000 (batch size) = 300 batch writes/sec
- TimescaleDB capacity: 50,000-100,000 inserts/sec = Can handle 50-100 batch writes/sec per node
- Need: 300 / 50 = **6 write replicas** OR queue buffering

**With Redis buffering:**
- API accepts 300,000/sec -> Redis queue
- Background workers drain at 50,000/sec
- Peak clears in 6 seconds (300K backlog / 50K per sec)

**Success metric:** System handles 10x traffic spikes without data loss or user-facing errors.

---

## 7. Query Performance Estimates

### 7.1 Common Query Patterns

```sql
-- Query 1: User's last 24 hours blink rate (dashboard chart)
-- Data: 288 pre-aggregated 5-minute buckets
-- Expected: 10-20ms
SELECT bucket, blinks_per_minute
FROM blink_rate_5min
WHERE user_id = :user_id
AND bucket > NOW() - INTERVAL '24 hours'
ORDER BY bucket;

-- Query 2: User's last 30 days wellness trend
-- Data: 720 hourly buckets
-- Expected: 20-50ms
SELECT bucket, avg_blink_rate, avg_posture_score
FROM wellness_hourly
WHERE user_id = :user_id
AND bucket > NOW() - INTERVAL '30 days'
ORDER BY bucket;

-- Query 3: User's wellness score for today
-- Data: Aggregate of today's hourly buckets
-- Expected: 5-10ms
SELECT
    AVG(avg_blink_rate) as today_avg_blink_rate,
    AVG(avg_posture_score) as today_avg_posture_score
FROM wellness_hourly
WHERE user_id = :user_id
AND bucket >= DATE_TRUNC('day', NOW())
AND bucket < DATE_TRUNC('day', NOW()) + INTERVAL '1 day';

-- Query 4: Admin dashboard - Active users in last hour
-- Data: Scan recent sessions table
-- Expected: 50-100ms
SELECT COUNT(DISTINCT user_id)
FROM sessions
WHERE started_at > NOW() - INTERVAL '1 hour'
AND (ended_at IS NULL OR ended_at > NOW() - INTERVAL '1 hour');

-- Query 5: User's GDPR export (async job)
-- Data: 30 days raw data = 25.9M rows
-- Expected: 5-10 seconds (one-time export, acceptable)
COPY (
    SELECT * FROM blink_data WHERE user_id = :user_id
    UNION ALL
    SELECT * FROM posture_data WHERE user_id = :user_id
) TO '/tmp/user_data.csv' WITH CSV HEADER;
```

### 7.2 Performance Benchmarks Summary

| Query Type | Data Size | Expected Time | Optimization |
|------------|-----------|---------------|--------------|
| Real-time alert (client) | Rolling 2-min window | <100ms | Client-side computation |
| Dashboard 24-hour chart | 288 rows (5-min buckets) | 10-20ms | Continuous aggregate |
| Dashboard 30-day trend | 720 rows (hourly buckets) | 20-50ms | Continuous aggregate |
| Wellness score today | 24 rows (hourly buckets) | 5-10ms | Continuous aggregate |
| Admin active users | 1000s of sessions | 50-100ms | Index on started_at |
| GDPR export | 25.9M rows (30 days) | 5-10 sec | Async job + streaming |

**Success metric:** All dashboard queries <100ms, user-facing queries <50ms.

---

## 8. Storage Efficiency Analysis

### 8.1 Raw Data Storage (Uncompressed)

```
Per user per day (30 Hz blink data):
- 30 samples/sec * 86,400 sec/day = 2,592,000 samples
- Schema: time (8 bytes) + user_id (16 bytes) + session_id (16 bytes) +
          blink_count (2 bytes) + ear_value (4 bytes) + confidence (4 bytes)
- Total per row: 50 bytes
- Per day: 2,592,000 * 50 = 129.6 MB

Per user per day (1 Hz posture data):
- 1 sample/sec * 86,400 sec/day = 86,400 samples
- Schema: time (8) + user_id (16) + session_id (16) + head_position (100 JSONB) +
          posture_score (2) + is_slouching (1) + is_leaning_forward (1)
- Total per row: 144 bytes
- Per day: 86,400 * 144 = 12.4 MB

TOTAL RAW PER USER PER DAY: 142 MB
```

### 8.2 Compressed Storage (TimescaleDB Native Compression)

**Compression techniques:**
- Delta encoding for timestamps: 8 bytes -> 1-2 bytes average
- Gorilla compression for floats: 4 bytes -> 0.5-1 byte average
- Run-length encoding for repeated IDs: 16 bytes -> 2-4 bytes average
- Dictionary encoding for enums/booleans: 1 byte -> 0.1 byte average

**Expected compression ratio:**
- Blink data: **90-95%** compression (129.6 MB -> 6.5-13 MB)
- Posture data: **85-90%** compression (12.4 MB -> 1.2-1.9 MB)

**TOTAL COMPRESSED PER USER PER DAY: 7.7-14.9 MB** (avg ~10 MB)

### 8.3 Storage Scaling

| Users | Raw (30d) | Compressed (30d) | Aggregated (1yr) | Total |
|-------|-----------|------------------|------------------|-------|
| 100 | 426 GB | 30 GB | 1.25 GB | 31.25 GB |
| 1,000 | 4.26 TB | 300 GB | 12.5 GB | 313 GB |
| 10,000 | 42.6 TB | 3 TB | 125 GB | 3.125 TB |
| 100,000 | 426 TB | 30 TB | 1.25 TB | 31.25 TB |

### 8.4 Cost Analysis (Timescale Cloud Pricing)

**Timescale Cloud pricing (2025):**
- Storage: $0.10/GB/month
- Compute: $0.05/hour (~$36/month) for 2 vCPU, 8GB RAM

| Users | Storage Cost | Compute Cost | Total/Month | Per User/Month |
|-------|--------------|--------------|-------------|----------------|
| 1K | $31 | $50 | $81 | $0.081 |
| 10K | $313 | $100 | $413 | $0.041 |
| 100K | $3,125 | $500 | $3,625 | $0.036 |

**Revenue model to sustain costs:**
- Freemium: Free tier (7-day retention, no exports)
- Pro: $5/user/month (30-day retention, exports, all features)
- Break-even at 1K users: $81 costs / $5 ARPU = 17 paid users (1.7% conversion)
- Break-even at 10K users: $413 / $5 = 83 paid users (0.83% conversion)

**Extremely sustainable unit economics.**

Sources:
- [TimescaleDB Compression Documentation](https://docs.timescale.com/use-timescale/latest/compression/)
- [Time-Series Compression Algorithms](https://cnosdb.medium.com/time-series-data-compression-algorithms-068d5894946d)

---

## 9. Migration Path & Implementation Plan

### Phase 1: MVP (Week 1-2)
- [ ] Set up TimescaleDB (Timescale Cloud free tier)
- [ ] Create hypertables, continuous aggregates
- [ ] Implement basic ingestion API (no batching yet)
- [ ] Desktop app: SQLite local queue, simple sync
- [ ] Web dashboard: Query continuous aggregates
- [ ] GDPR export (async job)

**Deliverable:** Working end-to-end prototype with 10 test users.

### Phase 2: Optimization (Week 3-4)
- [ ] Add PgBouncer connection pooling
- [ ] Implement batched writes (COPY protocol)
- [ ] Add Redis for idempotency + alert cooldowns
- [ ] Client-side real-time alerts
- [ ] Baseline calibration logic
- [ ] Flow state detection

**Deliverable:** Production-ready for 100-1K users.

### Phase 3: Scale Preparation (Week 5-6)
- [ ] Horizontal pod autoscaling (Kubernetes)
- [ ] Circuit breakers + graceful degradation
- [ ] Comprehensive monitoring (Grafana + Prometheus)
- [ ] Load testing (simulate 10K users)
- [ ] Optimize chunk sizes based on real data
- [ ] Fine-tune compression policies

**Deliverable:** Validated to handle 10K users.

### Phase 4: Enterprise Features (Week 7-8)
- [ ] Read replicas for dashboard queries
- [ ] Multi-region deployment (if needed)
- [ ] Advanced analytics (predictive alerts)
- [ ] Team/organization features
- [ ] Audit logging for compliance

**Deliverable:** Enterprise-ready platform.

---

## 10. Conclusion & Recommendations

### Why This Architecture Wins

1. **Purpose-built for time-series** - TimescaleDB is literally designed for this use case
2. **Familiar technology** - PostgreSQL SQL, no learning curve
3. **Automatic optimization** - Chunking, compression, aggregation all built-in
4. **Cost-effective** - 95% compression, cheap storage
5. **Proven at scale** - 100K+ sensors, 10M inserts/sec in production
6. **Zero vendor lock-in** - Open-source, self-hostable
7. **Solves all challenges** - Every Critical Six + 10 Scaling challenges addressed

### Critical Success Factors

1. **Use continuous aggregates religiously** - Never query raw data for dashboards
2. **Batch everything** - 1000-row batches via COPY, not individual INSERTs
3. **Client-side alerts** - Don't rely on server for real-time detection
4. **Compression is mandatory** - 90%+ reduction is table stakes
5. **Monitor chunk sizes** - Optimize for 25% of RAM per chunk

### Next Steps

1. **Validate with prototype** - Build Phase 1 MVP in 2 weeks
2. **Load test early** - Don't wait until production to test scale
3. **Measure everything** - Instrument query times, write throughput, compression ratios
4. **Iterate on chunk sizes** - Real data will reveal optimal settings
5. **Plan for growth** - Know when to scale horizontally vs vertically

### Final Thoughts

This is not a "typical CRUD app" architecture. Time-series data requires time-series thinking. By choosing TimescaleDB, we get 20 years of PostgreSQL maturity plus 5 years of time-series optimization. This is the right tool for the job.

The architecture solves all six critical challenges and all ten scaling challenges with headroom for 100K+ users. It's cost-effective ($0.036/user/month at scale), performant (<50ms dashboard queries), and maintainable (standard SQL).

**This is production-ready architecture for a real startup.**

---

## Appendix: Sources & Further Reading

### Time-Series Database Comparisons
- [Time-Series Databases 2025: InfluxDB vs TimescaleDB vs ClickHouse](https://markaicode.com/time-series-databases-2025-comparison/)
- [QuestDB vs TimescaleDB vs InfluxDB Comparison](https://risingwave.com/blog/questdb-vs-timescaledb-vs-influxdb-choosing-the-best-for-time-series-data-processing/)
- [Benchmarking Time-Series Databases](https://www.timestored.com/data/time-series-database-benchmarks)

### TimescaleDB Performance & Features
- [TimescaleDB Industrial IoT Case Studies](https://www.timescale.com/industrial-iot)
- [Ingest and Query Data from 100,000+ Sensors](https://www.timescale.com/industrial-iot)
- [TSBS IoT Performance Report](https://tdengine.com/tsbs-iot-performance-report-tdengine-influxdb-and-timescaledb/)
- [TimescaleDB Hypertables Documentation](https://docs.timescale.com/use-timescale/latest/hypertables/about-hypertables/)
- [Chunk Size Optimization Guide](https://www.tigerdata.com/blog/timescale-cloud-tips-testing-your-chunk-size)

### Compression & Storage
- [Data Compression Techniques for Time-Series](https://questdb.com/glossary/data-compression-techniques-for-time-series/)
- [TimescaleDB Downsampling Best Practices](https://www.tigerdata.com/blog/how-to-proactively-manage-long-term-data-storage-with-downsampling)
- [Time-Series Data Compression Algorithms](https://cnosdb.medium.com/time-series-data-compression-algorithms-068d5894946d)

### Continuous Aggregation & Materialized Views
- [Real-time Analytics with Time-Series Databases](https://questdb.com/blog/realtime-analytics-using-tsdb/)
- [ClickHouse Materialized Views for Real-Time Aggregations](https://engineering.wingify.com/posts/achieving-real-time-aggregations-with-ch-materialized-views/)

### Backpressure & Queue Management
- [Backpressure Handling in Time-Series Systems](https://questdb.com/glossary/backpressure-handling/)
- [Avoiding Queue Backlog Disasters](https://codeopinion.com/avoiding-a-queue-backlog-disaster-with-backpressure-flow-control/)
- [AWS Queue Backlog Avoidance](https://aws.amazon.com/builders-library/avoiding-insurmountable-queue-backlogs/)

### High-Frequency Sensor Data
- [Apache IoTDB: Time-Series Database for IoT](https://dl.acm.org/doi/10.1145/3726523)
- [Time-Series Database Architecture for Sensor Data](https://medium.com/machbase/time-series-database-architecture-and-performance-comparison-machbasedb-and-mongodb-48faa1eff0d)
- [InfluxDB 3 for Real-Time Applications](https://www.infoq.com/news/2025/10/amazon-timestream-influxdb3/)

---

**END OF ARCHITECTURE PROPOSAL**
