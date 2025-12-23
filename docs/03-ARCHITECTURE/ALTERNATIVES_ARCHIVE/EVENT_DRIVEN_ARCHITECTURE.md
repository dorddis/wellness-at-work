# WellnessGuard: Event-Driven Streaming Architecture

**Philosophy:** Events are the source of truth. Stream everything. Process in real-time.

---

## Executive Summary

This architecture proposal transforms WellnessGuard from a traditional CRUD application into a high-performance, event-sourced streaming system. By treating all wellness data (blinks, posture, fatigue) as immutable event streams, we achieve:

1. **Real-time responsiveness** - Sub-second alert latency through in-memory stream processing
2. **Unlimited scale** - Horizontal scaling via event partitioning and CQRS
3. **Perfect offline sync** - Event logs naturally handle disconnection/reconnection
4. **Complete audit trail** - Event sourcing provides GDPR compliance and debugging capabilities
5. **Smart alert prevention** - Complex Event Processing (CEP) eliminates alert fatigue

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DESKTOP CLIENT (Electron/Tauri)                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐   ┌─────────────────┐   ┌────────────────────┐  │
│  │ Detection Engine │──▶│  Event Producer │──▶│ Local Event Store  │  │
│  │ - Blink (30Hz)   │   │  (In-Memory)    │   │   (SQLite + WAL)   │  │
│  │ - Posture (10Hz) │   │                 │   │                    │  │
│  │ - Fatigue (5Hz)  │   │                 │   │ - Offline queue    │  │
│  └──────────────────┘   └─────────────────┘   │ - Append-only log  │  │
│                                                │ - Max 7 days       │  │
│  ┌──────────────────────────────────────────┐ └────────────────────┘  │
│  │      Local Stream Processor (CEP)         │          │             │
│  │  - Sliding window aggregations (1m, 5m)   │          │             │
│  │  - Flow state detection                   │          │             │
│  │  - Alert rule evaluation                  │          │             │
│  │  - Baseline calibration                   │          │             │
│  └──────────────────────────────────────────┘          │             │
│           │                                             │             │
│           │ (Immediate UI updates)                      │             │
│           ▼                                             │             │
│  ┌──────────────────┐                                   │             │
│  │   UI State       │                                   │             │
│  │ (Zustand/Recoil) │                                   │             │
│  └──────────────────┘                                   │             │
│                                                          │             │
└──────────────────────────────────────────────────────────┼─────────────┘
                                                           │
                        WebSocket (bidirectional)         │
                        + Batch HTTP (sync backlog)       │
                                                           │
┌──────────────────────────────────────────────────────────┼─────────────┐
│                            CLOUD (EDGE LAYER)            │             │
├──────────────────────────────────────────────────────────┴─────────────┤
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                    API Gateway (Cloudflare Workers)             │   │
│  │  - WebSocket handler (Durable Objects)                          │   │
│  │  - Auth validation (JWT)                                        │   │
│  │  - Rate limiting (per user)                                     │   │
│  │  - Event validation & enrichment                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────────┐
│                     EVENT STREAMING BACKBONE                        │   │
├──────────────────────────────┼──────────────────────────────────────────┤
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    REDIS STREAMS (Upstash)                       │  │
│  │                                                                  │  │
│  │  Stream: wellness-events-{user_id}                              │  │
│  │  ├─ blink-events      (30 events/sec, 1hr retention)            │  │
│  │  ├─ posture-events    (10 events/sec, 1hr retention)            │  │
│  │  ├─ fatigue-events    (5 events/sec, 1hr retention)             │  │
│  │  ├─ session-events    (lifecycle events, 7d retention)           │  │
│  │  └─ alert-events      (user actions, 30d retention)             │  │
│  │                                                                  │  │
│  │  Consumer Groups:                                                │  │
│  │  ├─ persistence-group    (writes to PostgreSQL)                 │  │
│  │  ├─ aggregation-group    (computes rollups)                     │  │
│  │  ├─ alert-group          (CEP engine)                           │  │
│  │  └─ analytics-group      (ML pipeline)                          │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               │ (Fan-out to multiple consumers)
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐    ┌────────────────┐    ┌─────────────────┐
│  PERSISTENCE  │    │  AGGREGATION   │    │   CEP ENGINE    │
│   WORKER      │    │    WORKER      │    │  (Alert Logic)  │
├───────────────┤    ├────────────────┤    ├─────────────────┤
│               │    │                │    │                 │
│ Consumes from │    │ Sliding window │    │ Pattern match:  │
│ Redis Streams │    │ aggregations:  │    │ - Low blink 2m  │
│               │    │ - 1min avg     │    │ - Slouch 3m     │
│ Batches 1000  │    │ - 5min avg     │    │ - Fatigue 10m   │
│ events        │    │ - 1hr avg      │    │ - Long session  │
│               │    │ - 1day avg     │    │                 │
│ Upserts to    │    │                │    │ Flow state:     │
│ TimescaleDB   │    │ Writes to:     │    │ - Typing speed  │
│ (hypertable)  │    │ - Redis (cache)│    │ - Mouse idle    │
│               │    │ - Postgres     │    │ - Calendar busy │
│               │    │   (rollups tbl)│    │                 │
│ Idempotent    │    │                │    │ Alert cooldown  │
│ via event_id  │    │ Tumbling       │    │ suppression     │
│               │    │ windows for    │    │                 │
│               │    │ dashboard      │    │ Publishes:      │
│               │    │                │    │ - alert-events  │
│               │    │                │    │ - to WebSocket  │
└───────────────┘    └────────────────┘    └─────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                        QUERY SIDE (CQRS)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │               SUPABASE POSTGRESQL (TimescaleDB)                 │   │
│  │                                                                 │   │
│  │  ┌─────────────────────────────────────────────────────────┐  │   │
│  │  │  Raw Events (Hypertable, partitioned by time)           │  │   │
│  │  │  - user_id, event_id, event_type, timestamp, payload    │  │   │
│  │  │  - Retention: 7 days (configurable per user tier)       │  │   │
│  │  │  - Compressed after 24 hours                            │  │   │
│  │  │  - Auto-partitioned by day                              │  │   │
│  │  └─────────────────────────────────────────────────────────┘  │   │
│  │                                                                 │   │
│  │  ┌─────────────────────────────────────────────────────────┐  │   │
│  │  │  Aggregated Rollups (Regular tables)                    │  │   │
│  │  │  - 1min_stats  (user_id, timestamp, blink_avg, ...)     │  │   │
│  │  │  - 5min_stats  (retention: 30 days)                     │  │   │
│  │  │  - 1hr_stats   (retention: 6 months)                    │  │   │
│  │  │  - 1day_stats  (retention: 2 years)                     │  │   │
│  │  │  - Indexed by (user_id, timestamp DESC)                 │  │   │
│  │  └─────────────────────────────────────────────────────────┘  │   │
│  │                                                                 │   │
│  │  ┌─────────────────────────────────────────────────────────┐  │   │
│  │  │  Session Summaries                                       │  │   │
│  │  │  - session_id, user_id, started_at, ended_at            │  │   │
│  │  │  - wellness_score, total_blinks, avg_posture_score      │  │   │
│  │  │  - Materialized on session close                        │  │   │
│  │  └─────────────────────────────────────────────────────────┘  │   │
│  │                                                                 │   │
│  │  ┌─────────────────────────────────────────────────────────┐  │   │
│  │  │  User Baselines (ML-computed)                            │  │   │
│  │  │  - user_id, metric, baseline_value, computed_at         │  │   │
│  │  │  - Updated every 24 hours by analytics worker           │  │   │
│  │  └─────────────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │               REDIS (Upstash) - Hot Cache Layer                 │   │
│  │                                                                 │   │
│  │  - Current session state (user:{id}:session)                   │   │
│  │  - Latest 1min aggregates (user:{id}:latest)                   │   │
│  │  - Alert cooldown timestamps (user:{id}:cooldowns)             │   │
│  │  - Flow state indicators (user:{id}:flow)                      │   │
│  │  - TTL: 1 hour for session data, 5min for aggregates          │   │
│  └────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                         WEB DASHBOARD (Next.js)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Query Pattern: ALWAYS read from pre-aggregated rollups                │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Real-time view (last 1 hour)                                   │   │
│  │  ├─ Fetch from Redis cache (1min rollups)                       │   │
│  │  └─ Fall back to 1min_stats table if cache miss                 │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Historical view (last 7 days)                                  │   │
│  │  └─ Query 1hr_stats table (168 data points max)                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Long-term trends (30 days to 6 months)                         │   │
│  │  └─ Query 1day_stats table (180 data points max)               │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Live session (WebSocket)                                       │   │
│  │  ├─ Subscribe to user's alert stream                            │   │
│  │  └─ Receive wellness score updates every 60s                    │   │
│  └────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Event Schema Design

### Core Event Structure

All events follow a consistent envelope format:

```typescript
interface WellnessEvent {
  event_id: string;          // UUID v7 (time-sortable)
  user_id: string;           // Partition key
  session_id: string;        // Correlation ID
  event_type: string;        // Event discriminator
  timestamp: number;         // Unix epoch milliseconds (client time)
  server_timestamp?: number; // Unix epoch milliseconds (server time, added on ingestion)
  client_version: string;    // For schema evolution
  payload: object;           // Event-specific data
}
```

### Event Types & Payloads

#### 1. Blink Events (30/sec)

```typescript
{
  event_type: "blink_detected",
  payload: {
    blink_count: 1,
    ear_value: 0.21,           // Eye Aspect Ratio
    duration_ms: 150,          // Blink duration
    confidence: 0.92,          // Detection confidence
    glasses_detected: boolean,
    lighting_condition: "normal" | "backlit" | "low" | "bright"
  }
}
```

#### 2. Posture Events (10/sec)

```typescript
{
  event_type: "posture_measured",
  payload: {
    head_position: { x: 0, y: 0, z: 450 },  // mm from camera
    head_angle: { pitch: -10, yaw: 5, roll: 0 },  // degrees
    shoulder_alignment: "level" | "left_drop" | "right_drop",
    posture_score: 85,         // 0-100
    is_slouching: false,
    is_forward_head: false,
    confidence: 0.88
  }
}
```

#### 3. Fatigue Events (5/sec)

```typescript
{
  event_type: "fatigue_assessed",
  payload: {
    drowsiness_score: 0.12,    // 0-1 scale
    slow_blink_count: 0,       // Past 30 seconds
    yawn_detected: false,
    eyes_closed_duration_ms: 0,
    fatigue_level: "alert" | "mild" | "moderate" | "severe"
  }
}
```

#### 4. Session Lifecycle Events

```typescript
// Session started
{
  event_type: "session_started",
  payload: {
    device_info: {
      os: "Windows 11",
      cpu_cores: 8,
      ram_gb: 16,
      screen_resolution: "1920x1080"
    },
    user_preferences: {
      blink_alert_threshold: 8,
      posture_alerts_enabled: true,
      break_interval_minutes: 30
    }
  }
}

// Session heartbeat (every 30 seconds)
{
  event_type: "session_heartbeat",
  payload: {
    cpu_usage_percent: 45,
    memory_usage_percent: 72,
    power_state: "plugged_in" | "battery",
    active_window_title: "cursor.exe" // Privacy: local only, not synced
  }
}

// Session ended (graceful)
{
  event_type: "session_ended",
  payload: {
    duration_seconds: 9240,
    total_blinks: 4620,
    total_alerts_shown: 8,
    total_alerts_dismissed: 6,
    reason: "user_quit" | "system_shutdown" | "timeout"
  }
}

// Session recovered (after crash)
{
  event_type: "session_recovered",
  payload: {
    crashed_at: 1703001234000,
    recovered_at: 1703002345000,
    events_queued_offline: 5432
  }
}
```

#### 5. Alert Events

```typescript
// Alert triggered (generated by CEP engine)
{
  event_type: "alert_triggered",
  payload: {
    alert_id: "uuid",
    alert_type: "low_blink_rate" | "poor_posture" | "fatigue" | "long_session",
    severity: "info" | "warning" | "critical",
    message: "Your blink rate is low. Take a moment to rest your eyes.",
    trigger_condition: "blink_rate < 8 for 2 minutes",
    cooldown_until: 1703001834000,  // Epoch ms
    context: {
      current_blink_rate: 6.2,
      baseline_blink_rate: 14.5,
      duration_minutes: 2.1
    }
  }
}

// User response
{
  event_type: "alert_dismissed" | "alert_snoozed" | "alert_actioned",
  payload: {
    alert_id: "uuid",
    user_action: "dismiss" | "snooze_10m" | "take_break",
    dismissed_at: 1703001234000
  }
}
```

#### 6. Flow State Events

```typescript
{
  event_type: "flow_state_detected",
  payload: {
    flow_state: "deep_work" | "shallow_work" | "idle" | "meeting",
    confidence: 0.87,
    indicators: {
      typing_speed_wpm: 85,        // Above baseline
      mouse_idle_seconds: 120,     // Minimal mouse movement
      calendar_busy: true,         // Integrated with calendar
      focus_app_active: true       // IDE, editor, design tool
    },
    suppress_alerts: true           // Do not disturb
  }
}
```

### Event Partitioning Strategy

**Redis Streams Partitioning:**
- Partition key: `user_id`
- Stream name: `wellness-events-{user_id}`
- Each user gets their own stream (supports 100K users easily)
- Sub-streams per event type for fine-grained retention

**Rationale:**
- Enables independent sync per user (no global bottleneck)
- Simplifies GDPR deletion (drop entire stream)
- Natural isolation (user A's offline backlog doesn't affect user B)

---

## How This Architecture Solves the Critical Six

### 1. Glasses Detection Failure

**Event-Driven Solution:**

Events carry detection confidence and lighting conditions as metadata. The CEP engine adapts alert thresholds based on these signals.

```typescript
// In CEP engine
if (event.payload.glasses_detected && event.payload.confidence < 0.7) {
  // Lower confidence threshold for blink detection
  applyGlassesCompensation();
}

if (event.payload.lighting_condition === "backlit") {
  // Increase tolerance for false positives
  adjustSensitivity(0.8);
}
```

**Benefit:** The system learns and adapts in real-time rather than failing silently. Event logs allow post-hoc debugging of detection issues.

---

### 2. Lighting Robustness

**Event-Driven Solution:**

Each event includes lighting condition metadata. Aggregation workers compute baseline metrics per lighting condition.

```sql
-- Separate baselines per lighting condition
SELECT
  user_id,
  lighting_condition,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY blink_rate) AS baseline_blink_rate
FROM blink_events
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY user_id, lighting_condition;
```

**Benefit:** Alerts adjust dynamically to lighting changes. "Low blink rate" threshold differs for backlit vs. well-lit conditions.

---

### 3. Alert Fatigue & Timing

**Event-Driven Solution (Complex Event Processing):**

The CEP engine implements sophisticated alert suppression based on:

1. **Temporal patterns** - No alerts within 10 minutes of previous similar alert
2. **Flow state detection** - Suppress all alerts during deep work
3. **Alert escalation** - Info → Warning → Critical based on event duration
4. **Consolidation** - Multiple low-level events → Single high-level alert

```typescript
// CEP Alert Rule (pseudo-code)
const lowBlinkPattern = CEP.pattern()
  .where(e => e.event_type === "blink_detected")
  .slidingWindow(2, TimeUnit.MINUTES)
  .aggregate(events => {
    const avgRate = computeBlinkRate(events);
    const baseline = getBaseline(e.user_id);
    return avgRate < baseline * 0.6; // 40% below baseline
  })
  .onMatch((context) => {
    // Check flow state
    if (isInFlowState(context.user_id)) {
      queueForLater(context);  // Defer until flow state ends
      return;
    }

    // Check cooldown
    if (isInCooldown(context.user_id, "low_blink_rate")) {
      return;  // Suppress
    }

    // Publish alert
    publishAlert({
      alert_type: "low_blink_rate",
      severity: determineSeverity(context),
      cooldown_minutes: 10
    });
  });
```

**Benefit:** Intelligent alert suppression eliminates fatigue while maintaining safety. Event history enables ML-based optimization over time.

---

### 4. Privacy/Surveillance Perception

**Event-Driven Solution:**

Events contain NO visual data. Only derived metrics (blink count, posture score) are streamed. Video processing happens entirely on-device.

```typescript
// What is NEVER sent:
❌ Camera frames
❌ Face embeddings
❌ Screen content
❌ Active window titles (only generic "focus_app" boolean)

// What IS sent:
✅ Blink count (integer)
✅ Posture score (0-100)
✅ Fatigue level (enum)
✅ Event timestamps
```

**Privacy features:**
- Local-only detection engine (all video stays on device)
- Event log encryption in transit (TLS 1.3)
- Event log encryption at rest (client-side encryption before SQLite write)
- User-controlled retention (7 days default, configurable down to 24 hours)
- Instant GDPR deletion (drop Redis stream + soft-delete PostgreSQL rows)

**Transparency:**
- Dashboard shows EXACTLY what events are being sent (live event viewer)
- Open-source client code
- Privacy policy generated from event schema (auto-documentation)

**Benefit:** Event-driven architecture makes privacy guarantees verifiable. Users can inspect event payloads and confirm no PII is transmitted.

---

### 5. Individual Baseline Calibration

**Event-Driven Solution:**

Baseline computation runs as a daily background job consuming the event stream.

```python
# Analytics worker (runs daily per user)
def compute_baseline(user_id: str):
    # Pull 7 days of events from PostgreSQL
    events = query_events(user_id, days=7)

    # Compute personalized baselines
    baselines = {
        "blink_rate_median": percentile(events.blink_rate, 50),
        "blink_rate_p25": percentile(events.blink_rate, 25),  # Low threshold
        "posture_score_median": percentile(events.posture_score, 50),
        "typical_session_duration": median(events.session_durations),
        "flow_state_hours": compute_flow_hours(events),

        # Context-aware baselines
        "blink_rate_by_time_of_day": group_by_hour(events.blink_rate),
        "blink_rate_by_lighting": group_by_lighting(events.blink_rate),
        "blink_rate_weekday_vs_weekend": group_by_day_type(events.blink_rate),
    }

    # Write to user_baselines table
    upsert_baselines(user_id, baselines)

    # Invalidate cache
    redis.delete(f"user:{user_id}:baselines")
```

**Cold-start problem:**
- First 2 hours: Use population averages (15 blinks/min, posture score 70)
- 2-24 hours: Use coarse personal baseline (median of collected data)
- After 24 hours: Full multi-dimensional baseline with confidence intervals

**Benefit:** Event stream provides perfect dataset for ML baseline computation. As more data accumulates, baselines improve continuously.

---

### 6. Flow State Interruption

**Event-Driven Solution:**

Flow state detection runs locally in the client CEP engine using heuristics:

```typescript
// Client-side flow state detector
class FlowStateDetector {
  detect(recentEvents: WellnessEvent[]): FlowState {
    const typingSpeed = computeTypingSpeed(recentEvents);
    const mouseIdleTime = computeMouseIdleTime(recentEvents);
    const calendarBusy = checkCalendar();  // Local calendar integration
    const focusAppActive = isFocusApp(activeWindow);

    // Flow state indicators:
    // 1. High typing speed (above personal baseline)
    // 2. Minimal mouse movement (deep in IDE/editor)
    // 3. Calendar shows as "busy"
    // 4. Active window is productivity app

    if (typingSpeed > baseline * 1.2 &&
        mouseIdleTime > 60 &&
        (calendarBusy || focusAppActive)) {
      return {
        state: "deep_work",
        confidence: 0.9,
        suppress_alerts: true
      };
    }

    return { state: "shallow_work", suppress_alerts: false };
  }
}
```

**Alert behavior during flow state:**
- Alerts queued but not shown
- When flow state ends, show consolidated summary: "While you were focused: 2 posture alerts, 1 low blink rate"
- User can review and dismiss in batch
- Critical alerts (fatigue_severe) override flow state

**Benefit:** Flow state detection is event-driven and non-invasive. System respects focus time while maintaining safety.

---

## How This Architecture Solves the 10 Scaling Challenges

### 1. Offline Queue & Sync Storm

**Event-Driven Solution:**

Offline events accumulate in local SQLite WAL (Write-Ahead Log). On reconnect, client syncs in controlled batches.

```typescript
// Client sync manager
class SyncManager {
  async syncOfflineEvents() {
    const unsynced = await localDB.getUnsyncedEvents();
    const batches = chunk(unsynced, 1000);  // 1000 events per batch

    for (const batch of batches) {
      try {
        // Send batch to ingestion endpoint
        await api.post('/events/batch', {
          events: batch,
          compression: 'gzip'  // Compress large payloads
        });

        // Mark as synced locally
        await localDB.markSynced(batch.map(e => e.event_id));

        // Throttle to avoid overwhelming server
        await sleep(1000);  // 1 second between batches
      } catch (error) {
        if (error.status === 429) {  // Rate limited
          await exponentialBackoff();
        }
        break;  // Stop sync, retry later
      }
    }
  }
}
```

**Server-side protection:**

```typescript
// API Gateway (Cloudflare Worker)
async function handleBatchIngestion(request) {
  const userId = request.jwt.sub;

  // Rate limit per user: 10 batches per minute
  const rateLimitKey = `ratelimit:${userId}`;
  const count = await redis.incr(rateLimitKey);
  await redis.expire(rateLimitKey, 60);

  if (count > 10) {
    return new Response('Rate limited', {
      status: 429,
      headers: { 'Retry-After': '60' }
    });
  }

  // Validate batch size
  const events = await request.json();
  if (events.length > 1000) {
    return new Response('Batch too large', { status: 413 });
  }

  // Push to Redis Streams (fan-out)
  for (const event of events) {
    await redis.xadd(
      `wellness-events-${userId}`,
      '*',  // Auto-generate ID
      'event', JSON.stringify(event)
    );
  }

  return new Response('OK', { status: 202 });  // Accepted (async processing)
}
```

**Benefit:** Sync storm is impossible. Client throttles itself, server rate-limits as backup. Redis Streams buffers spikes gracefully.

---

### 2. Write Path & Connection Limits

**Event-Driven Solution:**

Direct database writes are eliminated. All writes go through Redis Streams, which has no connection limit.

```
Traditional (bad):
1000 clients → 1000 DB connections → PostgreSQL max_connections exceeded

Event-driven (good):
1000 clients → Redis Streams (unlimited) → 10 persistence workers → 10 DB connections
```

**Persistence worker:**

```python
# Runs as background job (Cloudflare Worker Cron or Railway)
async def persistence_worker():
    while True:
        # Read batch from Redis Streams
        events = await redis.xreadgroup(
            groupname='persistence-group',
            consumername=worker_id,
            streams={'wellness-events-*': '>'},  # All user streams
            count=1000,  # Batch size
            block=5000   # 5 second timeout
        )

        if not events:
            await asyncio.sleep(1)
            continue

        # Batch insert to PostgreSQL
        await db.executemany(
            """
            INSERT INTO wellness_events (event_id, user_id, event_type, timestamp, payload)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (event_id) DO NOTHING  -- Idempotency
            """,
            events
        )

        # Acknowledge consumption
        await redis.xack('wellness-events-*', 'persistence-group', [e.id for e in events])
```

**Benefit:** Write path scales horizontally. Add more workers to handle load. Database never sees connection spikes.

---

### 3. Data Volume & Retention Policy

**Event-Driven Solution:**

Tiered storage with automatic aggregation and pruning.

```sql
-- TimescaleDB retention policy
SELECT add_retention_policy('wellness_events', INTERVAL '7 days');

-- Continuous aggregation (materialized view)
CREATE MATERIALIZED VIEW wellness_1min_rollup
WITH (timescaledb.continuous) AS
SELECT
  user_id,
  time_bucket('1 minute', timestamp) AS bucket,
  COUNT(*) FILTER (WHERE event_type = 'blink_detected') AS blink_count,
  AVG((payload->>'posture_score')::int) AS avg_posture_score,
  MAX((payload->>'fatigue_level')::text) AS max_fatigue_level
FROM wellness_events
GROUP BY user_id, bucket;

-- Refresh policy (update every 5 minutes)
SELECT add_continuous_aggregate_policy('wellness_1min_rollup',
  start_offset => INTERVAL '10 minutes',
  end_offset => INTERVAL '1 minute',
  schedule_interval => INTERVAL '5 minutes');

-- Retention: Raw events (7d) → 1min rollup (30d) → 1hr rollup (6mo) → 1day rollup (2yr)
```

**Storage savings:**

| Tier | Data Points/User/Day | Storage/User/Day | Retention | Total/User |
|------|---------------------|------------------|-----------|-----------|
| Raw events | 864,000 | ~43 MB | 7 days | 301 MB |
| 1min rollup | 1,440 | ~72 KB | 30 days | 2.1 MB |
| 1hr rollup | 24 | ~1.2 KB | 180 days | 216 KB |
| 1day rollup | 1 | ~50 B | 730 days | 36 KB |
| **Total** | | | | **~303 MB/user** |

At 10,000 users: ~3 TB total storage (well within Supabase Pro limits)

**Benefit:** Storage scales sub-linearly. Dashboard queries hit rollups (fast), raw events only for debugging.

---

### 4. Dashboard Query Performance

**Event-Driven Solution:**

Dashboard NEVER queries raw events. Always reads from pre-aggregated rollups or Redis cache.

```typescript
// Dashboard API (Next.js API route)
export async function GET(request: Request) {
  const { userId, timeRange } = parseQuery(request);

  // Real-time view (last 1 hour)
  if (timeRange === '1h') {
    // Try cache first
    const cached = await redis.get(`user:${userId}:latest`);
    if (cached) return Response.json(cached);

    // Fall back to 1min_rollup table (60 data points)
    const data = await db.query(`
      SELECT bucket, blink_count, avg_posture_score
      FROM wellness_1min_rollup
      WHERE user_id = $1 AND bucket > NOW() - INTERVAL '1 hour'
      ORDER BY bucket DESC
    `, [userId]);

    return Response.json(data);
  }

  // Historical view (last 7 days)
  if (timeRange === '7d') {
    // Query 1hr_rollup table (168 data points)
    const data = await db.query(`
      SELECT bucket, blink_count, avg_posture_score
      FROM wellness_1hr_rollup
      WHERE user_id = $1 AND bucket > NOW() - INTERVAL '7 days'
      ORDER BY bucket DESC
    `, [userId]);

    return Response.json(data);
  }

  // Long-term trends (30 days to 6 months)
  if (timeRange === '30d' || timeRange === '6m') {
    // Query 1day_rollup table (30 or 180 data points)
    const data = await db.query(`
      SELECT bucket, blink_count, avg_posture_score
      FROM wellness_1day_rollup
      WHERE user_id = $1 AND bucket > NOW() - INTERVAL $2
      ORDER BY bucket DESC
    `, [userId, timeRange === '30d' ? '30 days' : '6 months']);

    return Response.json(data);
  }
}
```

**Query performance:**
- 1 hour view: 60 rows, <10ms (often cached)
- 7 days view: 168 rows, <20ms
- 30 days view: 30 rows, <10ms
- 6 months view: 180 rows, <15ms

**Benefit:** Dashboard is always fast regardless of data volume. Queries scale with time range, not event count.

---

### 5. Real-Time Alert Latency

**Event-Driven Solution:**

Alerts run in client-side CEP engine (sub-second latency) with server-side validation.

```typescript
// Client-side alert engine (runs in Electron main process)
class ClientAlertEngine {
  private slidingWindows = new Map();

  processEvent(event: WellnessEvent) {
    // Update sliding windows
    this.slidingWindows.get('2min')?.push(event);
    this.slidingWindows.get('5min')?.push(event);

    // Evaluate alert rules (local, immediate)
    if (this.shouldTriggerLowBlinkAlert()) {
      this.showAlert({
        type: 'low_blink_rate',
        message: 'Your blink rate is low. Take a moment to rest your eyes.'
      });

      // Also send to server for history (async, non-blocking)
      this.publishAlertEvent(event);
    }
  }

  shouldTriggerLowBlinkAlert(): boolean {
    const window = this.slidingWindows.get('2min');
    const avgRate = computeAvgBlinkRate(window);
    const baseline = this.baselines.blink_rate_median;

    return avgRate < baseline * 0.6;  // 40% below baseline
  }
}
```

**Latency breakdown:**
- Detection to alert decision: <100ms (in-memory sliding window)
- Alert decision to UI: <50ms (IPC to renderer process)
- Total latency: <150ms (well within human perception threshold)

**Server-side validation (optional):**
- Client reports alert events to server
- Server CEP validates against fuller context (calendar, long-term patterns)
- Server can suppress false positives via WebSocket ("dismiss that alert")

**Benefit:** Alerts are instant because they run locally. No network round-trip required.

---

### 6. GDPR Deletion at Scale

**Event-Driven Solution:**

User deletion is a multi-step workflow coordinated by events.

```typescript
// API endpoint: DELETE /users/:userId
async function deleteUser(userId: string) {
  // Step 1: Publish deletion event
  await redis.xadd('gdpr-deletions', '*', {
    user_id: userId,
    requested_at: Date.now(),
    status: 'pending'
  });

  // Step 2: Soft-delete user record (immediate)
  await db.execute(`
    UPDATE users SET deleted_at = NOW() WHERE id = $1
  `, [userId]);

  // Step 3: Background workers handle cleanup
  // - Drop Redis stream (instant)
  // - Soft-delete events in PostgreSQL (batched, non-blocking)
  // - Cleanup aggregation tables
  // - Delete from analytics pipeline

  return { status: 'deletion_queued', eta: '24 hours' };
}

// Background worker for GDPR cleanup
async function gdprCleanupWorker() {
  while (true) {
    const deletionEvents = await redis.xreadgroup(
      'gdpr-cleanup-group',
      worker_id,
      { 'gdpr-deletions': '>' },
      1,  // One at a time
      5000
    );

    for (const event of deletionEvents) {
      const userId = event.data.user_id;

      // Drop Redis stream (instant)
      await redis.del(`wellness-events-${userId}`);

      // Soft-delete events (batched to avoid lock contention)
      await db.execute(`
        UPDATE wellness_events
        SET deleted_at = NOW()
        WHERE user_id = $1 AND deleted_at IS NULL
      `, [userId]);

      // Drop pre-aggregated rollups (fast, indexed by user_id)
      await db.execute(`DELETE FROM wellness_1min_rollup WHERE user_id = $1`, [userId]);
      await db.execute(`DELETE FROM wellness_1hr_rollup WHERE user_id = $1`, [userId]);
      await db.execute(`DELETE FROM wellness_1day_rollup WHERE user_id = $1`, [userId]);
      await db.execute(`DELETE FROM session_summaries WHERE user_id = $1`, [userId]);

      // Mark deletion complete
      await redis.xadd('gdpr-deletions', '*', {
        user_id: userId,
        completed_at: Date.now(),
        status: 'completed'
      });

      await redis.xack('gdpr-deletions', 'gdpr-cleanup-group', event.id);
    }

    await sleep(1000);
  }
}
```

**Timeline:**
- User clicks "Delete my account" → Immediate UI confirmation
- Redis stream deleted → <1 second
- Soft-delete in PostgreSQL → <5 seconds
- Hard-delete (optional, for compliance) → Background job, completes in 24 hours

**Benefit:** Deletion is non-blocking and auditable. User sees instant feedback, heavy lifting happens asynchronously.

---

### 7. Session Management

**Event-Driven Solution:**

Session lifecycle is event-sourced. No zombie sessions.

```typescript
// Session manager (client)
class SessionManager {
  private heartbeatInterval: number = 30000;  // 30 seconds
  private lastHeartbeat: number = Date.now();

  startSession() {
    const sessionId = uuidv7();
    this.publishEvent({
      event_type: 'session_started',
      session_id: sessionId,
      payload: { device_info: getDeviceInfo() }
    });

    // Start heartbeat
    this.startHeartbeat(sessionId);

    return sessionId;
  }

  startHeartbeat(sessionId: string) {
    setInterval(() => {
      this.publishEvent({
        event_type: 'session_heartbeat',
        session_id: sessionId,
        payload: {
          cpu_usage: getCPUUsage(),
          memory_usage: getMemoryUsage()
        }
      });
      this.lastHeartbeat = Date.now();
    }, this.heartbeatInterval);
  }

  endSession(sessionId: string, reason: string) {
    this.publishEvent({
      event_type: 'session_ended',
      session_id: sessionId,
      payload: {
        duration_seconds: computeDuration(sessionId),
        reason
      }
    });
  }

  // Handle app crash
  onAppStart() {
    const orphanedSessions = this.findOrphanedSessions();
    for (const session of orphanedSessions) {
      // Recover orphaned session
      this.publishEvent({
        event_type: 'session_recovered',
        session_id: session.id,
        payload: {
          crashed_at: session.last_heartbeat,
          recovered_at: Date.now()
        }
      });
    }
  }
}

// Server-side session timeout (background job)
async function sessionTimeoutWorker() {
  while (true) {
    // Find sessions with no heartbeat in 5 minutes
    const staleSessions = await db.query(`
      SELECT session_id, user_id, last_heartbeat
      FROM session_state_cache
      WHERE last_heartbeat < NOW() - INTERVAL '5 minutes'
        AND ended_at IS NULL
    `);

    for (const session of staleSessions) {
      // Auto-close stale session
      await redis.xadd(`wellness-events-${session.user_id}`, '*', {
        event: JSON.stringify({
          event_type: 'session_ended',
          session_id: session.session_id,
          payload: {
            reason: 'timeout',
            duration_seconds: computeDuration(session)
          }
        })
      });
    }

    await sleep(60000);  // Run every minute
  }
}
```

**Benefit:** Session state is derived from events. Crashes are recoverable, zombie sessions auto-close.

---

### 8. Partial Sync Failure & Idempotency

**Event-Driven Solution:**

Every event has a unique `event_id` (UUID v7). Server uses upsert with idempotency.

```typescript
// Client sync logic
class SyncManager {
  async syncBatch(events: WellnessEvent[]) {
    try {
      await api.post('/events/batch', { events });

      // Mark as synced locally
      await localDB.markSynced(events.map(e => e.event_id));
    } catch (error) {
      if (error.status >= 500) {
        // Server error, unclear if events were saved
        // Safe to retry - idempotency ensures no duplicates
        await this.retryWithBackoff(events);
      } else if (error.status >= 400) {
        // Client error (validation failure)
        // Mark as failed, don't retry
        await localDB.markFailed(events.map(e => e.event_id));
      }
    }
  }
}

// Server ingestion (idempotent)
async function ingestEvents(events: WellnessEvent[]) {
  // Validate event_ids are unique
  const eventIds = events.map(e => e.event_id);
  if (eventIds.length !== new Set(eventIds).size) {
    throw new Error('Duplicate event_ids in batch');
  }

  // Upsert to PostgreSQL (ON CONFLICT DO NOTHING)
  await db.executemany(`
    INSERT INTO wellness_events (event_id, user_id, event_type, timestamp, payload)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (event_id) DO NOTHING
  `, events);

  // Redis Streams are naturally idempotent (XADD with explicit ID)
  for (const event of events) {
    await redis.xadd(
      `wellness-events-${event.user_id}`,
      event.event_id,  // Use event_id as stream ID
      'event', JSON.stringify(event)
    );
  }
}
```

**Sync checkpoint strategy:**

```typescript
// Client tracks last successfully synced event per stream
interface SyncCheckpoint {
  user_id: string;
  last_synced_event_id: string;  // UUID v7 (time-sortable)
  last_synced_timestamp: number;
}

// On reconnect
async function resumeSync() {
  const checkpoint = await localDB.getSyncCheckpoint();
  const unsyncedEvents = await localDB.getEventsAfter(checkpoint.last_synced_event_id);

  // Sync only events after checkpoint
  await syncBatch(unsyncedEvents);
}
```

**Benefit:** Idempotency prevents duplicate data. Retries are safe. Sync can be interrupted and resumed without data loss or corruption.

---

### 9. Supabase Tier Limits

**Event-Driven Solution:**

Redis Streams offloads Supabase. Most real-time traffic never hits PostgreSQL.

**Traffic distribution:**

| Component | Backend | Traffic | Cost |
|-----------|---------|---------|------|
| Event ingestion | Redis Streams (Upstash) | 10K events/sec | ~$20/mo |
| Real-time queries | Redis cache (Upstash) | 1K queries/sec | Included |
| Historical queries | PostgreSQL (Supabase) | 10 queries/sec | Supabase Pro ($25/mo) |
| Auth | Supabase Auth | 100 logins/day | Included |
| Storage | Supabase Storage | 50GB | Included in Pro |

**Supabase Pro limits (after Redis offload):**
- Database: 8GB → Sufficient for 10K users (~3TB offloaded to Redis Streams)
- Connections: 200 → Only 10 persistence workers need connections
- Egress: 250GB/mo → Dashboard queries hit rollups (small payloads)

**Self-host threshold:**
- Supabase becomes limiting at ~50K users
- At that scale, migrate to self-hosted TimescaleDB + Redis Cluster
- Event-driven architecture makes migration easy (no downtime)

**Benefit:** Redis Streams absorbs 99% of write load. Supabase limits become non-issue.

---

### 10. Burst Traffic Handling

**Event-Driven Solution:**

Redis Streams acts as elastic buffer. Workers scale independently.

```typescript
// API Gateway (Cloudflare Worker)
async function handleEventIngestion(request) {
  // Push to Redis Streams (non-blocking, instant)
  await redis.xadd(
    `wellness-events-${userId}`,
    '*',
    'event', JSON.stringify(event)
  );

  // Return immediately (async processing)
  return new Response('Accepted', { status: 202 });
}

// Persistence workers (auto-scale)
// - Normal load: 2 workers
// - Peak load (9 AM Monday): Auto-scale to 10 workers
// - Workers drain queue at their own pace

// Queue depth monitoring
async function monitorQueueDepth() {
  const depth = await redis.xlen('wellness-events-*');

  if (depth > 100000) {
    // Queue building up, scale workers
    scaleWorkers(10);
  } else if (depth < 10000) {
    // Queue draining, scale down
    scaleWorkers(2);
  }
}
```

**Graceful degradation:**

If Redis Streams is overwhelmed (unlikely), client falls back to local-only mode.

```typescript
// Client fallback logic
async function publishEvent(event: WellnessEvent) {
  try {
    await api.post('/events', { event });
  } catch (error) {
    if (error.status === 503) {
      // Service unavailable, queue locally
      await localDB.queueEvent(event);
      showNotification('Working offline - data will sync later');
    }
  }
}
```

**Benefit:** Burst traffic is absorbed by Redis Streams buffer. Workers scale to drain queue. System degrades gracefully under extreme load.

---

## Technology Stack Justification

### Why Redis Streams over Kafka?

| Criteria | Redis Streams | Kafka | Winner |
|----------|--------------|-------|--------|
| **Latency** | <1ms | 5-10ms | Redis Streams |
| **Throughput** | 100K/sec per instance | 1M+/sec per cluster | Kafka (but we don't need this) |
| **Durability** | Optional (RDB + AOF) | Guaranteed (replication) | Kafka |
| **Complexity** | Managed (Upstash) | Self-host ZooKeeper + brokers | Redis Streams |
| **Cost** | $20/mo (Upstash) | $300+/mo (Confluent Cloud) | Redis Streams |
| **Retention** | 1-7 days (per stream) | Unlimited | Kafka |
| **Use case fit** | Perfect for <100K users | Overkill for startup scale | Redis Streams |

**Decision:** Redis Streams for MVP and scale to 100K users. Migrate to Kafka if we hit 500K+ users and need multi-region replication.

---

### Why TimescaleDB (PostgreSQL extension) over raw PostgreSQL?

| Feature | TimescaleDB | PostgreSQL |
|---------|-------------|------------|
| **Time-series optimization** | Automatic partitioning | Manual partitioning |
| **Compression** | 90% compression on old data | Manual with pg_compress |
| **Continuous aggregation** | Built-in materialized views | Manual refresh |
| **Retention policies** | Automatic pruning | Manual DELETE + VACUUM |
| **Query performance** | 10-100x faster on time ranges | Requires careful indexing |

**Decision:** TimescaleDB is a drop-in PostgreSQL extension (available on Supabase). No vendor lock-in, massive performance gains.

---

### Why Cloudflare Workers over AWS Lambda?

| Criteria | Cloudflare Workers | AWS Lambda |
|----------|-------------------|------------|
| **Cold start** | 0ms (V8 isolates) | 100-1000ms (container) |
| **Geographic latency** | <50ms globally | 100-300ms (single region) |
| **WebSocket support** | Native (Durable Objects) | Requires API Gateway |
| **Cost** | $5/10M requests | $0.20/1M requests |
| **Vendor lock-in** | Low (standard JS) | High (AWS SDK) |

**Decision:** Cloudflare Workers for API gateway and WebSocket handling. Falls back to Railway/Fly.io for background workers.

---

### Why Electron over Tauri?

| Criteria | Electron | Tauri |
|----------|---------|-------|
| **Bundle size** | 150MB | 10MB |
| **Memory usage** | 200MB | 50MB |
| **Cross-platform** | Mature | Improving |
| **Ecosystem** | Rich (10+ years) | Young |
| **Native APIs** | Node.js | Rust |
| **Development speed** | Fast | Slow |

**Decision:** Electron for MVP (faster development). Migrate to Tauri later if bundle size becomes complaint.

---

## Event Flow Examples

### Example 1: Normal Operation (Happy Path)

```
1. User opens app
   └─> Client publishes: session_started
   └─> Server writes to Redis: wellness-events-{user_id}
   └─> Persistence worker: Writes to PostgreSQL

2. User blinks (30 times/sec)
   └─> Detection engine: Publishes blink_detected events
   └─> Local CEP engine: Updates sliding windows (in-memory)
   └─> Client batches: 30 events → 1 aggregate event/sec
   └─> Server: Writes to Redis Streams
   └─> Aggregation worker: Computes 1min rollup
   └─> Redis cache: Updates user:{id}:latest

3. Dashboard opens
   └─> Query API: Reads from Redis cache (user:{id}:latest)
   └─> Returns 60 data points (last 1 hour)
   └─> Chart renders in <100ms

4. Low blink rate detected (after 2 minutes)
   └─> Local CEP engine: Matches alert pattern
   └─> Checks flow state: User NOT in deep work
   └─> Checks cooldown: No recent similar alert
   └─> Shows alert notification
   └─> Publishes: alert_triggered event
   └─> Server: Writes to Redis + PostgreSQL

5. User dismisses alert
   └─> Client publishes: alert_dismissed
   └─> Server: Records dismissal for ML training
```

---

### Example 2: Offline Operation

```
1. User loses internet connection
   └─> Client detects: navigator.onLine = false
   └─> Switches to offline mode
   └─> UI shows: "Working offline - data will sync later"

2. Detection continues (100% local)
   └─> Blink events: Queued in SQLite
   └─> Posture events: Queued in SQLite
   └─> Alerts: Still work (local CEP engine)
   └─> Dashboard: Shows local data only

3. User works offline for 2 hours
   └─> Queued events: 216,000 events in SQLite
   └─> Disk space: ~10MB (compressed)
   └─> No data loss

4. Internet reconnects
   └─> Client publishes: session_recovered
   └─> Sync manager: Reads unsyncedEvents from SQLite
   └─> Batches: 216 batches × 1000 events each
   └─> Sends: 1 batch/second (throttled)
   └─> Server: Rate-limits to 10 batches/min
   └─> Sync completes: ~22 minutes
   └─> UI shows: "Sync complete - 216,000 events uploaded"
```

---

### Example 3: Alert Fatigue Prevention

```
1. User has low blink rate (sustained)
   └─> CEP engine: Detects pattern (2 minutes)
   └─> Publishes: alert_triggered (severity: warning)
   └─> User dismisses

2. Blink rate remains low
   └─> CEP engine: Matches pattern again (2 minutes later)
   └─> Checks cooldown: Alert suppressed (10 min cooldown)
   └─> No alert shown

3. Blink rate STILL low (critical)
   └─> CEP engine: Matches pattern (3 minutes below critical threshold)
   └─> Escalates: alert_triggered (severity: critical)
   └─> Overrides cooldown (safety-critical)
   └─> Shows urgent alert: "Your eyes need immediate rest!"

4. User enters flow state (deep work)
   └─> Flow state detector: Detects high typing speed + calendar busy
   └─> Publishes: flow_state_detected
   └─> CEP engine: Suppresses ALL non-critical alerts
   └─> Alerts queued: [posture_alert, break_reminder]

5. User exits flow state
   └─> Publishes: flow_state_ended
   └─> Shows consolidated summary: "While you were focused: 2 posture alerts, 1 break reminder"
   └─> User can batch dismiss or review
```

---

### Example 4: GDPR Deletion

```
1. User clicks "Delete my account"
   └─> UI: Shows confirmation dialog
   └─> User confirms

2. Client sends: DELETE /users/{id}
   └─> API: Publishes gdpr-deletion event
   └─> API: Soft-deletes user record (deleted_at = NOW())
   └─> Returns: "Deletion queued, complete in 24 hours"
   └─> UI: Shows confirmation + logout

3. GDPR cleanup worker (background)
   └─> Reads: gdpr-deletion event from Redis Streams
   └─> Deletes: Redis stream (wellness-events-{user_id})
   └─> Soft-deletes: All events in PostgreSQL (batched)
   └─> Deletes: Pre-aggregated rollups (1min, 1hr, 1day)
   └─> Deletes: Session summaries
   └─> Publishes: gdpr-deletion-completed

4. After 24 hours
   └─> Hard-delete job: Vacuums soft-deleted rows (optional)
   └─> Audit log: Records deletion completion
   └─> User data: Completely purged
```

---

## Operational Complexity Assessment

### Development Complexity: Medium-High

**New skills required:**
- Event sourcing patterns
- CQRS architecture
- Stream processing (Redis Streams)
- Complex Event Processing (CEP)
- WebSocket management

**Mitigations:**
- Use managed services (Upstash Redis, Supabase)
- Start with simple CEP rules, evolve over time
- Extensive logging and observability from day 1

---

### Operational Complexity: Low-Medium

**Components to monitor:**
- Redis Streams queue depth
- Persistence worker lag
- WebSocket connection count
- Database connection pool usage
- Alert latency (client-side)

**Tooling:**
- Sentry for error tracking
- Datadog/Grafana for metrics
- Upstash console for Redis monitoring
- Supabase dashboard for PostgreSQL

**On-call scenarios:**
- Redis Streams full → Scale workers or increase retention
- PostgreSQL connection limit → Increase pool size or add workers
- WebSocket connection storm → Rate limit or add capacity

---

### Cost Complexity: Low

**Monthly costs (10,000 users):**

| Component | Service | Cost |
|-----------|---------|------|
| Redis Streams | Upstash Pro | $20 |
| PostgreSQL | Supabase Pro | $25 |
| API Gateway | Cloudflare Workers | $5 |
| Background workers | Railway | $20 |
| Web dashboard | Vercel Pro | $20 |
| Monitoring | Sentry + Datadog | $50 |
| **Total** | | **$140/mo** |

**Per-user cost:** $0.014/mo ($0.17/year)

**Revenue model:** $5/mo subscription → 28 users covers entire infrastructure

---

## Trade-offs and Limitations

### Trade-off 1: Eventual Consistency

**Impact:** Dashboard may show stale data (up to 1 minute lag between client and server)

**Mitigation:**
- Real-time view uses Redis cache (updated every 10 seconds)
- Client UI shows "last updated" timestamp
- For critical actions (GDPR deletion), use synchronous confirmation

**Acceptable because:** Wellness data is not financial/transactional. 1 minute lag is imperceptible for analytics.

---

### Trade-off 2: Limited Event History

**Impact:** Raw events retained for only 7 days. Deep debugging of old sessions is impossible.

**Mitigation:**
- Pre-aggregated rollups preserved for 2 years
- Session summaries preserved indefinitely
- For premium users, offer extended retention (30 days raw events)

**Acceptable because:** 99% of issues surface within 24 hours. Rollups sufficient for long-term trends.

---

### Trade-off 3: Client-Side Alert Logic

**Impact:** Malicious clients could suppress or fabricate alerts

**Mitigation:**
- Server-side CEP validates critical alerts (fatigue_severe, critical_blink_rate)
- Server can override client alerts via WebSocket
- Anomaly detection flags suspicious patterns (e.g., zero alerts for 8 hours)

**Acceptable because:** WellnessGuard is not life-critical. User motivation is self-improvement, not cheating.

---

### Trade-off 4: No Multi-Region Support (MVP)

**Impact:** Users far from primary region (e.g., US users with EU server) experience higher latency

**Mitigation:**
- Use Cloudflare Workers (edge compute, globally distributed)
- Redis Streams and PostgreSQL in single region (acceptable for MVP)
- For scale, add Redis replication and read replicas

**Acceptable because:** 100-200ms additional latency doesn't affect wellness monitoring. Real-time alerts run locally anyway.

---

### Limitation 1: Redis Streams Memory Limit

**Issue:** Redis Streams stores all events in memory. At scale, memory exhaustion is possible.

**Mitigation:**
- Aggressive retention policies (1 hour for blink events, 1 day for session events)
- Offload to PostgreSQL immediately (persistence workers)
- Monitor memory usage, scale Redis vertically if needed

**Scale limit:** 100K users with 1 hour retention = ~50GB Redis memory (Upstash supports this)

---

### Limitation 2: WebSocket Connection Limit

**Issue:** Cloudflare Workers Durable Objects limited to 10K concurrent WebSocket connections per account

**Mitigation:**
- WebSocket used only for real-time dashboard updates (not critical path)
- Fall back to HTTP polling if WebSocket unavailable
- At 10K users, only ~1K are viewing dashboard simultaneously (10% concurrency)

**Scale limit:** 100K users (10K concurrent dashboard viewers) → Need multiple Cloudflare accounts or migrate to dedicated WebSocket server

---

### Limitation 3: TimescaleDB Compression Lag

**Issue:** TimescaleDB compression runs asynchronously. Recent data (last 24 hours) is uncompressed.

**Impact:** Higher storage costs for recent data

**Mitigation:**
- Acceptable trade-off (storage is cheap)
- Compression policy: Compress data older than 24 hours
- Estimate: 10K users × 43MB/day × 1 day = 430GB uncompressed (still manageable)

**Scale limit:** Not a blocker until 100K+ users

---

## Migration Path from Traditional CRUD

**Phase 1: Event sourcing (2 weeks)**
- Add event_log table
- Dual-write: Write to events + existing tables
- Verify event log is complete

**Phase 2: CQRS (2 weeks)**
- Build aggregation workers
- Create rollup tables (1min, 1hr, 1day)
- Migrate dashboard to read from rollups

**Phase 3: Streaming (2 weeks)**
- Introduce Redis Streams
- Migrate write path to Redis → Workers → PostgreSQL
- Remove direct PostgreSQL writes from client

**Phase 4: Client-side CEP (1 week)**
- Move alert logic to client
- Add flow state detection
- Implement smart suppression

**Total migration time:** 7-8 weeks for complete transformation

---

## Summary: Why Event-Driven Architecture Wins

### Critical Six Solutions

1. **Glasses Detection:** Event metadata enables adaptive thresholds
2. **Lighting Robustness:** Context-aware baselines per lighting condition
3. **Alert Fatigue:** Complex Event Processing with cooldowns + flow state awareness
4. **Privacy:** No video data in events, local-only processing
5. **Baseline Calibration:** Event stream provides perfect ML dataset
6. **Flow State:** Client-side detection, alert suppression/consolidation

### Scaling Solutions

1. **Offline Queue:** Local SQLite + controlled batch sync
2. **Write Path:** Redis Streams eliminates connection limits
3. **Data Volume:** Tiered aggregation, sub-linear storage growth
4. **Dashboard Performance:** Pre-aggregated rollups, always fast queries
5. **Alert Latency:** Local CEP, <150ms end-to-end
6. **GDPR Deletion:** Event-sourced workflow, non-blocking, auditable
7. **Session Management:** Event-sourced lifecycle, auto-recovery
8. **Sync Idempotency:** Event IDs + upsert logic, safe retries
9. **Supabase Limits:** Redis offloads 99% of write traffic
10. **Burst Traffic:** Redis buffer + auto-scaling workers

### Strategic Advantages

- **Auditability:** Complete event history for debugging and compliance
- **Flexibility:** Add new event consumers (ML, analytics) without touching producers
- **Testability:** Replay events for deterministic testing
- **Observability:** Event logs are natural audit trail
- **Future-proof:** Easy to add multi-region replication, ML pipelines, integrations

---

## Recommended Architecture (Final)

**For MVP (0-10K users):**
```
Desktop Client (Electron)
  → Local CEP + SQLite
  → Cloudflare Workers (API + WebSocket)
  → Redis Streams (Upstash)
  → Persistence Workers (Railway)
  → TimescaleDB (Supabase)
  → Web Dashboard (Next.js + Vercel)
```

**Cost:** $140/mo all-in
**Complexity:** Medium (manageable with managed services)
**Performance:** Excellent (sub-second alerts, fast dashboard)
**Scalability:** Linear to 100K users

---

## Research Sources

### Event-Driven Architectures & IoT
- [Real-time Data Streaming in IoT: Why and How | Solace](https://solace.com/blog/real-time-data-streaming-in-iot/)
- [Building event-driven architectures with IoT sensor data | AWS Architecture Blog](https://aws.amazon.com/blogs/architecture/building-event-driven-architectures-with-iot-sensor-data/)
- [Building Industrial IoT Data Streaming Architecture with MQTT](https://www.hivemq.com/blog/building-industrial-iot-data-streaming-architecture-mqtt/)

### Redis Streams vs Kafka
- [Processing Time-Series Data with Redis and Apache Kafka | Redis](https://redis.io/blog/processing-time-series-data-with-redis-and-apache-kafka/)
- [Redis Streams: Ultimate Guide to Real-Time Data Processing](https://engineeringatscale.substack.com/p/redis-streams-guide-real-time-data-processing)
- [Apache Kafka vs. Redis Streams: Differences & Comparison](https://www.automq.com/blog/apache-kafka-vs-redis-streams-differences-and-comparison/)

### CQRS & Event Sourcing
- [Healthy Architectures - Using CQRS and Event Sourcing for Electronic Medical Records - InfoQ](https://www.infoq.com/articles/healthcare-emr-ehr/)
- [CQRS, Event Sourcing Patterns and Database Architecture | Upsolver](https://www.upsolver.com/blog/cqrs-event-sourcing-build-database-architecture)
- [Mastering CQRS and Event Sourcing for Modern Database Architecture - RisingWave](https://risingwave.com/blog/mastering-cqrs-and-event-sourcing-for-modern-database-architecture/)

### Offline-First Architecture
- [Building Offline-First React Apps in 2025: PWA + RSC + Service Workers](https://emirbalic.com/building-offline-first-react-apps-in-2025-pwa-rsc-service-workers/)
- [Offline App Architecture: Building Offline-First Apps 2025](https://www.aalpha.net/blog/offline-app-architecture-building-offline-first-apps/)
- [How to Build Offline-First Web Apps: A Complete Guide](https://jsschools.com/web_dev/how-to-build-offline-first-web-apps-a-complete-gu/)

### Complex Event Processing
- [Complex Event Processing (CEP): How Real-time Patterns Transform Analytics | Sigma](https://www.sigmacomputing.com/blog/complex-event-processing-cep)
- [Complex Event Processing (CEP) | Confluent](https://www.confluent.io/learn/complex-event-processing/)
- [Event Processing (CEP) | Apache Flink](https://nightlies.apache.org/flink/flink-docs-master/docs/libs/cep/)

### Streaming Aggregation
- [Sliding Window Aggregation | Stream Processing Design Patterns](https://softwarepatternslexicon.com/stream-processing/aggregation-patterns/sliding-window-aggregation/)
- [Streaming Aggregation: Real-Time Data Processing in 2024 | Last9](https://last9.io/blog/streaming-aggregation/)
- [A guide to windowing in stream processing](https://quix.io/blog/windowing-stream-processing-guide)

---

**Architecture by:** Claude Code (Opus 4.5)
**Date:** 2025-12-18
**Assignment:** Wellness at Work - Event-Driven Streaming Architecture Proposal
