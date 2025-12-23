# Data Flow Architecture

**Status:** Active | Last Updated: Dec 23, 2025

---

## Overview

Lumina's data flow is designed around three core principles:

1. **Privacy-first:** No images leave the device
2. **Offline-first:** Local storage with cloud sync
3. **Scalable aggregation:** 99.8% data reduction via rollups

This document visualizes how data flows from camera to dashboard.

---

## High-Level Data Flow

```
┌─────────────┐
│   Camera    │ 30 FPS (1920x1080)
│  (Webcam)   │
└──────┬──────┘
       │
       ├─── Meeting Mode? ──┐
       │                    ▼
       │            ┌────────────────┐
       │            │ Screen Capture │ 30 FPS (self-view region)
       │            │  (Zoom/Teams)  │
       │            └────────┬───────┘
       │                     │
       ▼                     ▼
┌──────────────────────────────┐
│   MediaPipe FaceLandmarker   │ 10ms inference
│      (478 landmarks)         │
└───────────┬──────────────────┘
            │
            ├── Left Eye: [33, 160, 158, 133, 153, 144]
            ├── Right Eye: [362, 385, 387, 263, 373, 380]
            ├── Mouth: [61, 291, 13, 14, 78, 308]
            └── Face: [1, 152, 10]
            │
            ▼
    ┌───────────────┐
    │  EAR Calc     │ (A+B)/(2*C)
    │  MAR Calc     │
    │  Posture Calc │
    └───────┬───────┘
            │
            ▼
    ┌───────────────────┐
    │  Blink Detector   │ EAR < 0.18 for 2+ frames?
    │  Yawn Detector    │ MAR > threshold for 2+ sec?
    │  Posture Detector │ Distance/tilt/lean thresholds
    └─────────┬─────────┘
              │
              ├── Blink Event
              ├── Yawn Event
              └── Posture Event
              │
              ▼
    ┌────────────────────────┐
    │  SQLite (Local DB)     │
    │  - blink_events        │ 24-hour retention
    │  - wellness_events     │ 7-day retention
    └──────────┬─────────────┘
               │
               ▼ (Every 60 seconds)
    ┌─────────────────────────┐
    │  Minute Rollup Engine   │
    │  - Count blinks (60s)   │
    │  - Avg EAR, min/max     │
    │  - Wellness score       │
    └──────────┬──────────────┘
               │
               ▼
    ┌──────────────────────┐
    │  minute_rollups      │ Indefinite (synced flag)
    └──────────┬───────────┘
               │
               ▼ (Every 5 minutes, batch 500 records)
    ┌─────────────────────┐
    │  Supabase API       │
    │  POST /wellness_data│
    └──────────┬──────────┘
               │
               ▼
    ┌────────────────────────────┐
    │  TimescaleDB (Cloud)       │
    │  - wellness_data (hypertable) │
    └──────────┬─────────────────┘
               │
               ├── Continuous Aggregates
               │   ├── 1-hour rollups
               │   └── 1-day rollups
               │
               ▼
    ┌──────────────────────┐
    │  Next.js Dashboard   │
    │  - User dashboard    │
    │  - Admin analytics   │
    └──────────────────────┘
```

---

## Detailed Flow: Detection Loop

### 1. Frame Acquisition (Every 33ms)

**Normal Mode (Webcam):**
```javascript
navigator.mediaDevices.getUserMedia({
  video: { width: 640, height: 480, frameRate: 30 }
})
```

**Meeting Mode (Screen Capture):**
```javascript
// 1. Detect meeting app running
PowerShell: Get-Process | Where-Object {$_.Name -match 'Zoom|Teams|Meet'}

// 2. Get screen sources
desktopCapturer.getSources({ types: ['screen', 'window'] })

// 3. Request specific source
navigator.mediaDevices.getUserMedia({
  video: {
    mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId }
  }
})

// 4. Crop to calibrated region
ctx.drawImage(video, calibX, calibY, calibWidth, calibHeight, 0, 0, canvas.width, canvas.height)
```

### 2. Landmark Detection (10ms)

**MediaPipe Inference:**
```javascript
const results = await faceLandmarker.detectForVideo(videoElement, timestamp)

// Output: 478 3D landmarks
results.faceLandmarks[0] = [
  {x: 0.5, y: 0.3, z: -0.05},  // Landmark 0
  {x: 0.48, y: 0.32, z: -0.04}, // Landmark 1
  ... // 476 more
]
```

**Landmark Indices:**
- Left eye: 33, 160, 158, 133, 153, 144
- Right eye: 362, 385, 387, 263, 373, 380
- Mouth: 61 (left corner), 291 (right corner), 13 (upper lip), 14 (lower lip)
- Nose: 1 (tip)
- Chin: 152
- Forehead: 10

### 3. Metric Calculation

**Eye Aspect Ratio (EAR):**
```javascript
function calculateEAR(landmarks, eyeIndices) {
  const [p1, p2, p3, p4, p5, p6] = eyeIndices.map(i => landmarks[i])

  // Vertical distances
  const A = distance(p2, p6) // Top-bottom
  const B = distance(p3, p5) // Top-bottom (inner)

  // Horizontal distance
  const C = distance(p1, p4) // Left-right

  return (A + B) / (2.0 * C)
}

// Blink threshold
const EAR_THRESHOLD = 0.18
```

**Mouth Aspect Ratio (MAR):**
```javascript
function calculateMAR(landmarks) {
  const leftCorner = landmarks[61]
  const rightCorner = landmarks[291]
  const upperLip = landmarks[13]
  const lowerLip = landmarks[14]

  const A = distance(upperLip, lowerLip)
  const C = distance(leftCorner, rightCorner)

  return A / C
}

// Yawn threshold
const MAR_THRESHOLD = 0.7
const YAWN_DURATION = 2000 // milliseconds
```

**Posture Metrics:**
```javascript
function calculatePosture(landmarks) {
  const nose = landmarks[1]
  const leftEye = landmarks[33]
  const rightEye = landmarks[362]

  // Distance from camera (Z-depth normalized by face width)
  const faceWidth = distance(leftEye, rightEye)
  const distance = baseline.faceWidth / faceWidth // Closer = larger ratio

  // Head tilt (eye corners vs horizontal)
  const tilt = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI)

  // Forward lean (nose relative to eyes)
  const eyeMidpoint = {y: (leftEye.y + rightEye.y) / 2}
  const lean = nose.y - eyeMidpoint.y // Positive = leaning forward

  return { distance, tilt, lean }
}
```

### 4. Event Detection & Smoothing

**Kalman Filter (reduce jitter):**
```javascript
class KalmanFilter {
  constructor(Q = 0.001, R = 0.1) {
    this.Q = Q // Process noise
    this.R = R // Measurement noise
    this.P = 1.0 // Estimation error
    this.K = 0.0 // Kalman gain
    this.x = 0.0 // State estimate
  }

  update(measurement) {
    // Prediction
    this.P = this.P + this.Q

    // Update
    this.K = this.P / (this.P + this.R)
    this.x = this.x + this.K * (measurement - this.x)
    this.P = (1 - this.K) * this.P

    return this.x
  }
}

const earFilter = new KalmanFilter()
const smoothedEAR = earFilter.update(rawEAR)
```

**Blink Detector:**
```javascript
class BlinkDetector {
  constructor() {
    this.consecutiveFrames = 0
    this.CONSEC_THRESHOLD = 2 // Frames
    this.blinkCount = 0
  }

  update(ear) {
    if (ear < EAR_THRESHOLD) {
      this.consecutiveFrames++

      if (this.consecutiveFrames === this.CONSEC_THRESHOLD) {
        this.blinkCount++
        this.saveBlinkEvent()
      }
    } else {
      this.consecutiveFrames = 0
    }
  }
}
```

**Yawn Detector:**
```javascript
class YawnDetector {
  constructor() {
    this.mouthOpenStart = null
    this.lastYawnTime = 0
    this.COOLDOWN = 30000 // 30 seconds
  }

  update(mar, timestamp) {
    if (mar > MAR_THRESHOLD) {
      if (!this.mouthOpenStart) {
        this.mouthOpenStart = timestamp
      }

      const duration = timestamp - this.mouthOpenStart
      if (duration >= YAWN_DURATION && timestamp - this.lastYawnTime > this.COOLDOWN) {
        this.saveYawnEvent()
        this.lastYawnTime = timestamp
      }
    } else {
      this.mouthOpenStart = null
    }
  }
}
```

---

## Local Storage Schema

### blink_events (Raw events - 24hr retention)

```sql
CREATE TABLE blink_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,           -- Unix timestamp (ms)
  ear_left REAL,                        -- Left eye EAR
  ear_right REAL,                       -- Right eye EAR
  ear_avg REAL,                         -- Average EAR
  is_blink BOOLEAN DEFAULT 0            -- 1 if blink detected
);

-- Auto-delete after 24 hours
DELETE FROM blink_events WHERE timestamp < unixepoch('now', '-1 day') * 1000;
```

**Data volume:**
- 30 FPS × 60 sec × 60 min × 24 hr = 2,592,000 rows/day
- Avg row size: 40 bytes
- Daily storage: 104 MB/user/day
- **Deleted after 24 hours**

### minute_rollups (Aggregates - indefinite)

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

**Data volume:**
- 1,440 minutes/day × 1 row = 1,440 rows/day
- Avg row size: 60 bytes
- Daily storage: 86 KB/user/day (99.9% reduction)
- **Kept indefinitely** (until synced + 7 days cleanup)

### wellness_events (Posture/yawns - 7-day retention)

```sql
CREATE TABLE wellness_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  event_type TEXT NOT NULL,            -- 'yawn', 'posture_close', 'posture_tilt', etc.
  severity TEXT,                       -- 'low', 'medium', 'high'
  metadata TEXT,                       -- JSON: {distance: 0.8, tilt: 15, lean: 0.3}
  synced BOOLEAN DEFAULT 0
);

-- Auto-delete after 7 days
DELETE FROM wellness_events WHERE timestamp < unixepoch('now', '-7 days') * 1000;
```

---

## Cloud Sync Flow

### 1. Sync Trigger (Every 5 minutes)

```javascript
setInterval(async () => {
  if (navigator.onLine && isAuthenticated()) {
    await syncWellnessData()
  }
}, 5 * 60 * 1000) // 5 minutes
```

### 2. Batch Preparation

```javascript
async function syncWellnessData() {
  // Get unsynced rollups (max 500 per batch)
  const unsynced = db.prepare(`
    SELECT * FROM minute_rollups
    WHERE synced = 0
    ORDER BY minute_start ASC
    LIMIT 500
  `).all()

  if (unsynced.length === 0) return

  // Transform to Supabase format
  const payload = unsynced.map(row => ({
    user_id: getUserId(),
    organization_id: getOrganizationId(),
    timestamp: new Date(row.minute_start),
    blink_count: row.blink_count,
    avg_ear: row.avg_ear,
    wellness_score: row.wellness_score,
    metadata: { min_ear: row.min_ear, max_ear: row.max_ear }
  }))

  // Upload
  const { error } = await supabase.from('wellness_data').insert(payload)

  if (!error) {
    // Mark as synced
    const ids = unsynced.map(r => r.id)
    db.prepare(`UPDATE minute_rollups SET synced = 1 WHERE id IN (${ids.join(',')})`).run()
  }
}
```

### 3. TimescaleDB Hypertable

```sql
-- Cloud table structure
CREATE TABLE wellness_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  timestamp TIMESTAMPTZ NOT NULL,
  blink_count INTEGER,
  avg_ear REAL,
  wellness_score INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable (partitioned by time)
SELECT create_hypertable('wellness_data', 'timestamp');

-- Compression after 7 days (10x storage reduction)
ALTER TABLE wellness_data SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'user_id, organization_id'
);

SELECT add_compression_policy('wellness_data', INTERVAL '7 days');

-- Auto-delete after 90 days
SELECT add_retention_policy('wellness_data', INTERVAL '90 days');
```

### 4. Continuous Aggregates (Auto-updating views)

```sql
-- Hourly rollup
CREATE MATERIALIZED VIEW wellness_1hour_rollup
WITH (timescaledb.continuous) AS
SELECT
  user_id,
  organization_id,
  time_bucket('1 hour', timestamp) AS hour,
  SUM(blink_count) AS total_blinks,
  AVG(avg_ear) AS avg_ear,
  AVG(wellness_score) AS avg_wellness_score
FROM wellness_data
GROUP BY user_id, organization_id, hour;

-- Daily rollup
CREATE MATERIALIZED VIEW wellness_1day_rollup
WITH (timescaledb.continuous) AS
SELECT
  user_id,
  organization_id,
  time_bucket('1 day', timestamp) AS day,
  SUM(blink_count) AS total_blinks,
  AVG(avg_ear) AS avg_ear,
  AVG(wellness_score) AS avg_wellness_score
FROM wellness_data
GROUP BY user_id, organization_id, day;

-- Refresh policy (update every hour)
SELECT add_continuous_aggregate_policy('wellness_1hour_rollup',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');
```

---

## Dashboard Queries

### User Dashboard (Personal stats)

```sql
-- Last 7 days of data (queries 7 rows, not 10,080 minute rollups)
SELECT day, avg_wellness_score, total_blinks
FROM wellness_1day_rollup
WHERE user_id = $1
  AND day >= NOW() - INTERVAL '7 days'
ORDER BY day ASC;
```

### Admin Dashboard (Team stats)

```sql
-- Team wellness score (queries 24 rows, not 1,440 × num_users)
SELECT
  o.name AS organization,
  AVG(w.avg_wellness_score) AS team_wellness_score,
  COUNT(DISTINCT w.user_id) AS active_users
FROM wellness_1hour_rollup w
JOIN organizations o ON w.organization_id = o.id
WHERE w.hour >= NOW() - INTERVAL '24 hours'
  AND w.organization_id = $1
GROUP BY o.name;

-- Department comparison
SELECT
  om.department,
  AVG(w.avg_wellness_score) AS dept_wellness_score
FROM wellness_1day_rollup w
JOIN org_members om ON w.user_id = om.user_id
WHERE w.day >= NOW() - INTERVAL '7 days'
  AND w.organization_id = $1
GROUP BY om.department
ORDER BY dept_wellness_score DESC;
```

---

## Data Reduction Summary

| Stage | Rows/User/Day | Storage/User/Day | Reduction |
|-------|---------------|------------------|-----------|
| **Raw blink events** | 2,592,000 | 104 MB | Baseline |
| **Minute rollups** | 1,440 | 86 KB | 99.92% |
| **Hourly rollups** | 24 | 1.4 KB | 99.999% |
| **Daily rollups** | 1 | 60 bytes | 99.9999% |

**At 100K users:**
- Raw: 10.4 TB/day → **Unmanageable**
- Minute: 8.6 GB/day → **Manageable**
- Hourly: 140 MB/day → **Dashboard queries**
- Daily: 6 MB/day → **Trend analysis**

---

## Privacy Guarantees

### What We Store

**Local (SQLite):**
- ✅ EAR values (eye openness ratio)
- ✅ Blink timestamps
- ✅ Wellness scores (calculated metric)
- ❌ NO images, NO video frames

**Cloud (Supabase):**
- ✅ Minute rollups (blink count, avg EAR)
- ✅ Wellness events (yawn, posture issues)
- ❌ NO raw blink events, NO individual frame data

### What We Never Store

- ❌ Camera images (processed in memory, discarded)
- ❌ Video recordings (not even temporarily)
- ❌ Individual blink timestamps (only counts per minute)
- ❌ Face recognition data (landmarks discarded after calculation)

---

## Error Handling & Offline Mode

### Offline Detection

```javascript
window.addEventListener('offline', () => {
  console.log('Cloud sync paused (offline)')
  // Continue local detection & storage
})

window.addEventListener('online', () => {
  console.log('Cloud sync resumed')
  syncWellnessData() // Immediate sync
})
```

### Sync Queue Retry

```javascript
async function syncWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await syncWellnessData()
      return
    } catch (error) {
      if (attempt === maxRetries) {
        console.error('Sync failed after 3 attempts:', error)
        // Data stays in local queue, will retry next cycle
      } else {
        await sleep(5000 * attempt) // Exponential backoff
      }
    }
  }
}
```

---

## Related Documentation

- **Database Schema:** [Full table definitions](../07-API-REFERENCE/DATABASE_SCHEMA.md)
- **Offline-First Design:** [Privacy & sync strategy](OFFLINE_FIRST_DESIGN.md)
- **Architecture Overview:** [System architecture](ARCHITECTURE_OVERVIEW.md)
- **Scaling Strategy:** [Handling 100K+ users](SCALING_STRATEGY.md)

---

**Questions?** See [Documentation Index](../INDEX.md) or review [Architecture Decision](ARCHITECTURE_DECISION.md) for rationale.
