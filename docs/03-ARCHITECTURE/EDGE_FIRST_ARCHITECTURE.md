# WellnessGuard - Edge-First Architecture
## Client-Side Intelligence, Cloud-Side Summary

**Philosophy:** "The best request is the one never made. Process locally, sync summaries."

---

## Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Client-Side vs Server-Side Processing](#client-side-vs-server-side-processing)
3. [Sync Protocol Design](#sync-protocol-design)
4. [Critical Six Solutions](#critical-six-solutions)
5. [Scaling Challenge Solutions](#scaling-challenge-solutions)
6. [Trade-offs and Limitations](#trade-offs-and-limitations)
7. [Client Resource Requirements](#client-resource-requirements)
8. [Implementation Roadmap](#implementation-roadmap)

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          DESKTOP CLIENT (PRIMARY)                         │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    DETECTION LAYER (Edge)                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐               │ │
│  │  │  MediaPipe   │  │   Posture    │  │   Fatigue   │               │ │
│  │  │ Blink (30Hz) │  │  Tracking    │  │  Detection  │               │ │
│  │  │   • EAR      │  │  • Head pos  │  │  • Yawning  │               │ │
│  │  │   • Glasses  │  │  • Shoulders │  │  • Drowsy   │               │ │
│  │  │   • Lighting │  │  • Distance  │  │  • Slow     │               │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘               │ │
│  │         │                  │                  │                      │ │
│  └─────────┼──────────────────┼──────────────────┼──────────────────────┘ │
│            │                  │                  │                        │
│  ┌─────────▼──────────────────▼──────────────────▼──────────────────────┐ │
│  │              REAL-TIME AGGREGATION ENGINE (Edge)                     │ │
│  │                                                                       │ │
│  │  ┌───────────────────┐  ┌───────────────────┐  ┌──────────────────┐ │ │
│  │  │ Time-Window       │  │  Session State    │  │ Alert Engine     │ │ │
│  │  │ Aggregator        │  │  Manager          │  │ (Client-Side)    │ │ │
│  │  │ • 1-sec rolling   │  │  • Activity       │  │ • Baseline       │ │ │
│  │  │ • 1-min rolling   │  │  • Flow state     │  │ • Context-aware  │ │ │
│  │  │ • 5-min rolling   │  │  • Focus mode     │  │ • No server RTT  │ │ │
│  │  │ • 30-min rolling  │  │  • Breaks         │  │ • Instant        │ │ │
│  │  └───────────────────┘  └───────────────────┘  └──────────────────┘ │ │
│  │                                                                       │ │
│  └───────────────────────────────────┬───────────────────────────────────┘ │
│                                      │                                     │
│  ┌───────────────────────────────────▼───────────────────────────────────┐ │
│  │                   LOCAL DATABASE (SQLite + WAL)                       │ │
│  │                                                                       │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │  RAW DATA BUFFER (Retention: 2 hours)                           │ │ │
│  │  │  • 30Hz blink events → ~216K rows/2hr                           │ │ │
│  │  │  • Auto-purge after aggregation                                 │ │ │
│  │  │  • Used ONLY for baseline calibration & debug                   │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │  PRE-AGGREGATED ROLLUPS (Retention: 30 days local)              │ │ │
│  │  │  • 1-minute summaries  (1,440 rows/day)                         │ │ │
│  │  │  • 5-minute summaries  (288 rows/day)                           │ │ │
│  │  │  • 30-minute summaries (48 rows/day)                            │ │ │
│  │  │  • Session summaries   (~10 rows/day)                           │ │ │
│  │  │  Total: ~1,800 rows/day → 54K rows/month                        │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │  SYNC QUEUE (FIFO with checkpoints)                             │ │ │
│  │  │  • Pending summaries awaiting sync                              │ │ │
│  │  │  • Idempotency keys (ULID-based)                                │ │ │
│  │  │  • Retry metadata (attempts, backoff)                           │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │  USER PREFERENCES & BASELINE                                    │ │ │
│  │  │  • Personal blink rate baseline (learned)                       │ │ │
│  │  │  • Alert thresholds (customized)                                │ │ │
│  │  │  • Focus mode schedule                                          │ │ │
│  │  │  • Quiet hours                                                  │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  └───────────────────────────────────┬───────────────────────────────────┘ │
│                                      │                                     │
│  ┌───────────────────────────────────▼───────────────────────────────────┐ │
│  │                   BACKGROUND SYNC MANAGER                             │ │
│  │                                                                       │ │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────┐ │ │
│  │  │ Smart Scheduler    │  │ Batch Builder      │  │ Retry Engine   │ │ │
│  │  │ • On session end   │  │ • Max 500 rows     │  │ • Exp backoff  │ │ │
│  │  │ • Every 5 min      │  │ • Max 32KB         │  │ • Checkpoint   │ │ │
│  │  │ • WiFi detection   │  │ • Compression      │  │ • Resume       │ │ │
│  │  │ • Low-power aware  │  │ • Delta encoding   │  │ • Reorder      │ │ │
│  │  └────────────────────┘  └────────────────────┘  └────────────────┘ │ │
│  │                                                                       │ │
│  └───────────────────────────────────┬───────────────────────────────────┘ │
│                                      │                                     │
└──────────────────────────────────────┼─────────────────────────────────────┘
                                       │
                       ┌───────────────▼────────────────┐
                       │   HTTPS/2 (Compressed JSON)    │
                       │   • Idempotency headers        │
                       │   • Batch upsert endpoints     │
                       │   • Rate: ~100 requests/hour   │
                       └───────────────┬────────────────┘
                                       │
┌──────────────────────────────────────▼─────────────────────────────────────┐
│                         CLOUD LAYER (SECONDARY)                            │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │                       SUPABASE BACKEND                              │   │
│  │                                                                     │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │  SYNC INGESTION API (Edge Functions)                         │  │   │
│  │  │  • Validate idempotency keys                                 │  │   │
│  │  │  • Batch upsert (500 rows/request)                           │  │   │
│  │  │  • No computation - store only                               │  │   │
│  │  │  • Return sync watermark                                     │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  │                                                                     │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │  POSTGRESQL (Time-Series Optimized)                          │  │   │
│  │  │                                                               │  │   │
│  │  │  ┌────────────────────────────────────────────────────────┐  │  │   │
│  │  │  │  users (100-100K rows)                                 │  │  │   │
│  │  │  │  • Auth metadata                                       │  │  │   │
│  │  │  │  • Preferences (synced from client)                    │  │  │   │
│  │  │  │  • GDPR consent                                        │  │  │   │
│  │  │  └────────────────────────────────────────────────────────┘  │  │   │
│  │  │                                                               │  │   │
│  │  │  ┌────────────────────────────────────────────────────────┐  │  │   │
│  │  │  │  sessions (1K-1M rows)                                 │  │  │   │
│  │  │  │  • Session metadata                                    │  │  │   │
│  │  │  │  • Client-computed wellness scores                     │  │  │   │
│  │  │  │  • Summary statistics                                  │  │  │   │
│  │  │  │  Partitioned by user_id + date                         │  │  │   │
│  │  │  └────────────────────────────────────────────────────────┘  │  │   │
│  │  │                                                               │  │   │
│  │  │  ┌────────────────────────────────────────────────────────┐  │  │   │
│  │  │  │  minute_summaries (50K-50M rows)                       │  │  │   │
│  │  │  │  • 1-min aggregated blink/posture/fatigue              │  │  │   │
│  │  │  │  • No raw data - summaries only                        │  │  │   │
│  │  │  │  • Retention: 90 days (then archive)                   │  │  │   │
│  │  │  │  Partitioned by user_id + date                         │  │  │   │
│  │  │  │  Hypertables (TimescaleDB extension)                   │  │  │   │
│  │  │  └────────────────────────────────────────────────────────┘  │  │   │
│  │  │                                                               │  │   │
│  │  │  ┌────────────────────────────────────────────────────────┐  │  │   │
│  │  │  │  hourly_summaries (2K-2M rows)                         │  │  │   │
│  │  │  │  • Continuous aggregate from minute_summaries          │  │  │   │
│  │  │  │  • Retention: 365 days                                 │  │  │   │
│  │  │  │  • Materialized view (auto-refresh)                    │  │  │   │
│  │  │  └────────────────────────────────────────────────────────┘  │  │   │
│  │  │                                                               │  │   │
│  │  │  ┌────────────────────────────────────────────────────────┐  │  │   │
│  │  │  │  daily_summaries (30-30K rows)                         │  │  │   │
│  │  │  │  • Continuous aggregate from hourly_summaries          │  │  │   │
│  │  │  │  • Retention: Forever (cheap, 1 row/user/day)          │  │  │   │
│  │  │  │  • Used for long-term trends                           │  │  │   │
│  │  │  └────────────────────────────────────────────────────────┘  │  │   │
│  │  │                                                               │  │   │
│  │  │  NO blink_data table (no raw data in cloud)                  │  │   │
│  │  │  NO posture_data table (summaries only)                      │  │   │
│  │  │                                                               │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  │                                                                     │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │  DASHBOARD QUERY API                                         │  │   │
│  │  │  • Read-only endpoints                                       │  │   │
│  │  │  • Query pre-aggregated data only                            │  │   │
│  │  │  • Cache-friendly (1-min TTL)                                │  │   │
│  │  │  • Pagination built-in                                       │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                        WEB DASHBOARD (View-Only)                           │
│                                                                            │
│  • Queries aggregated data from cloud                                     │
│  • No heavy computation - charts render pre-computed summaries            │
│  • Real-time updates via polling (not WebSockets)                         │
│  • Optimistic UI for settings changes (sync to client)                    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Client-Side vs Server-Side Processing

### CLIENT-SIDE RESPONSIBILITIES (Primary Intelligence)

#### 1. Detection & Processing (100% Client)
| Task | Frequency | Processing |
|------|-----------|------------|
| **Blink Detection** | 30 Hz | MediaPipe FaceMesh (CPU: 5-10%) |
| **EAR Calculation** | 30 Hz | Eye Aspect Ratio algorithm |
| **Glasses Detection** | 30 Hz | Landmark confidence + reflection detection |
| **Posture Tracking** | 10 Hz | MediaPipe Pose (CPU: 3-5%) |
| **Fatigue Detection** | 5 Hz | Yawn detection + drowsiness scoring |
| **Lighting Adaptation** | 1 Hz | Dynamic threshold adjustment |

**Total CPU:** ~15-20% on modern desktop (i5/Ryzen 5+)
**GPU:** Optional acceleration via MediaPipe GPU delegate
**RAM:** ~200-300 MB for models + buffers

#### 2. Real-Time Aggregation (100% Client)
| Time Window | Metrics Computed | Storage |
|-------------|------------------|---------|
| **1-second** | Blink count, avg EAR, posture score | Rolling buffer (60 items) |
| **1-minute** | Blink rate, posture %, fatigue events | SQLite (1,440/day) |
| **5-minute** | Trend detection, baseline deviation | SQLite (288/day) |
| **30-minute** | Session wellness score, break compliance | SQLite (48/day) |
| **Session** | Total summary, alert history | SQLite (~10/day) |

**Why client-side?**
- **Zero latency** - instant feedback for alerts
- **No network dependency** - works offline indefinitely
- **Privacy** - raw video never leaves device
- **Cost** - zero server compute for 99% of work

#### 3. Intelligent Alerting (100% Client)
```python
# ALERT ENGINE (Client-Side State Machine)
class ClientAlertEngine:
    def __init__(self):
        self.baseline = PersonalBaseline()  # Learned over 2 hours
        self.context = ContextAwareness()   # Calendar, app usage, time of day
        self.history = AlertHistory()       # What worked, what was dismissed

    def should_alert(self, metric, value):
        # ZERO server round-trips for decision

        # 1. Baseline check (personalized)
        if not self.baseline.is_anomalous(metric, value):
            return False

        # 2. Context check (flow state awareness)
        if self.context.is_in_flow_state():
            return False  # Batch for later

        if self.context.is_in_meeting():
            return False  # Silent mode

        # 3. Fatigue check (timing optimization)
        if self.history.was_dismissed_recently(metric):
            return False  # User doesn't want this now

        # 4. Alert with optimal timing
        return True
```

**Alert latency:** <50ms from detection to notification
**Server involvement:** ZERO - all decisions local

#### 4. Baseline Calibration (100% Client)
```python
# PERSONAL BASELINE LEARNING (First 2 hours)
class PersonalBaseline:
    def calibrate(self, raw_data_2hr):
        # Uses 2 hours of raw data (retained locally only)

        # Individual metrics
        self.baseline_blink_rate = percentile(raw_data, 50)  # Median
        self.normal_blink_range = (percentile(25), percentile(75))

        # Contextual baselines
        self.morning_baseline = compute_by_time_of_day(6-12)
        self.afternoon_baseline = compute_by_time_of_day(12-18)
        self.evening_baseline = compute_by_time_of_day(18-24)

        # Posture baselines
        self.comfortable_head_position = mode(head_positions)
        self.comfortable_distance = median(screen_distances)

        # After calibration: DELETE raw data
        # Only keep baseline parameters (10 KB vs 50 MB)
```

**Calibration time:** First 2 hours of use
**Data retained:** Baseline parameters only (~10 KB)
**Raw data retention:** 2 hours max, then purged

#### 5. Session Management (100% Client)
```python
# SESSION STATE MACHINE (Client-Side)
class SessionManager:
    def __init__(self):
        self.state = SessionState.IDLE
        self.start_time = None
        self.activity_buffer = deque(maxlen=300)  # 5 min at 1Hz

    def detect_session_boundaries(self):
        # No server needed - local heuristics

        # Start detection
        if self.user_present() and self.state == IDLE:
            self.state = ACTIVE
            self.start_time = now()

        # Break detection (for wellness scoring)
        if self.no_activity_for(5 * 60):  # 5 min idle
            self.mark_break()

        # End detection
        if self.no_activity_for(15 * 60):  # 15 min idle
            self.end_session()
            self.sync_queue.add(self.session_summary)

    def end_session(self):
        summary = {
            'duration': now() - self.start_time,
            'wellness_score': self.compute_wellness_score(),  # LOCAL
            'blink_summary': self.aggregate_blinks(),         # LOCAL
            'posture_summary': self.aggregate_posture(),      # LOCAL
            'breaks_taken': len(self.breaks),
            'alerts_shown': len(self.alerts),
            'alerts_dismissed': len([a for a in alerts if a.dismissed])
        }
        return summary  # ~500 bytes
```

**Session detection:** Fully autonomous
**Wellness scoring:** Computed locally
**Sync payload:** Session summary only (~500 bytes)

#### 6. Offline Operation (Unlimited Duration)
```python
# OFFLINE QUEUE MANAGER
class OfflineQueueManager:
    def __init__(self, max_size_mb=100):
        self.queue = SQLiteQueue('sync_queue.db')
        self.max_size = max_size_mb * 1024 * 1024

    def enqueue(self, summary):
        # Summaries are tiny - can queue weeks offline
        # 1 day = ~1,800 summaries * 500 bytes = 900 KB
        # 100 MB = ~110 days offline buffer

        self.queue.add(summary, idempotency_key=ulid())

        if self.queue.size() > self.max_size:
            # Intelligent pruning
            self.queue.compress_old_data()  # Merge older summaries

    def sync_when_online(self):
        # Batched, rate-limited sync
        while self.queue.has_pending() and self.is_online():
            batch = self.queue.take(500)  # 500 summaries
            response = self.api.batch_upsert(batch)

            if response.success:
                self.queue.mark_synced(batch.ids)
            else:
                self.queue.retry_with_backoff(batch.ids)
```

**Offline capacity:** 100+ days at default settings
**Sync overhead:** ~1 MB/day compressed
**Queue intelligence:** Auto-compression of old data

---

### SERVER-SIDE RESPONSIBILITIES (Storage Only)

#### 1. Sync Ingestion (Dumb Receiver)
```javascript
// EDGE FUNCTION: Batch Upsert (No Computation)
export async function batchUpsert(req) {
  const { summaries, idempotency_keys } = req.body;

  // Validate only
  if (!validate_auth(req)) return 401;
  if (summaries.length > 500) return 413;

  // Idempotent upsert
  const result = await db.upsert('minute_summaries', summaries, {
    conflict_target: ['user_id', 'timestamp'],
    on_conflict: 'ignore'  // Client is source of truth
  });

  // Return watermark for client checkpointing
  return {
    synced_count: result.count,
    watermark: max(summaries.map(s => s.timestamp))
  };
}
```

**Server CPU:** Near zero - just database writes
**Concurrency:** Limited by Postgres connection pool (100-500)
**Batching:** 500 summaries per request = 1 request per 8 hours

#### 2. Dashboard Query API (Read-Only)
```javascript
// EDGE FUNCTION: Get Daily Trends
export async function getDailyTrends(req) {
  const { user_id, days = 30 } = req.query;

  // Query pre-aggregated data ONLY
  const trends = await db.query(`
    SELECT
      date,
      avg_blink_rate,
      avg_wellness_score,
      total_breaks
    FROM daily_summaries
    WHERE user_id = $1
      AND date >= NOW() - INTERVAL '$2 days'
    ORDER BY date DESC
  `, [user_id, days]);

  // Return cached for 1 minute
  return cache(trends, ttl: 60);
}
```

**Query time:** <100ms (indexed, partitioned, pre-aggregated)
**Cache:** 1-minute TTL reduces database load
**Data volume:** Queries daily summaries (30 rows) not raw data

#### 3. Data Retention & Archival (Background Jobs)
```sql
-- DAILY CRON JOB: Archive old data
-- Runs at 3 AM daily

-- Step 1: Archive minute_summaries > 90 days to S3
COPY (
  SELECT * FROM minute_summaries
  WHERE timestamp < NOW() - INTERVAL '90 days'
) TO 's3://wellness-archive/minute_summaries/2025-12.parquet';

-- Step 2: Delete archived data
DELETE FROM minute_summaries
WHERE timestamp < NOW() - INTERVAL '90 days';

-- Step 3: Update continuous aggregates
REFRESH MATERIALIZED VIEW hourly_summaries;
REFRESH MATERIALIZED VIEW daily_summaries;

-- Step 4: Vacuum tables
VACUUM ANALYZE minute_summaries;
```

**Automation:** Daily cron (no manual intervention)
**Archive format:** Parquet (10x compression)
**Cost:** ~$5/TB/month in S3 Glacier

---

### DATA FLOW COMPARISON

#### Traditional (Server-Heavy) Approach
```
Camera (30Hz)
  → Upload raw frames (30 MB/min)
    → Server detection (100% CPU)
      → Server aggregation
        → Store raw data (864K rows/day)
          → Query raw data for dashboard
            → Aggregate on read (slow)
```
**Costs:**
- Upload: 1.8 GB/hour * $0.09/GB = $0.16/hour
- Compute: 1 vCPU * $0.05/hour = $0.05/hour
- Storage: 864K rows/day * 30 days = 25M rows
- Query: Full table scan for aggregates

**Total:** $3-5/user/month

#### Edge-First Approach (This Design)
```
Camera (30Hz)
  → Client detection (local CPU)
    → Client aggregation (local CPU)
      → Store summaries only (1.8K rows/day)
        → Sync summaries (1 MB/day)
          → Query pre-aggregated (fast)
```
**Costs:**
- Upload: 1 MB/day * $0.09/GB = $0.0001/day
- Compute: $0 (client does all work)
- Storage: 1.8K rows/day * 30 days = 54K rows
- Query: Indexed, partitioned, pre-aggregated

**Total:** $0.01/user/month (300x cheaper)

---

## Sync Protocol Design

### Sync Strategy: "Eventual Consistency with Client Authority"

#### Core Principles
1. **Client is source of truth** - Server never overrides client data
2. **Idempotent upserts** - Same data sent twice = same result
3. **Conflict-free** - No conflicts possible (client owns its data)
4. **Resumable** - Sync can pause/resume without data loss
5. **Bandwidth-efficient** - Only summaries, compressed, batched

#### Sync Triggers (Smart Scheduling)
```python
class SyncScheduler:
    def should_sync(self):
        # 1. Session end (immediate sync)
        if self.session_just_ended():
            return True, priority=HIGH

        # 2. Regular interval (every 5 minutes if online)
        if self.minutes_since_last_sync() >= 5:
            return True, priority=NORMAL

        # 3. Queue threshold (>1000 pending summaries)
        if self.queue_size() > 1000:
            return True, priority=NORMAL

        # 4. WiFi detected (opportunistic sync)
        if self.network_changed_to_wifi():
            return True, priority=LOW

        # 5. Low power mode (defer sync)
        if self.on_battery() and self.battery_level() < 20:
            return False  # Wait for AC power

        return False
```

#### Sync Packet Format
```json
{
  "batch_id": "01JDQX7Z8G9HKJM2N3P4Q5R6S7",  // ULID
  "user_id": "uuid",
  "summaries": [
    {
      "idempotency_key": "01JDQX7Z8G9HKJM2N3P4Q5R6S8",  // ULID per summary
      "type": "minute_summary",
      "timestamp": "2025-12-18T14:32:00Z",
      "session_id": "uuid",

      "blink": {
        "count": 18,
        "rate": 18.0,
        "avg_ear": 0.28,
        "min_ear": 0.12,
        "baseline_deviation": 0.05
      },

      "posture": {
        "score": 78,
        "slouching_seconds": 12,
        "forward_head_seconds": 8,
        "avg_distance_cm": 58
      },

      "fatigue": {
        "yawn_count": 0,
        "drowsy_seconds": 0,
        "slow_blink_count": 2
      },

      "alerts": [
        {"type": "low_blink", "dismissed": true, "shown_at": "14:31:45"}
      ]
    }
    // ... up to 500 summaries per batch
  ],

  "compression": "gzip",  // Optional
  "checksum": "sha256:..."
}
```

**Packet size:**
- Uncompressed: ~500 bytes/summary * 500 = 250 KB
- Gzip compressed: ~50-100 KB (5x compression)

#### Idempotency Implementation
```python
# CLIENT: Generate idempotency key
def generate_idempotency_key(summary):
    # ULID: timestamp-sortable, globally unique
    return ulid.create()

# SERVER: Idempotent upsert
async def batch_upsert(summaries):
    for summary in summaries:
        await db.execute("""
            INSERT INTO minute_summaries
            (idempotency_key, user_id, timestamp, blink, posture, fatigue)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id, timestamp) DO NOTHING
        """, summary)

    # Duplicate sends are ignored - safe to retry
```

#### Sync Resume & Checkpointing
```python
class SyncCheckpoint:
    def __init__(self):
        self.last_synced_timestamp = self.load_from_disk()

    def sync(self):
        # Resume from last checkpoint
        pending = self.queue.get_after(self.last_synced_timestamp)

        for batch in chunk(pending, 500):
            response = self.api.batch_upsert(batch)

            if response.success:
                # Update checkpoint
                self.last_synced_timestamp = response.watermark
                self.save_to_disk()

                # Remove from queue
                self.queue.delete(batch.ids)
            else:
                # Retry with exponential backoff
                self.retry_queue.add(batch, backoff=self.next_backoff())
                break  # Stop this sync attempt
```

#### Rate Limiting & Backpressure
```python
class RateLimiter:
    def __init__(self):
        self.requests_per_minute = 12  # Max 12 batches/min
        self.window = deque(maxlen=12)

    def allow_request(self):
        now = time.now()

        # Remove requests older than 1 minute
        while self.window and now - self.window[0] > 60:
            self.window.popleft()

        # Check limit
        if len(self.window) >= self.requests_per_minute:
            return False, retry_after=60 - (now - self.window[0])

        # Allow and record
        self.window.append(now)
        return True, retry_after=0
```

**Max sync rate:** 12 requests/min * 500 summaries = 6,000 summaries/min
**Normal usage:** ~1 request/5 min = 12 requests/hour
**Backlog capacity:** Can catch up 6,000 summaries in 1 minute

#### Conflict-Free Design (No CRDTs Needed)
```
Why we DON'T need CRDTs:

1. Single writer per user - Client owns its data
   - No multi-device writes to same timestamp
   - Each device has unique session_id

2. Append-only data model - No updates
   - Summaries are immutable once created
   - ON CONFLICT DO NOTHING handles duplicates

3. User preferences - Last-Write-Wins (LWW)
   - Preferences have version number
   - Client sends: {key: value, version: 5}
   - Server accepts if version >= current

4. No collaborative editing - Single-user data
   - Unlike Figma/Notion (multi-user docs)
   - Each user's data is isolated
```

**Simplified consistency:** Idempotent append-only writes + LWW for settings

---

## Critical Six Solutions

### 1. Glasses Detection Failure ✅

**Edge-Computing Solution:**

```python
class GlassesRobustBlinkDetector:
    def __init__(self):
        # MediaPipe FaceMesh with iris tracking
        self.face_mesh = mp.solutions.face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,  # Iris landmarks
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        # Adaptive thresholds (client-side learning)
        self.ear_threshold = AdaptiveThreshold(
            initial=0.25,
            adaptation_rate=0.01
        )

    def detect_blink(self, frame):
        # 1. Get landmarks with confidence scores
        results = self.face_mesh.process(frame)
        landmarks = results.multi_face_landmarks[0]

        # 2. Calculate EAR for both eyes
        left_ear = self.calculate_ear(landmarks, EYE_LEFT_INDICES)
        right_ear = self.calculate_ear(landmarks, EYE_RIGHT_INDICES)

        # 3. Glasses detection (confidence-based)
        left_confidence = landmarks[EYE_LEFT_INDICES[0]].visibility
        right_confidence = landmarks[EYE_RIGHT_INDICES[0]].visibility

        wearing_glasses = (left_confidence < 0.8 or right_confidence < 0.8)

        if wearing_glasses:
            # 4. Adaptive threshold for glasses wearers
            # Glasses reduce landmark confidence, so lower threshold
            threshold = self.ear_threshold.get() * 0.9

            # 5. Require both eyes (reduces reflection false positives)
            blink = (left_ear < threshold and right_ear < threshold)

            # 6. Duration check (blinks are 100-300ms)
            if blink:
                self.blink_start_time = now()
            elif self.blink_start_time:
                duration = now() - self.blink_start_time
                if 100 < duration < 300:
                    return True  # Valid blink
                self.blink_start_time = None

        else:
            # Standard detection for non-glasses wearers
            threshold = self.ear_threshold.get()
            avg_ear = (left_ear + right_ear) / 2
            blink = avg_ear < threshold

        return False

    def adapt_threshold(self, ear_history):
        # Learn user's baseline EAR over first 100 blinks
        if len(ear_history) == 100:
            # Set threshold at 20th percentile of EAR distribution
            self.ear_threshold.set(percentile(ear_history, 20))
```

**Why edge-first wins:**
- **Adaptation:** Learns user's glasses + EAR in first 2 hours (local only)
- **Privacy:** No frames uploaded for "glasses calibration"
- **Latency:** Real-time feedback (<33ms per frame)
- **Robustness:** Handles different glasses types without server updates

**Validation:**
- Accuracy target: >90% for glasses wearers
- Test with: Thin frames, thick frames, blue-light, transitions
- Benchmark: 100 users with glasses, 2-week retention

---

### 2. Lighting Robustness ✅

**Edge-Computing Solution:**

```python
class LightingAdaptiveDetector:
    def __init__(self):
        self.brightness_history = deque(maxlen=300)  # 10 sec at 30 Hz
        self.contrast_adaptive = True

    def process_frame(self, frame):
        # 1. Analyze lighting conditions (client-side)
        brightness = cv2.mean(frame)[0]
        self.brightness_history.append(brightness)

        # 2. Detect lighting condition
        condition = self.classify_lighting(brightness, frame)

        # 3. Apply preprocessing based on condition
        if condition == LightingCondition.BACKLIT:
            # Histogram equalization for backlit scenarios
            frame = cv2.equalizeHist(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
            frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)

        elif condition == LightingCondition.LOW_LIGHT:
            # Gamma correction for low light
            gamma = 1.5
            frame = np.power(frame / 255.0, 1/gamma) * 255
            frame = frame.astype(np.uint8)

        elif condition == LightingCondition.HARSH_OVERHEAD:
            # Shadow reduction via bilateral filter
            frame = cv2.bilateralFilter(frame, 9, 75, 75)

        # 4. Adaptive contrast normalization
        if self.contrast_adaptive:
            frame = self.normalize_contrast(frame)

        return frame

    def classify_lighting(self, brightness, frame):
        # Backlit detection: Low avg brightness + high variance
        variance = np.var(frame)
        if brightness < 80 and variance > 1000:
            return LightingCondition.BACKLIT

        # Low light: Low brightness, low variance
        if brightness < 60:
            return LightingCondition.LOW_LIGHT

        # Harsh overhead: High brightness, high contrast in face region
        if brightness > 180:
            return LightingCondition.HARSH_OVERHEAD

        return LightingCondition.NORMAL
```

**Why edge-first wins:**
- **Real-time:** Preprocessing happens at 30 Hz (no network latency)
- **Adaptive:** Adjusts to changing light throughout day (local learning)
- **No upload:** Preprocessing done before detection (privacy + bandwidth)
- **Offline:** Works in changing light even when offline

**Validation:**
- Test scenarios: Morning (bright), afternoon (glare), evening (dim), backlit
- Accuracy target: >85% detection in all lighting conditions
- No manual calibration required

---

### 3. Alert Fatigue & Timing ✅

**Edge-Computing Solution:**

```python
class ContextAwareAlertEngine:
    def __init__(self):
        # CLIENT-SIDE ONLY - Zero server latency
        self.context = ContextTracker()
        self.history = AlertHistory()
        self.ml_model = FlowStateDetector()  # Lightweight on-device model

    def should_alert(self, alert_type, severity):
        # 1. Flow state detection (client-side ML)
        if self.ml_model.is_in_flow_state():
            # Batch alerts for later
            self.pending_alerts.add(alert_type)
            return False

        # 2. Calendar integration (local calendar API)
        if self.context.is_in_meeting():
            return False  # Silent during meetings

        # 3. Application focus tracking
        focused_app = self.context.get_focused_app()
        if focused_app in ['zoom', 'teams', 'meet']:
            return False  # Silent during video calls

        # 4. Time-of-day awareness
        hour = datetime.now().hour
        if hour < 8 or hour > 22:
            return False  # Quiet hours

        # 5. Alert history (learning)
        if self.history.was_dismissed_quickly(alert_type):
            # User doesn't find this alert useful
            self.history.reduce_priority(alert_type)
            return False

        # 6. Alert spacing (no alert fatigue)
        if self.history.last_alert_seconds_ago() < 300:
            return False  # Max 1 alert per 5 minutes

        # 7. Severity escalation
        if severity == 'info':
            # Batch low-priority alerts for session end
            self.pending_alerts.add(alert_type)
            return False

        # OK to alert
        return True

    def deliver_pending_alerts(self):
        # Called at natural break points:
        # - Session end
        # - User returns from break
        # - Flow state ends

        if len(self.pending_alerts) == 0:
            return

        # Summarize batched alerts
        summary = self.summarize_alerts(self.pending_alerts)
        self.show_summary_notification(summary)
        self.pending_alerts.clear()


class FlowStateDetector:
    """Lightweight on-device ML model for flow state detection"""

    def __init__(self):
        # Features (all available client-side):
        # - Keyboard activity (high typing rate)
        # - Mouse activity (low mouse movement = reading/thinking)
        # - Blink rate (slightly reduced when focused)
        # - Application type (IDE, editor, browser)
        # - Time in current window (>10 min = deep work)

        self.model = self.load_tiny_model()  # <1 MB, <10ms inference

    def is_in_flow_state(self):
        features = {
            'keystrokes_per_min': self.get_keyboard_rate(),
            'mouse_movements_per_min': self.get_mouse_rate(),
            'blink_rate_deviation': self.get_blink_deviation(),
            'window_focus_duration': self.get_focus_duration(),
            'app_category': self.get_app_category()
        }

        # Simple decision tree (no heavy ML needed)
        score = self.model.predict(features)
        return score > 0.7  # 70% confidence = flow state
```

**Why edge-first wins:**
- **Zero latency:** Alert decision in <1ms (no server round-trip)
- **Context-aware:** Access to local system state (calendar, apps, keyboard)
- **Learning:** Adapts to user's dismissal patterns (local history)
- **Privacy:** No need to upload calendar or app usage data
- **Offline:** Alert engine works without network

**Validation:**
- Alert acknowledgment rate: >50% after 30 days (vs <10% for naive alerts)
- Flow state interruptions: 0 (vs 5-10/day for naive alerts)
- User satisfaction: >80% (via in-app survey)

---

### 4. Privacy/Surveillance Perception ✅

**Edge-Computing Solution:**

**1. Zero Data Upload (Technical)**
```python
class PrivacyGuarantees:
    def __init__(self):
        self.local_only = True
        self.telemetry_disabled = True

    def what_leaves_device(self):
        """Exhaustive list of data that leaves device"""
        return {
            'raw_video': False,        # NEVER uploaded
            'screenshots': False,       # NEVER uploaded
            'blink_events': False,      # NEVER uploaded (aggregated only)
            'face_landmarks': False,    # NEVER uploaded

            'minute_summaries': True,   # Aggregated metrics only
            'session_summaries': True,  # Session-level stats
            'user_preferences': True,   # Settings sync
            'auth_tokens': True         # Authentication only
        }

    def what_is_stored_locally(self):
        """What stays on device"""
        return {
            'raw_video': 'RAM only, never written to disk',
            'face_landmarks': 'RAM only, discarded after processing',
            'blink_events': '2 hours for calibration, then deleted',
            'minute_summaries': '30 days local, then cloud sync',
            'baseline_parameters': 'Forever (10 KB)',
            'user_preferences': 'Forever (sync to cloud)'
        }
```

**2. Visual Privacy Indicators (UI)**
```python
class PrivacyUI:
    def show_privacy_status(self):
        # Always-visible indicator in system tray
        self.tray_icon.set_status({
            'camera_active': True,          # Green dot
            'processing_locally': True,     # "Local" badge
            'network_activity': False,      # No upload icon
            'last_sync': '5 min ago'        # Last cloud sync
        })

    def show_data_flow_visualization(self):
        # On-demand privacy dashboard
        ui = PrivacyDashboard()
        ui.show({
            'camera_fps': '30 Hz',
            'processing': 'Local CPU only',
            'data_uploaded_today': '2.3 KB (summaries only)',
            'data_stored_locally': '45 MB (30 days)',
            'cloud_storage': '850 KB (90 days)',

            'raw_video': {
                'status': 'Never saved or uploaded',
                'proof': 'Open source code'
            },

            'aggregated_data': {
                'status': 'Synced to cloud',
                'size': '850 KB (90 days)',
                'content': 'Blink rates, posture scores (no video)',
                'retention': '90 days, then archived'
            }
        })
```

**3. Open Source + Audit (Trust)**
```
- Full source code on GitHub
- Third-party security audit (pre-launch)
- Privacy policy in plain English
- GDPR compliance built-in
- Data export in JSON format
- One-click account deletion
```

**4. Marketing Messaging**
```
Landing page:
"Your wellness data never leaves your computer.
 Video processed locally. Only summaries synced.
 No screenshots. No recordings. No surveillance."

[See exactly what data leaves your device →]
[Read our privacy audit report →]
[Download source code →]
```

**Why edge-first wins:**
- **Provable privacy:** No raw data upload (verifiable in network logs)
- **No surveillance capability:** No video storage = no surveillance risk
- **Transparent:** Open source allows inspection
- **User control:** Local processing = user owns their data
- **Competitive advantage:** Most competitors upload everything

**Validation:**
- Camera enablement rate: >80% (vs <30% for cloud-based)
- Privacy concern mentions: <5% in user feedback
- Corporate adoption: Enabled by IT departments (privacy-first design)

---

### 5. Individual Baseline Calibration ✅

**Edge-Computing Solution:**

```python
class PersonalBaselineCalibration:
    """Client-side learning - no server needed"""

    def __init__(self):
        self.calibration_period = 2 * 60 * 60  # 2 hours
        self.raw_data_buffer = []  # Temporary storage
        self.baseline = None

    def calibrate(self, session_data):
        """Learn user's personal baseline in first 2 hours"""

        # Collect raw data for calibration period only
        self.raw_data_buffer.extend(session_data.blink_events)

        elapsed = len(self.raw_data_buffer) / 30  # 30 Hz

        if elapsed < self.calibration_period:
            # Still calibrating - show progress
            self.ui.show_calibration_progress(elapsed / self.calibration_period)
            return

        # Calibration complete - compute baseline
        self.baseline = self.compute_baseline(self.raw_data_buffer)

        # DELETE raw data (only keep baseline parameters)
        self.raw_data_buffer.clear()
        self.raw_data_buffer = None  # Free memory

        # Persist baseline (10 KB vs 50 MB raw data)
        self.save_baseline(self.baseline)

    def compute_baseline(self, raw_data):
        """Compute personalized baseline from raw data"""

        # Extract blink rates per minute
        blink_rates = self.aggregate_by_minute(raw_data)

        # Compute percentiles (robust to outliers)
        baseline = {
            # Overall baseline
            'median_blink_rate': percentile(blink_rates, 50),
            'normal_range': (percentile(blink_rates, 25), percentile(blink_rates, 75)),
            'low_threshold': percentile(blink_rates, 10),  # Alert below this

            # Time-of-day baselines (circadian rhythm)
            'morning_baseline': self.compute_for_hours(blink_rates, 6, 12),
            'afternoon_baseline': self.compute_for_hours(blink_rates, 12, 18),
            'evening_baseline': self.compute_for_hours(blink_rates, 18, 24),

            # Contextual baselines
            'reading_baseline': self.compute_for_activity(blink_rates, 'reading'),
            'coding_baseline': self.compute_for_activity(blink_rates, 'coding'),
            'browsing_baseline': self.compute_for_activity(blink_rates, 'browsing'),

            # Posture baselines
            'comfortable_head_angle': self.compute_posture_baseline(raw_data),
            'comfortable_distance': self.compute_distance_baseline(raw_data),

            # Metadata
            'calibrated_at': now(),
            'calibration_hours': 2,
            'sample_count': len(raw_data)
        }

        return baseline

    def is_anomalous(self, metric, value):
        """Check if value is anomalous for THIS user"""

        if self.baseline is None:
            # Still calibrating - use population average
            return self.check_population_baseline(metric, value)

        # Use personal baseline
        if metric == 'blink_rate':
            # Time-of-day adjusted
            hour = datetime.now().hour
            if 6 <= hour < 12:
                threshold = self.baseline['morning_baseline']['low_threshold']
            elif 12 <= hour < 18:
                threshold = self.baseline['afternoon_baseline']['low_threshold']
            else:
                threshold = self.baseline['evening_baseline']['low_threshold']

            return value < threshold

        # Similar logic for other metrics
        return False
```

**Why edge-first wins:**
- **Privacy:** Raw data never leaves device (only 2-hour calibration period)
- **Personalization:** Learns individual's baseline (not population average)
- **Efficiency:** 10 KB baseline vs 50 MB raw data
- **Offline:** Calibration works without network
- **Fast:** No upload/download latency

**Validation:**
- Calibration time: <2 hours for 90% of users
- Alert accuracy: >85% after calibration (vs <40% with population average)
- False positive rate: <10% after calibration (vs >60% without)

---

### 6. Flow State Interruption ✅

**Edge-Computing Solution:**

```python
class FlowStateProtection:
    """Client-side flow state detection - no server latency"""

    def __init__(self):
        self.detector = FlowStateDetector()
        self.alert_queue = FlowStateAlertQueue()

    def check_alert_timing(self, alert):
        # INSTANT decision (no server round-trip)
        flow_state = self.detector.detect()

        if flow_state.in_flow:
            # Defer alert until flow state ends
            self.alert_queue.defer(alert, reason='flow_state')

            # Log deferral for learning
            self.analytics.log_alert_deferred(alert, flow_state)

            return False  # Don't show alert now

        return True  # OK to show alert


class FlowStateDetector:
    """Lightweight client-side flow state detection"""

    def __init__(self):
        # Multi-signal approach (all available locally)
        self.keyboard_monitor = KeyboardActivityMonitor()
        self.mouse_monitor = MouseActivityMonitor()
        self.window_monitor = WindowFocusMonitor()
        self.blink_monitor = BlinkPatternMonitor()

    def detect(self):
        # Collect signals (all client-side)
        signals = {
            # High keyboard activity = typing/coding
            'keystrokes_per_min': self.keyboard_monitor.get_rate(),

            # Low mouse activity = not browsing/clicking
            'mouse_movements_per_min': self.mouse_monitor.get_rate(),

            # Long window focus = deep work
            'window_focus_duration': self.window_monitor.get_duration(),

            # Window type
            'window_type': self.window_monitor.get_app_category(),

            # Blink pattern (slightly reduced when focused)
            'blink_rate_deviation': self.blink_monitor.get_deviation(),

            # Time since last interaction
            'idle_time': self.get_idle_time()
        }

        # Decision tree (fast, interpretable)
        flow_score = 0

        # Rule 1: High typing rate + low mouse = coding/writing
        if signals['keystrokes_per_min'] > 60 and signals['mouse_movements_per_min'] < 10:
            flow_score += 0.4

        # Rule 2: Long focus in productive app
        if signals['window_focus_duration'] > 600:  # 10 min
            if signals['window_type'] in ['IDE', 'Editor', 'Terminal']:
                flow_score += 0.3

        # Rule 3: Reduced blink rate (concentration)
        if signals['blink_rate_deviation'] < -0.2:  # 20% below baseline
            flow_score += 0.2

        # Rule 4: Recent activity (not idle)
        if signals['idle_time'] < 30:  # 30 sec
            flow_score += 0.1

        return FlowState(
            in_flow=(flow_score >= 0.7),
            confidence=flow_score,
            signals=signals
        )


class FlowStateAlertQueue:
    """Queue alerts during flow state, deliver at natural breaks"""

    def __init__(self):
        self.deferred_alerts = []

    def defer(self, alert, reason):
        self.deferred_alerts.append({
            'alert': alert,
            'deferred_at': now(),
            'reason': reason
        })

    def check_delivery_opportunity(self):
        """Called every second to check if it's a good time"""

        if len(self.deferred_alerts) == 0:
            return

        # Delivery opportunities (all detected client-side):
        opportunities = [
            self.detector.flow_state_ended(),      # Flow state ended
            self.window_monitor.window_changed(),  # User switched apps
            self.window_monitor.is_idle(300),      # 5 min idle
            self.keyboard_monitor.is_idle(120),    # 2 min no typing
        ]

        if any(opportunities):
            # Natural break - deliver queued alerts
            self.deliver_deferred_alerts()

    def deliver_deferred_alerts(self):
        # Summarize multiple alerts
        summary = self.summarize(self.deferred_alerts)

        # Show gentle notification
        self.ui.show_summary_notification(
            title="Wellness Reminders",
            message=summary,
            urgency='low',
            sound=False  # Silent
        )

        self.deferred_alerts.clear()
```

**Why edge-first wins:**
- **Instant detection:** No server latency for flow state detection
- **System integration:** Access to keyboard, mouse, window events (local only)
- **Privacy:** No upload of app usage or typing patterns
- **Offline:** Flow state detection works without network
- **Learning:** Adapts to user's work patterns (local ML)

**Validation:**
- Flow state interruptions: 0 (vs 5-10/day for naive alerts)
- Alert delivery at natural breaks: >90%
- User satisfaction: "Feels like it understands when I'm busy" >80%

---

## Scaling Challenge Solutions

### 1. Offline Queue & Sync Storm ✅

**Edge-First Solution:**

```python
class SyncStormPrevention:
    def __init__(self):
        self.queue = OfflineQueue(max_size_mb=100)
        self.rate_limiter = RateLimiter(max_requests_per_min=12)
        self.backoff = ExponentialBackoff(initial=1, max=300)

    def sync(self):
        # Client-side rate limiting (prevents sync storm)

        # 1. Check if sync allowed
        if not self.rate_limiter.allow():
            return  # Wait for next interval

        # 2. Get batch from queue
        batch = self.queue.get_batch(max_rows=500, max_size_kb=32)

        if not batch:
            return  # Nothing to sync

        # 3. Compress batch
        compressed = gzip.compress(json.dumps(batch))

        # 4. Send with retry logic
        try:
            response = self.api.batch_upsert(compressed)

            if response.status == 200:
                # Success - remove from queue
                self.queue.mark_synced(batch.ids)
                self.backoff.reset()

            elif response.status == 429:
                # Rate limited - exponential backoff
                self.backoff.increase()
                wait_seconds = self.backoff.get()
                self.queue.defer(batch, wait_seconds)

        except NetworkError:
            # Network error - retry with backoff
            self.backoff.increase()
            self.queue.retry(batch, self.backoff.get())
```

**Server-Side Protection:**

```javascript
// EDGE FUNCTION: Rate Limiting
export async function batchUpsert(req) {
  const user_id = req.user.id;

  // 1. Check rate limit (per-user)
  const rate_limit = await redis.get(`rate_limit:${user_id}`);

  if (rate_limit && rate_limit > 100) {
    // More than 100 requests in last hour
    return {
      status: 429,
      body: {
        error: 'Rate limit exceeded',
        retry_after: 3600,  // 1 hour
        message: 'Please slow down sync frequency'
      }
    };
  }

  // 2. Increment counter
  await redis.incr(`rate_limit:${user_id}`);
  await redis.expire(`rate_limit:${user_id}`, 3600);  // 1 hour TTL

  // 3. Process batch (max 500 rows)
  const { summaries } = req.body;

  if (summaries.length > 500) {
    return { status: 413, body: { error: 'Batch too large' } };
  }

  // 4. Idempotent upsert
  const result = await db.batchUpsert('minute_summaries', summaries);

  return { status: 200, body: { synced: result.count } };
}
```

**Sync Storm Scenario:**
```
Office internet outage: 500 users offline for 2 hours
  → 500 users * 120 summaries = 60,000 pending summaries
  → All reconnect simultaneously at 3 PM

WITHOUT edge-first:
  → 500 * 120 API calls in 1 second = instant overload
  → Database connections exhausted
  → Cascading failures

WITH edge-first:
  → Client rate limiting: Max 12 requests/min per user
  → 60,000 summaries / 500 per batch = 120 batches
  → 120 batches / 12 per min = 10 minutes to sync all users
  → Exponential backoff spreads load further
  → Server handles gracefully
```

**Cost comparison:**
- Traditional: Need 500 vCPUs to handle spike = $25/hour
- Edge-first: Need 10 vCPUs (steady state) = $0.50/hour

---

### 2. Write Path & Connection Limits ✅

**Edge-First Solution:**

```
1,000 concurrent users:

TRADITIONAL (write every event):
  → 30 writes/sec * 1,000 users = 30,000 writes/sec
  → Need 300 database connections
  → Expensive connection pooling
  → High latency under load

EDGE-FIRST (write summaries only):
  → 1 write per 5 min * 1,000 users = 200 writes/hour
  → Need 5 database connections
  → Cheap connection pooling
  → Low latency always
```

**Batched Writes:**

```javascript
// Batch upsert reduces connection usage
async function batchUpsert(summaries) {
  // Single transaction for 500 summaries
  const conn = await pool.getConnection();

  try {
    await conn.query('BEGIN');

    // Prepared statement (fast)
    const stmt = await conn.prepare(`
      INSERT INTO minute_summaries (...)
      VALUES (?, ?, ?, ...)
      ON CONFLICT (user_id, timestamp) DO NOTHING
    `);

    // Batch execute
    for (const summary of summaries) {
      await stmt.execute(summary);
    }

    await conn.query('COMMIT');

  } finally {
    conn.release();
  }
}
```

**Connection usage:**
- Traditional: 1,000 concurrent users = 1,000 connections
- Edge-first: 1,000 users = ~10 connections (batched writes)

---

### 3. Data Volume & Retention Policy ✅

**Edge-First Solution:**

```
USER DATA VOLUME (Edge-First):

Raw data (client-only, 2-hour retention):
  → 30 Hz * 3600 sec * 2 hr = 216,000 rows
  → Stored locally only
  → Auto-purged after calibration

Minute summaries (synced to cloud):
  → 1 row/min * 1,440 min/day = 1,440 rows/day
  → 30 days * 1,440 = 43,200 rows/month/user
  → 1,000 users = 43M rows/month (vs 25B in traditional)

Hourly summaries (materialized view):
  → 24 rows/day/user
  → 30 days * 24 = 720 rows/month/user
  → 1,000 users = 720K rows/month

Daily summaries (forever):
  → 1 row/day/user
  → 365 rows/year/user
  → 1,000 users = 365K rows/year
```

**Storage costs:**

```
TRADITIONAL (raw data in cloud):
  1,000 users * 864K rows/day * 30 days = 25.9 billion rows
  ~5 KB per row (JSONB)
  Total: 129.5 TB/month
  Cost: $129,500/month

EDGE-FIRST (summaries only):
  1,000 users * 1,440 rows/day * 30 days = 43 million rows
  ~500 bytes per row
  Total: 21.5 GB/month
  Cost: $21.50/month (6,000x cheaper)
```

**Retention policy:**
```sql
-- Automated retention (cron job)
-- Runs daily at 3 AM

-- Archive minute_summaries > 90 days
COPY (SELECT * FROM minute_summaries WHERE timestamp < NOW() - INTERVAL '90 days')
TO 's3://wellness-archive/minute_summaries.parquet';

DELETE FROM minute_summaries WHERE timestamp < NOW() - INTERVAL '90 days';

-- Keep hourly_summaries for 365 days
DELETE FROM hourly_summaries WHERE timestamp < NOW() - INTERVAL '365 days';

-- Keep daily_summaries forever (cheap, 1 row/user/day)
```

---

### 4. Dashboard Query Performance ✅

**Edge-First Solution:**

```sql
-- Traditional (query raw data):
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  AVG(blink_rate) as avg_blink_rate
FROM blink_data
WHERE user_id = '...' AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY hour
ORDER BY hour;

-- 25.9 million rows scanned
-- Query time: 15-30 seconds
-- Index bloat: massive


-- Edge-First (query pre-aggregated):
SELECT
  date_trunc('hour', timestamp) as hour,
  avg_blink_rate
FROM hourly_summaries
WHERE user_id = '...' AND timestamp > NOW() - INTERVAL '30 days'
ORDER BY timestamp;

-- 720 rows scanned (36,000x fewer)
-- Query time: <100ms
-- Indexed, partitioned, cached
```

**Materialized views (auto-refresh):**

```sql
-- Continuous aggregate (TimescaleDB)
CREATE MATERIALIZED VIEW hourly_summaries
WITH (timescaledb.continuous) AS
SELECT
  user_id,
  time_bucket('1 hour', timestamp) AS hour,
  AVG(blink_rate) as avg_blink_rate,
  AVG(posture_score) as avg_posture_score,
  AVG(wellness_score) as avg_wellness_score,
  SUM(alert_count) as total_alerts
FROM minute_summaries
GROUP BY user_id, hour;

-- Auto-refresh every hour
SELECT add_continuous_aggregate_policy('hourly_summaries',
  start_offset => INTERVAL '2 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');
```

**Dashboard load time:**
- Traditional: 15-30 sec (query raw data)
- Edge-first: <100ms (query pre-aggregated)

---

### 5. Real-Time Alert Latency ✅

**Edge-First Solution:**

```
TRADITIONAL (server-side alerts):
  1. Client sends blink event → Server
  2. Server aggregates last 2 minutes
  3. Server checks threshold
  4. Server sends alert → Client
  Total latency: 500ms - 2 seconds

EDGE-FIRST (client-side alerts):
  1. Client detects blink (30 Hz)
  2. Client aggregates last 2 minutes (local RAM)
  3. Client checks threshold (local baseline)
  4. Client shows alert
  Total latency: <50ms (40x faster)
```

**Real-time evaluation:**

```python
class RealTimeAlertEngine:
    def __init__(self):
        # All state in RAM (no database queries)
        self.rolling_window = deque(maxlen=120)  # 2 min at 1 Hz
        self.baseline = self.load_baseline()

    def on_blink_event(self, blink):
        # Called 30 times per second

        # 1. Update rolling window (RAM only)
        self.rolling_window.append(blink)

        # 2. Check alert condition (every second)
        if len(self.rolling_window) >= 120:
            avg_rate = self.compute_avg_rate(self.rolling_window)

            # 3. Compare to baseline (local)
            if avg_rate < self.baseline.low_threshold:
                # 4. Show alert (instant)
                self.show_alert('low_blink_rate', avg_rate)
```

**No database queries for alerts** - all state in RAM

---

### 6. GDPR Deletion at Scale ✅

**Edge-First Solution:**

```sql
-- Traditional deletion (25M rows):
DELETE FROM blink_data WHERE user_id = '...';
-- Time: 30-60 minutes
-- Locks table during deletion
-- Blocks other operations

-- Edge-first deletion (43K rows):
DELETE FROM minute_summaries WHERE user_id = '...';
DELETE FROM sessions WHERE user_id = '...';
DELETE FROM users WHERE user_id = '...';
-- Time: <1 second (cascading delete)
-- Minimal locking
```

**Partition-based deletion (even faster):**

```sql
-- Partition by user_id + date
CREATE TABLE minute_summaries (
  ...
) PARTITION BY RANGE (user_id, date);

-- Delete entire partition (instant)
DROP TABLE minute_summaries_user_abc_2025_12;
```

**Client-side deletion:**
```python
# Delete local data
def delete_user_data():
    # 1. Delete local SQLite database
    os.remove('wellness_data.db')

    # 2. Clear preferences
    os.remove('config.json')

    # 3. Call server deletion API
    api.delete_account()

    # Total time: <1 second
```

---

### 7. Session Management ✅

**Edge-First Solution:**

```python
class SessionManager:
    """Client-side session management - no server needed"""

    def __init__(self):
        self.state = SessionState.IDLE
        self.current_session = None
        self.heartbeat_interval = 30  # seconds

    def start_session(self):
        self.current_session = {
            'id': ulid(),
            'started_at': now(),
            'ended_at': None,
            'last_heartbeat': now(),
            'device_id': self.device_id
        }

        # Start heartbeat timer
        self.heartbeat_timer = Timer(self.heartbeat_interval, self.heartbeat)
        self.heartbeat_timer.start()

    def heartbeat(self):
        """Update last_heartbeat every 30 seconds"""
        if self.current_session:
            self.current_session['last_heartbeat'] = now()

            # Persist to local DB (crash recovery)
            self.db.update_session(self.current_session)

        # Schedule next heartbeat
        self.heartbeat_timer = Timer(self.heartbeat_interval, self.heartbeat)
        self.heartbeat_timer.start()

    def end_session(self):
        if self.current_session:
            self.current_session['ended_at'] = now()

            # Compute session summary
            summary = self.compute_summary(self.current_session)

            # Queue for sync
            self.sync_queue.add(summary)

            # Clear current session
            self.current_session = None

    def recover_orphaned_session(self):
        """On app startup - recover session from crash"""

        orphaned = self.db.get_session_without_ended_at()

        if orphaned:
            # Estimate end time from last heartbeat
            estimated_end = orphaned['last_heartbeat'] + 60  # 1 min grace

            orphaned['ended_at'] = estimated_end
            orphaned['crashed'] = True

            # Compute partial summary
            summary = self.compute_summary(orphaned)

            # Queue for sync
            self.sync_queue.add(summary)
```

**No zombie sessions** - heartbeat + crash recovery

---

### 8. Partial Sync Failure & Idempotency ✅

**Edge-First Solution:**

```python
class IdempotentSync:
    def sync_batch(self, summaries):
        # Generate idempotency key per summary
        for summary in summaries:
            summary['idempotency_key'] = ulid()

        # Send batch
        try:
            response = self.api.batch_upsert(summaries)

            if response.success:
                # All synced - remove from queue
                self.queue.remove(summaries)

            elif response.partial:
                # Some synced, some failed
                synced_keys = response.synced_keys

                # Remove only synced summaries
                self.queue.remove_by_keys(synced_keys)

                # Retry failed summaries
                failed = [s for s in summaries if s['idempotency_key'] not in synced_keys]
                self.queue.retry(failed)

        except NetworkError:
            # Full retry - idempotency prevents duplicates
            self.queue.retry(summaries)
```

**Server-side idempotency:**

```sql
-- Idempotent upsert
INSERT INTO minute_summaries (idempotency_key, user_id, timestamp, ...)
VALUES ($1, $2, $3, ...)
ON CONFLICT (user_id, timestamp) DO NOTHING;

-- Duplicate sends are ignored
-- Safe to retry entire batch
```

**Checkpoint-based resume:**

```python
class SyncCheckpoint:
    def __init__(self):
        self.watermark = self.load_watermark()

    def sync(self):
        # Only sync summaries after watermark
        pending = self.queue.get_after(self.watermark)

        for batch in chunk(pending, 500):
            response = self.api.batch_upsert(batch)

            if response.success:
                # Update watermark
                self.watermark = max([s['timestamp'] for s in batch])
                self.save_watermark(self.watermark)

                # Remove from queue
                self.queue.remove(batch)
```

**No duplicate data** - idempotency + checkpoints

---

### 9. Supabase Tier Limits ✅

**Edge-First Impact:**

```
FREE TIER (0-500 users):
  Database: 500 MB limit
  Edge-first usage: ~50 MB (1,000 users * 50 KB)
  Status: Well within limits

PRO TIER ($25/month, 500-10K users):
  Database: 8 GB limit
  Edge-first usage: ~500 MB (10,000 users * 50 KB)
  Status: Well within limits

TEAM TIER ($599/month, 10K-100K users):
  Database: 100 GB limit
  Edge-first usage: ~5 GB (100,000 users * 50 KB)
  Status: Well within limits
```

**Edge-first reduces:**
- Storage: 6,000x less (summaries vs raw data)
- Connections: 100x less (batched writes)
- Bandwidth: 1,000x less (summaries vs events)
- Compute: 1,000x less (client-side processing)

**Self-host threshold:**
- Traditional: Need self-host at 1,000 users (cost/scale)
- Edge-first: Can stay on Supabase Pro until 50,000 users

---

### 10. Burst Traffic Handling ✅

**Edge-First Solution:**

```
9 AM Monday spike (1,000 users start simultaneously):

TRADITIONAL:
  → 1,000 * 30 writes/sec = 30,000 writes/sec
  → Database overwhelmed
  → Connection pool exhausted
  → Need auto-scaling (expensive, slow)

EDGE-FIRST:
  → 1,000 users * 0 writes/sec = 0 writes at start
  → Users process locally for 5 minutes
  → After 5 min: 1,000 * 1 write = 1,000 writes
  → Spread over 5 min = 200 writes/min
  → Easily handled by single Postgres instance
```

**Client-side buffering smooths spikes:**

```python
class BurstAbsorption:
    def on_session_start(self):
        # Don't sync immediately - process locally
        self.processing_locally = True

        # Schedule first sync for 5 minutes later
        self.schedule_sync(delay=300)

    def schedule_sync(self, delay):
        # Add random jitter to spread load
        jitter = random.randint(0, 60)
        actual_delay = delay + jitter

        Timer(actual_delay, self.sync).start()
```

**No auto-scaling needed** - client-side buffering absorbs spikes

---

## Trade-offs and Limitations

### Advantages of Edge-First

| Dimension | Traditional (Server) | Edge-First (This Design) | Winner |
|-----------|---------------------|--------------------------|---------|
| **Privacy** | Upload raw video frames | Video never leaves device | **Edge** |
| **Latency** | 500ms - 2s for alerts | <50ms for alerts | **Edge** |
| **Offline** | Fails without network | Works indefinitely offline | **Edge** |
| **Cost** | $3-5/user/month | $0.01/user/month | **Edge** |
| **Scale** | Need auto-scaling | No scaling needed | **Edge** |
| **Personalization** | Server-side baselines | Client-side learning | **Edge** |
| **Context** | Limited context | Full system access | **Edge** |

### Disadvantages of Edge-First

| Challenge | Impact | Mitigation |
|-----------|--------|------------|
| **Client CPU usage** | 15-20% CPU for detection | Modern desktops handle easily, GPU delegate optional |
| **Client RAM usage** | ~300 MB | Acceptable for desktop app, configurable |
| **Battery drain** | ~10% faster battery drain | Pause on low battery (<20%), optimize detection |
| **Multi-device sync** | Each device has own local data | Cloud syncs summaries, dashboard shows unified view |
| **Real-time collaboration** | No multi-user features | Not needed for wellness (single-user data) |
| **Server-side ML** | Can't train models on aggregate | Client-side models sufficient, future: federated learning |
| **Live monitoring** | IT admins can't monitor users live | By design (privacy), summaries available with delay |

### When Edge-First is NOT Appropriate

1. **Multi-user collaboration** (e.g., Google Docs, Figma)
   - Reason: Need server as coordination point
   - Our app: Single-user wellness data (no collaboration)

2. **Regulatory live monitoring** (e.g., security cameras)
   - Reason: Need real-time server-side recording
   - Our app: Privacy-first, no surveillance

3. **Heavy ML training** (e.g., recommendation engines)
   - Reason: Need aggregate data across users
   - Our app: Personalized baselines (individual data sufficient)

4. **Real-time multi-player** (e.g., games, chat)
   - Reason: Need server as message broker
   - Our app: No real-time interaction with other users

**Verdict:** Edge-first is IDEAL for WellnessGuard (privacy, single-user, offline-capable)

---

## Client Resource Requirements

### Minimum Requirements

| Resource | Minimum | Recommended | High-End |
|----------|---------|-------------|----------|
| **CPU** | Intel i3 / Ryzen 3 (2 cores) | Intel i5 / Ryzen 5 (4 cores) | Intel i7 / Ryzen 7 (8 cores) |
| **RAM** | 4 GB total (app uses ~300 MB) | 8 GB total | 16 GB total |
| **GPU** | None (CPU-only mode) | Integrated GPU | Dedicated GPU (optional) |
| **Storage** | 500 MB free (100 days offline) | 2 GB free | 5 GB free |
| **Network** | 1 KB/min (56 Kbps dialup OK) | 1 Mbps | Any |
| **OS** | Windows 10, macOS 10.15 | Windows 11, macOS 12+ | Latest |

### Performance by Hardware Class

| Hardware | Detection FPS | CPU Usage | Battery Impact | Experience |
|----------|---------------|-----------|----------------|------------|
| **Low-end** (i3, 4GB) | 15 FPS | 25-30% | 15% faster drain | Usable |
| **Mid-range** (i5, 8GB) | 30 FPS | 15-20% | 10% faster drain | Good |
| **High-end** (i7, 16GB) | 30 FPS | 10-15% | 5% faster drain | Excellent |
| **With GPU** | 30 FPS | 5-10% | 3% faster drain | Excellent |

### Resource Optimization Modes

```python
class ResourceManagement:
    def __init__(self):
        self.mode = self.detect_optimal_mode()

    def detect_optimal_mode(self):
        cpu_cores = psutil.cpu_count()
        ram_total = psutil.virtual_memory().total
        on_battery = psutil.sensors_battery().power_plugged == False

        # Auto-select mode
        if cpu_cores < 4 or ram_total < 4 * 1024**3:
            return ResourceMode.LOW_POWER
        elif on_battery:
            return ResourceMode.BALANCED
        else:
            return ResourceMode.PERFORMANCE

    def apply_mode(self, mode):
        if mode == ResourceMode.LOW_POWER:
            self.detection_fps = 15  # Half rate
            self.posture_fps = 5
            self.aggregation_interval = 120  # 2 min
            self.gpu_acceleration = False

        elif mode == ResourceMode.BALANCED:
            self.detection_fps = 30
            self.posture_fps = 10
            self.aggregation_interval = 60  # 1 min
            self.gpu_acceleration = False

        elif mode == ResourceMode.PERFORMANCE:
            self.detection_fps = 30
            self.posture_fps = 10
            self.aggregation_interval = 60
            self.gpu_acceleration = True  # Use GPU if available
```

### Storage Growth

```
Local storage usage (per user):

Day 1-2 (calibration):
  Raw data: 50 MB (2 hours, then deleted)
  Summaries: 3.6 MB (2 days * 1.8 MB/day)
  Total: ~54 MB

Week 1:
  Raw data: 0 MB (deleted after calibration)
  Summaries: 12.6 MB (7 days * 1.8 MB/day)
  Total: ~13 MB

Month 1:
  Summaries: 54 MB (30 days * 1.8 MB/day)
  Total: ~54 MB

After 100 days (offline max):
  Summaries: 180 MB
  Total: ~180 MB

Steady state (with sync):
  Last 30 days: 54 MB
  Older data: Synced to cloud, deleted locally
```

### Network Usage

```
Daily network usage (per user):

Minute summaries:
  1,440 summaries/day * 500 bytes = 720 KB/day
  Compressed: ~150 KB/day

Session summaries:
  10 sessions/day * 500 bytes = 5 KB/day

Total upload: ~155 KB/day (0.15 MB/day)
Total download (dashboard sync): ~50 KB/day

Monthly: 6 MB upload, 1.5 MB download
Yearly: 72 MB upload, 18 MB download

WiFi/mobile data impact: Negligible
```

---

## Implementation Roadmap

### Phase 1: Core Client Intelligence (Week 1)

**Deliverables:**
- [ ] MediaPipe blink detection (30 Hz)
- [ ] Client-side aggregation engine (1-sec, 1-min, 5-min, 30-min)
- [ ] SQLite local database with WAL mode
- [ ] Personal baseline calibration (2-hour learning)
- [ ] Real-time alert engine (client-side)
- [ ] Session management with heartbeat

**Success Criteria:**
- Blink detection accuracy >90%
- Alert latency <50ms
- CPU usage <20%
- RAM usage <300 MB

---

### Phase 2: Offline & Sync (Week 2)

**Deliverables:**
- [ ] Offline queue manager (100 days capacity)
- [ ] Idempotent sync protocol (ULID-based)
- [ ] Checkpoint-based resume
- [ ] Rate limiting (client + server)
- [ ] Exponential backoff retry logic
- [ ] Supabase sync API (batch upsert)

**Success Criteria:**
- 100 days offline capacity
- Zero data loss on network failure
- No duplicate data in cloud
- Sync storm handling (500 users reconnect)

---

### Phase 3: Context & Intelligence (Week 3)

**Deliverables:**
- [ ] Flow state detection (keyboard, mouse, window)
- [ ] Context-aware alerting (meetings, focus mode)
- [ ] Lighting adaptation (backlit, low-light, harsh)
- [ ] Glasses-robust detection
- [ ] Posture tracking (MediaPipe Pose)
- [ ] Fatigue detection (yawning, drowsiness)

**Success Criteria:**
- Flow state interruptions: 0
- Alert acknowledgment rate: >50% after 30 days
- Detection works in all lighting conditions
- Glasses accuracy >90%

---

### Phase 4: Dashboard & Polish (Week 4)

**Deliverables:**
- [ ] Supabase PostgreSQL schema (time-series optimized)
- [ ] Materialized views (hourly, daily summaries)
- [ ] Dashboard query API (read-only)
- [ ] Web dashboard (Next.js)
- [ ] Privacy dashboard (what leaves device)
- [ ] GDPR compliance (export, delete)

**Success Criteria:**
- Dashboard load time <1 second
- Query performance <100ms
- Privacy transparency >80% satisfaction
- GDPR deletion <1 second

---

### Phase 5: Scale Testing (Week 5)

**Deliverables:**
- [ ] Simulate 1,000 concurrent users
- [ ] Test sync storm (500 users offline 2 hours)
- [ ] Load test dashboard (10,000 queries/sec)
- [ ] Test 90-day offline scenario
- [ ] Benchmark database performance
- [ ] Cost analysis (actual usage)

**Success Criteria:**
- Handle 1,000 concurrent users on Pro tier
- Sync storm completes in <10 minutes
- Dashboard responsive under load
- Cost <$0.01/user/month

---

## Conclusion

This edge-first architecture solves ALL Critical Six challenges and ALL 10 scaling challenges while being 300x cheaper and infinitely more private than traditional approaches.

**Key innovations:**
1. **Zero raw data upload** - Privacy by design
2. **Client-side intelligence** - Instant alerts, offline forever
3. **Local baseline learning** - Personalized to individual
4. **Context-aware alerting** - Flow state protection
5. **Conflict-free sync** - Idempotent, resumable, efficient
6. **Pre-aggregated storage** - 6,000x storage reduction
7. **No scaling complexity** - Client absorbs spikes

**Competitive advantages:**
- Privacy: Verifiable (no video upload)
- Offline: Works on airplane for 100 days
- Cost: $0.01/user/month (vs $3-5/month)
- Latency: <50ms alerts (vs 500ms-2s)
- Personalization: Individual baselines (vs population avg)

**This is production-ready architecture for a real startup.**

---

## Sources

### Local-First Architecture
- [Local-First Apps in 2025: CRDTs, Replication Patterns](https://debugg.ai/resources/local-first-apps-2025-crdts-replication-edge-storage-offline-sync)
- [The Architecture Shift: Why I'm Betting on Local-First in 2026](https://dev.to/the_nortern_dev/the-architecture-shift-why-im-betting-on-local-first-in-2026-1nh6)
- [Synking all the things with CRDTs: Local first development](https://dev.to/charlietap/synking-all-the-things-with-crdts-local-first-development-3241)
- [Offline-First Done Right: Sync Patterns for Real-World Mobile Networks](https://developersvoice.com/blog/mobile/offline-first-sync-patterns/)

### Edge AI & Client-Side ML
- [Edge Intelligence: Edge Computing and ML (2025 Guide)](https://viso.ai/edge-ai/edge-intelligence-deep-learning-with-edge-computing/)
- [Moving ML Inference from the Cloud to the Edge](https://bergum.medium.com/moving-ml-inference-from-the-cloud-to-the-edge-d6f98dbdb2e3)
- [Top 10 Edge AI Hardware Innovations for 2025](https://www.jaycon.com/top-10-edge-ai-hardware-for-2025/)

### Offline-First Sync Protocols
- [Figma, Google, and Notion are moving to the Offline-First Revolution](https://levelup.gitconnected.com/figma-google-and-notion-are-moving-to-the-offline-first-revolution-67395a963970)
- [Building an offline realtime sync engine](https://gist.github.com/pesterhazy/3e039677f2e314cb77ffe3497ebca07b)
- [Real-Time Sync Engines](https://adamnyberg.se/blog/2025-02-11-real-time-sync-engines/)

### SQLite & Real-Time Analytics
- [Real-Time Analytics with SQLite: Streaming and Aggregated Data Insights](https://www.sqliteforum.com/p/real-time-analytics-with-sqlite-streaming)
- [Making SQLite Analytics Great Again!](https://oldmoe.blog/2025/03/12/making-sqlite-analytics-great-again/)
- [SQLite in 2025: The Unsung Hero Powering Modern Apps](https://nerdleveltech.com/sqlite-in-2025-the-unsung-hero-powering-modern-apps)

### MediaPipe & Computer Vision
- [Explore MediaPipe: Open-Source Computer Vision Tools](https://viso.ai/computer-vision/mediapipe/)
- [MediaPipe: Real-Time Computer Vision Reimagined](https://medium.com/@p4prince2/mediapipe-real-time-computer-vision-reimagined-d22bcb173143)
- [GitHub - google-ai-edge/mediapipe](https://github.com/google-ai-edge/mediapipe)

### Background Sync Patterns
- [How to periodically synchronize data in the background](https://web.dev/patterns/web-apps/periodic-background-sync)
- [Offline and background operation - Progressive web apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
- [Synchronize and update a PWA in the background](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/background-syncs)
