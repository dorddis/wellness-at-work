# WellnessGuard - Final Architecture

**One document. Everything you need to build it.**

---

## The Product

Desktop wellness coach that monitors blink rate and posture using your webcam, alerts you when you need breaks, and shows trends on a web dashboard.

**Privacy guarantee:** No images ever leave your computer. Only metrics (12 blinks/min, posture score 75).

---

## Architecture Overview

```
                            YOUR COMPUTER
    +----------------------------------------------------------+
    |                                                          |
    |  +------------------+     +-------------------+          |
    |  |    CAMERA        | --> |    MediaPipe      |          |
    |  |    (30 FPS)      |     |    (478 landmarks)|          |
    |  +------------------+     +--------+----------+          |
    |                                    |                     |
    |                           +--------v----------+          |
    |                           |  Detection Engine |          |
    |                           |  - Blink (EAR)    |          |
    |                           |  - Posture        |          |
    |                           +--------+----------+          |
    |                                    |                     |
    |  +------------------+     +--------v----------+          |
    |  |   Alert Engine   | <-- |    SQLite DB      |          |
    |  |   (client-side)  |     |    (offline-first)|          |
    |  +--------+---------+     +--------+----------+          |
    |           |                        |                     |
    |           v                        | Every 5 min         |
    |    [Toast Alert]                   v                     |
    +----------------------------------------------------------+
                                         |
                                    HTTPS (batch)
                                         |
                                         v
                            +------------------------+
                            |       SUPABASE         |
                            |  - Auth (email/OAuth)  |
                            |  - PostgreSQL (data)   |
                            |  - Realtime (sync)     |
                            +------------+-----------+
                                         |
                                         v
                            +------------------------+
                            |    NEXT.JS DASHBOARD   |
                            |    (static, Vercel)    |
                            +------------------------+
```

---

## Tech Stack (Final Choices)

| Component | Choice | Why |
|-----------|--------|-----|
| Desktop App | **PyQt6** | Cross-platform, native look, rich CV ecosystem |
| Computer Vision | **MediaPipe FaceMesh** | 478 landmarks, works with glasses, 30+ FPS on CPU |
| Local Database | **SQLite (WAL mode)** | Offline-first, concurrent reads, no server needed |
| Backend | **Supabase** | Auth + DB + Realtime in one, generous free tier |
| Dashboard | **Next.js 14** | Static export = free hosting, fast |
| Packaging | **PyInstaller** (Win), **py2app** (Mac) | Single executable, no dependencies |

---

## The Critical Six Problems

These make or break the product. Must solve before anything else.

### 1. Glasses Detection (75% of users)
**Problem:** Reflections cause false positives, thick frames occlude landmarks.

**Solution:**
```python
# Only trust high-confidence detections
if detection_confidence > 0.7:
    process_blink(ear_value)
else:
    # Single-eye fallback when one eye is occluded
    if left_confidence > 0.7:
        process_blink(left_ear)
    elif right_confidence > 0.7:
        process_blink(right_ear)
```

### 2. Lighting Robustness (100% of users)
**Problem:** Backlit users, dim rooms, changing light throughout day.

**Solution:**
- Apply histogram equalization before MediaPipe
- Kalman filter to smooth noisy EAR values
- User can adjust sensitivity in settings

### 3. Alert Fatigue (kills every wellness app)
**Problem:** Constant alerts = user disables app within 2 weeks.

**Solution:**
- **Cooldowns:** No repeated alerts within 10 minutes
- **Flow detection:** Suppress alerts during high-activity periods
- **Escalation:** Info (dismiss) -> Warning (snooze) -> Critical (force break)
- **Summary mode:** Queue alerts, show summary at natural break

### 4. Privacy Perception (adoption blocker)
**Problem:** "Always-on camera" = visceral discomfort.

**Solution:**
- Camera LED stays off (we use frames only, no recording)
- Clear onboarding: "No images leave your computer"
- Settings: show what data is synced (only numbers)
- Optional: show live "proof" that only metrics are stored

### 5. Personal Baselines (everyone is different)
**Problem:** Normal blink rate = 10-22/min. Population average is wrong for most people.

**Solution:**
```python
# Auto-calibrate during first 2 hours
baseline = {
    'p25': percentile(blink_rates, 25),  # Low threshold
    'p50': percentile(blink_rates, 50),  # Normal
    'p75': percentile(blink_rates, 75),  # High threshold
}
# Alert when: current_rate < baseline['p25'] for 2+ minutes
```

### 6. Flow State Protection
**Problem:** Interrupting deep work destroys productivity and creates resentment.

**Solution:**
- Detect flow: declining blink rate + continuous activity
- Queue alerts during flow
- Show consolidated summary when flow ends
- Never interrupt for info-level alerts

---

## Data Model

### Local SQLite Schema

```sql
-- Raw events (delete after 24 hours)
CREATE TABLE blink_events (
    id INTEGER PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    ear_value REAL NOT NULL,
    is_blink BOOLEAN NOT NULL
);

-- Minute rollups (sync to cloud)
CREATE TABLE minute_rollups (
    id INTEGER PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    blink_count INTEGER NOT NULL,
    avg_ear REAL NOT NULL,
    posture_score INTEGER,
    synced BOOLEAN DEFAULT FALSE
);

-- Sync queue
CREATE TABLE sync_queue (
    id INTEGER PRIMARY KEY,
    rollup_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    FOREIGN KEY (rollup_id) REFERENCES minute_rollups(id)
);

-- User baseline (calibration)
CREATE TABLE user_baseline (
    id INTEGER PRIMARY KEY,
    blink_p25 REAL,
    blink_p50 REAL,
    blink_p75 REAL,
    posture_threshold REAL,
    calibrated_at DATETIME,
    samples_count INTEGER
);

-- Create indexes
CREATE INDEX idx_blink_events_time ON blink_events(timestamp);
CREATE INDEX idx_minute_rollups_sync ON minute_rollups(synced, timestamp);
```

### Supabase PostgreSQL Schema

```sql
-- Users (managed by Supabase Auth)
-- users table is auto-created by Supabase

-- User preferences
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    blink_threshold INTEGER DEFAULT 8,
    posture_alerts BOOLEAN DEFAULT TRUE,
    break_interval_minutes INTEGER DEFAULT 30,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    baseline JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wellness data (minute-level from clients)
CREATE TABLE wellness_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    blink_count INTEGER NOT NULL,
    avg_ear REAL,
    posture_score INTEGER,
    session_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create hypertable (if using TimescaleDB extension)
-- SELECT create_hypertable('wellness_data', 'timestamp');

-- Simple indexes for free tier (no TimescaleDB needed for MVP)
CREATE INDEX idx_wellness_user_time ON wellness_data(user_id, timestamp DESC);

-- Sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    total_blinks INTEGER DEFAULT 0,
    avg_blink_rate REAL,
    wellness_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts (for history)
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id),
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (CRITICAL)
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users access own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own wellness data" ON wellness_data
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own sessions" ON sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access own alerts" ON alerts
    FOR ALL USING (auth.uid() = user_id);
```

---

## Key Algorithms

### Blink Detection (from reference code)

```python
# Eye landmark indices (MediaPipe FaceMesh)
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]

EAR_THRESHOLD = 0.21  # Below = eyes closed
CONSEC_FRAMES = 2     # Frames to confirm blink

def eye_aspect_ratio(eye_landmarks):
    """
    EAR = (A + B) / (2.0 * C)
    A, B = vertical distances
    C = horizontal distance
    """
    A = distance(eye_landmarks[1], eye_landmarks[5])
    B = distance(eye_landmarks[2], eye_landmarks[4])
    C = distance(eye_landmarks[0], eye_landmarks[3])
    return (A + B) / (2.0 * C)

def detect_blink(ear, frame_counter):
    if ear < EAR_THRESHOLD:
        frame_counter += 1
    else:
        if frame_counter >= CONSEC_FRAMES:
            return True, 0  # Blink detected, reset counter
        frame_counter = 0
    return False, frame_counter
```

### Aggregation Strategy (the key to scaling)

```
Raw events: 30 FPS x 60 sec = 1,800 events/minute
Minute rollup: 1 row/minute = 1,440 rows/day
Daily rollup: 1 row/day = 30 rows/month

Data reduction: 99.97%
```

```python
def aggregate_minute(events):
    """Run every 60 seconds, store only the rollup"""
    blinks = [e for e in events if e['is_blink']]
    return {
        'timestamp': events[0]['timestamp'].replace(second=0),
        'blink_count': len(blinks),
        'avg_ear': mean([e['ear_value'] for e in events]),
        'posture_score': calculate_posture_score(events)
    }
```

### Alert Engine (client-side, <100ms)

```python
ALERT_RULES = {
    'low_blink_rate': {
        'condition': lambda rate, baseline: rate < baseline['p25'],
        'duration_required': 120,  # seconds
        'severity': 'warning',
        'cooldown': 600,  # 10 minutes
        'message': 'Your blink rate is low. Rest your eyes.'
    },
    'poor_posture': {
        'condition': lambda score, _: score < 50,
        'duration_required': 180,  # 3 minutes
        'severity': 'info',
        'cooldown': 900,  # 15 minutes
        'message': 'Posture check! Sit up straight.'
    },
    'long_session': {
        'condition': lambda duration, _: duration > 5400,  # 90 min
        'duration_required': 0,  # Trigger immediately
        'severity': 'info',
        'cooldown': 1800,  # 30 minutes
        'message': 'Time for a break! Stretch your legs.'
    }
}

class AlertEngine:
    def __init__(self):
        self.cooldowns = {}  # alert_type -> last_fired_time
        self.conditions_met = {}  # alert_type -> first_met_time

    def evaluate(self, current_data, baseline):
        for alert_type, rule in ALERT_RULES.items():
            # Check cooldown
            if self._in_cooldown(alert_type, rule['cooldown']):
                continue

            # Check condition
            if rule['condition'](current_data, baseline):
                if alert_type not in self.conditions_met:
                    self.conditions_met[alert_type] = time.time()

                # Check duration requirement
                elapsed = time.time() - self.conditions_met[alert_type]
                if elapsed >= rule['duration_required']:
                    self._fire_alert(alert_type, rule)
            else:
                self.conditions_met.pop(alert_type, None)
```

### Sync Strategy (offline-first)

```python
class SyncManager:
    def __init__(self, supabase_client):
        self.client = supabase_client
        self.batch_size = 100
        self.sync_interval = 300  # 5 minutes

    async def sync_pending(self):
        """Called every 5 minutes or when connectivity restored"""
        pending = db.execute("""
            SELECT r.* FROM minute_rollups r
            JOIN sync_queue q ON r.id = q.rollup_id
            WHERE r.synced = FALSE
            ORDER BY r.timestamp ASC
            LIMIT ?
        """, [self.batch_size])

        if not pending:
            return

        try:
            # Batch upsert (idempotent)
            await self.client.table('wellness_data').upsert(
                [self._to_cloud_format(r) for r in pending],
                on_conflict='id'
            )

            # Mark as synced
            ids = [r['id'] for r in pending]
            db.execute("""
                UPDATE minute_rollups SET synced = TRUE
                WHERE id IN (?)
            """, [ids])

        except Exception as e:
            # Will retry next sync cycle
            log.error(f"Sync failed: {e}")
```

---

## Project Structure

```
wellness-guard/
├── src/
│   ├── main.py                 # Entry point
│   ├── app.py                  # PyQt Application
│   │
│   ├── ui/
│   │   ├── main_window.py      # Main dashboard view
│   │   ├── login_dialog.py     # Supabase auth
│   │   ├── settings_dialog.py  # User preferences
│   │   ├── system_tray.py      # Tray icon + menu
│   │   └── styles.qss          # Dark theme (black/white/gray)
│   │
│   ├── detection/
│   │   ├── camera.py           # Camera capture (cv2)
│   │   ├── blink_detector.py   # MediaPipe + EAR calculation
│   │   └── posture_detector.py # Head position tracking
│   │
│   ├── core/
│   │   ├── session.py          # Session lifecycle
│   │   ├── alerts.py           # Alert engine (rules + cooldowns)
│   │   ├── baseline.py         # Auto-calibration
│   │   └── performance.py      # CPU/Memory/Power (psutil)
│   │
│   └── data/
│       ├── local_db.py         # SQLite operations
│       ├── sync.py             # Supabase sync manager
│       └── models.py           # Pydantic data classes
│
├── web-dashboard/              # Next.js app (separate folder)
│   ├── src/app/
│   │   ├── page.tsx            # Dashboard home
│   │   ├── settings/page.tsx   # User settings
│   │   └── export/page.tsx     # GDPR data export
│   └── ...
│
├── tests/
│   ├── test_blink_detector.py
│   ├── test_alerts.py
│   └── test_sync.py
│
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

## Implementation Plan

### Week 1: Core Desktop App

**Day 1-2: Detection Engine**
- [ ] PyQt6 project setup with dark theme
- [ ] Camera capture with cv2.VideoCapture
- [ ] MediaPipe FaceMesh integration
- [ ] Blink detection (EAR algorithm)
- [ ] Test with glasses and different lighting

**Day 3-4: Data & Storage**
- [ ] SQLite schema (events, rollups, queue)
- [ ] Minute aggregation worker (background thread)
- [ ] Session management (start, heartbeat, end)
- [ ] Basic local-only dashboard showing blink rate

**Day 5: Alerts**
- [ ] Alert rules engine (configurable thresholds)
- [ ] Cooldown system
- [ ] System tray notifications (toast)
- [ ] Flow state detection (basic: activity-based)

### Week 2: Cloud & Dashboard

**Day 6-7: Supabase Integration**
- [ ] Supabase project setup
- [ ] Auth (email + Google OAuth)
- [ ] PostgreSQL schema with RLS
- [ ] Sync manager (batch upload every 5 min)

**Day 8-9: Web Dashboard**
- [ ] Next.js project with Supabase client
- [ ] Dashboard page (charts, current status)
- [ ] Settings page (preferences, thresholds)
- [ ] GDPR page (export, delete)

**Day 10: Polish**
- [ ] Baseline auto-calibration
- [ ] Performance monitor (CPU, Memory, Power)
- [ ] Error handling and logging
- [ ] End-to-end testing

### Week 3-4: Production Ready

**Packaging**
- [ ] PyInstaller build script (Windows .exe)
- [ ] py2app build script (macOS .app)
- [ ] Auto-update mechanism (optional)

**Testing**
- [ ] 10 beta users for real-world testing
- [ ] Alert fatigue monitoring
- [ ] Bug fixes from feedback

**Documentation**
- [ ] README with screenshots
- [ ] Architecture diagram
- [ ] Setup instructions

---

## Cost Breakdown

| Users | Supabase Tier | Storage | Cost/Month | Per-User |
|-------|---------------|---------|------------|----------|
| 0-250 | Free | 500 MB | $0 | $0 |
| 251-1K | Pro | 2 GB | $25 | $0.025 |
| 1K-10K | Pro | 8 GB | $25 | $0.003 |
| 10K+ | Self-host | - | $60 (DigitalOcean) | $0.006 |

**Why so cheap?**
- Aggressive aggregation: 1,440 rows/user/day (not 2.6M)
- Static dashboard: Free Vercel hosting
- No custom backend: Supabase auto-generates API

---

## What We're NOT Building (MVP)

| Feature | Why Not Now | When |
|---------|-------------|------|
| Mobile app | Different codebase, not required | Phase 2 |
| Team dashboards | Not in requirements | If enterprise demand |
| Emotion detection | Complex ML, nice-to-have | Phase 3 |
| Real-time WebSocket | Polling is fine for dashboard | If latency matters |
| Redis/Event streaming | Overkill for <10K users | If scaling issues |

---

## Success Criteria

**Glasses:** >90% accuracy with glasses (thin + thick frames)

**Lighting:** Works backlit, works in low light, no manual adjustment needed

**Alert Fatigue:** >50% alerts acknowledged after 30 days

**Privacy:** >80% users enable camera on first session

**Baseline:** Auto-calibrates within 2 hours, >85% alert accuracy

**Flow State:** Zero interruptions during detected focus periods

---

## Interview Talking Points

1. **"Why PyQt6 over Electron?"**
   > Electron uses 500MB+ RAM for a webcam app. PyQt6 uses ~100MB. For always-on wellness monitoring, that matters.

2. **"Why not use a proper event streaming system?"**
   > Redis Streams adds operational complexity. SQLite + batch sync handles 10K users fine. I'd add event streaming at 50K+ users when the cost savings justify it.

3. **"How do you handle offline users?"**
   > Offline-first design. SQLite queues everything locally. When online, batch sync every 5 minutes. Users can work for 8 hours offline and sync when they reconnect.

4. **"What about the Critical Six challenges?"**
   > I identified the 6 problems that kill wellness apps: glasses, lighting, alert fatigue, privacy perception, baselines, and flow state. Each has a research-backed solution.

5. **"Why is this better than existing wellness apps?"**
   > Most apps use population averages (10-22 blinks/min). I auto-calibrate to YOUR baseline in 2 hours. Most apps alert during meetings. I detect flow state and queue alerts.

---

## Files in This Folder

This is the only architecture document you need. The others were exploration.

**To build:**
1. Read this document
2. Follow the Implementation Plan
3. Refer to code snippets for algorithms
4. Test against Success Criteria

**Previous documents (for reference only):**
- `../ARCHITECTURE_PROPOSAL.md` - Full exploration (verbose)
- `../CRITICAL_CHALLENGES.md` - Problem analysis
- `../SCALE_CHALLENGES_FILTERED.md` - Scaling considerations

---

**Boring technology. Shipped fast. Solves real problems.**
