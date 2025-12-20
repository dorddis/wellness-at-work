# WellnessGuard - Pragmatic System Architecture

**Philosophy:** "What's the simplest thing that could possibly work?"

This architecture solves the Critical Six challenges and 10 scaling challenges using boring, proven technology with minimal moving parts.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Technology Choices](#technology-choices)
3. [Data Flow](#data-flow)
4. [Critical Six Solutions](#critical-six-solutions)
5. [Scaling Challenge Solutions](#scaling-challenge-solutions)
6. [Trade-offs & Limitations](#trade-offs--limitations)
7. [Cost Estimates](#cost-estimates)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         DESKTOP APP                              │
│                   (PyQt6 - Windows/macOS)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ON-DEVICE PROCESSING (100%)                  │  │
│  │                                                            │  │
│  │  MediaPipe FaceMesh (478 landmarks)                       │  │
│  │    ├─ Blink Detection (EAR algorithm)                     │  │
│  │    ├─ Posture Detection (head position/tilt)             │  │
│  │    └─ Glasses Handling (landmark confidence filtering)   │  │
│  │                                                            │  │
│  │  Preprocessing:                                           │  │
│  │    ├─ Zero-DCE Light Enhancement (backlighting)          │  │
│  │    ├─ Contrast Normalization (shadows)                   │  │
│  │    └─ Adaptive Histogram Equalization                    │  │
│  │                                                            │  │
│  │  NO IMAGES LEAVE DEVICE - Only metrics extracted         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           SMART ALERT ENGINE (Client-side)                │  │
│  │                                                            │  │
│  │  Personal Baseline:                                       │  │
│  │    ├─ First 2 hours: Learn user's normal blink rate     │  │
│  │    ├─ Auto-calibrate: P50 baseline, P25/P75 thresholds  │  │
│  │    └─ Adaptive: Recalibrate weekly                      │  │
│  │                                                            │  │
│  │  Context Awareness:                                       │  │
│  │    ├─ Calendar API: Check upcoming 15 min for meetings   │  │
│  │    ├─ Focus Detection: Low blink + no breaks = flow     │  │
│  │    ├─ Quiet Hours: User-defined no-alert periods        │  │
│  │    └─ Alert Cooldown: 10-20 min between same type       │  │
│  │                                                            │  │
│  │  Alert Timing Rules:                                      │  │
│  │    ├─ NEVER during meetings (calendar check)            │  │
│  │    ├─ DEFER during flow state (queue for later)         │  │
│  │    ├─ BATCH multiple alerts into single notification    │  │
│  │    └─ PROGRESSIVE severity (info → warning → critical)  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        LOCAL DATABASE (SQLite - Offline Queue)            │  │
│  │                                                            │  │
│  │  Raw data retention: 24 hours only                        │  │
│  │    ├─ blink_events (timestamp, ear_value)                │  │
│  │    ├─ posture_samples (timestamp, head_pos, score)       │  │
│  │    └─ sync_queue (pending cloud uploads)                 │  │
│  │                                                            │  │
│  │  Pre-aggregated: Permanent                                │  │
│  │    ├─ minute_rollups (1 min averages)                    │  │
│  │    ├─ session_summaries                                   │  │
│  │    └─ daily_summaries                                     │  │
│  │                                                            │  │
│  │  Auto-cleanup: Delete raw data > 24h old                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              SYNC WORKER (Background Thread)              │  │
│  │                                                            │  │
│  │  Batched upload every 5 minutes:                          │  │
│  │    ├─ Collect last 5 min of minute_rollups               │  │
│  │    ├─ Package into single batch (idempotency key)        │  │
│  │    ├─ POST to Supabase with retry (3 attempts)           │  │
│  │    ├─ Mark synced records, delete from queue             │  │
│  │    └─ Exponential backoff on failure                     │  │
│  │                                                            │  │
│  │  Offline handling:                                        │  │
│  │    ├─ Queue batches in SQLite (up to 7 days)            │  │
│  │    ├─ On reconnect: Sync oldest batches first           │  │
│  │    └─ Rate limit: Max 10 batches/min on reconnect       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────┬───────────────────────────────────────────┘
                       │ HTTPS (Batch API calls only)
                       │ Data sent: Pre-aggregated metrics
                       │ NO raw video, NO individual frames
                       │
┌──────────────────────┴───────────────────────────────────────────┐
│                      SUPABASE (Cloud Backend)                     │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           PostgreSQL + TimescaleDB Extension              │   │
│  │                                                            │   │
│  │  Hypertables (time-series optimized):                     │   │
│  │    ├─ minute_data (user_id, timestamp, metrics)          │   │
│  │    ├─ session_data (start, end, summary)                 │   │
│  │    └─ alert_history (type, timestamp, dismissed)         │   │
│  │                                                            │   │
│  │  Continuous Aggregates (auto-maintained):                 │   │
│  │    ├─ hourly_rollups (1 hour averages)                   │   │
│  │    ├─ daily_rollups (1 day summaries)                    │   │
│  │    └─ weekly_rollups (7 day trends)                      │   │
│  │                                                            │   │
│  │  Retention Policies:                                      │   │
│  │    ├─ minute_data: 30 days (auto-delete older)           │   │
│  │    ├─ hourly_rollups: 6 months                           │   │
│  │    ├─ daily_rollups: Forever (cheap storage)             │   │
│  │    └─ GDPR delete: Cascade all user data                 │   │
│  │                                                            │   │
│  │  Indexes:                                                  │   │
│  │    ├─ (user_id, timestamp DESC) on all tables            │   │
│  │    └─ (session_id) for session queries                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Supabase Auth                           │   │
│  │    ├─ Email/Password                                      │   │
│  │    ├─ Google OAuth                                        │   │
│  │    └─ JWT tokens (auto-refresh)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Supavisor (Connection Pooler)                │   │
│  │    ├─ Transaction mode (port 6543)                        │   │
│  │    ├─ Pool size: 40 connections                           │   │
│  │    └─ Handles burst traffic automatically                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                Edge Functions (Optional)                  │   │
│  │    ├─ GDPR export generator (CSV/JSON)                   │   │
│  │    ├─ Weekly summary email (if time permits)             │   │
│  │    └─ Batch upload validator (dedupe check)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────┬───────────────────────────────────────────┘
                        │ HTTPS
                        │
┌───────────────────────┴───────────────────────────────────────────┐
│                    WEB DASHBOARD (Next.js 14)                     │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Static Site (Vercel/Netlify free tier):                         │
│    ├─ Client-side queries to Supabase PostgREST API             │
│    ├─ Charts: Recharts (queries daily_rollups only)             │
│    ├─ Real-time: Supabase Realtime (session status only)        │
│    └─ No custom backend needed                                   │
│                                                                   │
│  Pages:                                                           │
│    ├─ /login (Supabase Auth UI)                                 │
│    ├─ /dashboard (today's summary, live score)                  │
│    ├─ /history (charts from rollups, not raw data)              │
│    ├─ /settings (preferences, GDPR export/delete)               │
│    └─ /export (generate CSV from aggregated data)               │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

**Key Principles:**
1. **Privacy-first:** All CV processing on-device, no images to cloud
2. **Offline-first:** App works 100% offline, syncs when online
3. **Simple stack:** PyQt + Supabase + Next.js (3 technologies total)
4. **Boring tech:** PostgreSQL, not fancy streaming systems
5. **Client-heavy:** Most logic in desktop app (easier to debug)

---

## Technology Choices

### Desktop App: PyQt6 (Python)

**Why:**
- Cross-platform (Windows/macOS) with native look
- Rich ecosystem for CV (MediaPipe, OpenCV)
- Easy SQLite integration for offline queue
- Mature packaging (PyInstaller, py2app)

**Alternatives rejected:**
- ❌ Electron: 200MB+ bundle size, memory hog
- ❌ Rust/Tauri: Steep learning curve, fewer CV libraries
- ❌ .NET MAUI: Vendor lock-in, poor Linux support

### Computer Vision: MediaPipe FaceMesh

**Why:**
- Battle-tested: 478 landmarks, works with glasses ([research](https://research.google/blog/mediapipe-iris-real-time-iris-tracking-depth-estimation/))
- Lightweight: 30-60 FPS on CPU, no GPU needed
- Glasses handling: 4.8% error with glasses vs 4.3% without ([study](https://research.google/blog/mediapipe-iris-real-time-iris-tracking-depth-estimation/))
- Open-source, permissive license

**Enhancements:**
- **Zero-DCE light enhancement**: Handles backlighting ([2024 study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11784707/))
- **Kalman filter smoothing**: Reduces jitter in poor lighting ([research](https://www.atlantis-press.com/proceedings/icsice-24/126011300))
- **Confidence thresholding**: Ignore low-confidence landmarks (reflections)

**Alternatives rejected:**
- ❌ Dlib: Worse than MediaPipe ([comparison](https://pmc.ncbi.nlm.nih.gov/articles/PMC11784707/))
- ❌ OpenCV Haar Cascades: Can't handle modern challenges
- ❌ Custom ML model: Overkill, weeks of training time

### Backend: Supabase (PostgreSQL as a Service)

**Why:**
- **All-in-one:** Auth + Database + Storage + Realtime
- **Built-in connection pooling:** Supavisor handles bursts ([docs](https://supabase.com/docs/guides/database/connection-management))
- **Generous free tier:** 500MB DB, 50K MAU, 2GB bandwidth
- **Easy GDPR:** Built-in Row Level Security (RLS)
- **TimescaleDB support:** Time-series extension available

**What we avoid:**
- ❌ Building custom auth (weeks of work)
- ❌ Managing PostgreSQL server (DevOps overhead)
- ❌ Writing connection pooler (complex)
- ❌ Configuring HTTPS/SSL (handled)

**Cost vs. self-hosting:**
- Supabase Pro: $25/month (8GB DB, 100GB bandwidth)
- AWS RDS equivalent: $50-100/month + DevOps time
- **Winner:** Supabase until 10K+ users

### Time-Series: TimescaleDB Extension

**Why:**
- **Native PostgreSQL extension:** No new database to learn
- **Automatic partitioning:** Hypertables split by time chunks
- **Continuous aggregates:** Pre-computed rollups ([guide](https://www.mindee.com/blog/aggregate-time-series-data-with-timescaledb))
- **Retention policies:** One-line config to auto-delete old data ([docs](https://medium.com/@anowerhossain97/automating-data-retention-with-add-retention-policy-in-timescale-for-postgresql-eacfeb341562))

**Example:**
```sql
-- Create hypertable
SELECT create_hypertable('minute_data', 'timestamp');

-- Auto-delete data > 30 days
SELECT add_retention_policy('minute_data', INTERVAL '30 days');

-- Auto-refresh hourly rollups
SELECT add_continuous_aggregate_policy('hourly_rollups',
  start_offset => INTERVAL '1 day',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');
```

**Alternatives rejected:**
- ❌ InfluxDB: Separate database to manage, worse SQL support
- ❌ Prometheus: Not designed for user-facing queries
- ❌ Pure PostgreSQL: Manual partitioning is complex

### Offline Sync: SQLite + Batch API

**Why:**
- **SQLite:** Zero-config, 140KB library, works offline
- **Batch uploads:** Group 5 min of data per request (reduce API calls)
- **Idempotency:** Each batch has UUID, safe to retry ([pattern](https://www.sqliteforum.com/p/building-offline-first-applications))
- **PowerSync pattern:** Upload queue + checkpointing ([tool](https://www.powersync.com/blog/introducing-powersync-v1-0-postgres-sqlite-sync-layer))

**Why NOT PowerSync/SQLiteSync:**
- ❌ Overkill for one-way sync (device → cloud mostly)
- ❌ Added complexity for bidirectional sync we don't need
- ✅ Simple batch API is 100 lines of code

### Dashboard: Next.js 14 (React)

**Why:**
- **Static export:** Deploy to Vercel/Netlify for free
- **Client-side queries:** PostgREST API from browser (no backend)
- **Fast:** App Router + Server Components for speed
- **Recharts:** Simple charting library, works with aggregated data

**What we avoid:**
- ❌ Building REST API (Supabase PostgREST auto-generated)
- ❌ Server costs (static site = free hosting)
- ❌ Backend deployment (Vercel does it)

---

## Data Flow

### 1. Blink Detection → Storage (Real-time)

```
┌─────────────┐
│ Camera      │
│ 640x480 @30 │
│ FPS         │
└──────┬──────┘
       │ Frame (every 33ms)
       ▼
┌─────────────────────────────────────────┐
│ Preprocessing (if lighting bad)         │
│   Zero-DCE enhancement (5ms)            │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ MediaPipe FaceMesh (10ms)               │
│   478 landmarks                          │
│   Confidence scores                      │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Blink Detection (EAR algorithm)         │
│   Left EAR: (|p2-p6| + |p3-p5|) /       │
│             (2 * |p1-p4|)               │
│   Right EAR: Same formula               │
│   Avg EAR: (Left + Right) / 2           │
│                                          │
│   IF Avg EAR < 0.2: Blink detected      │
└──────┬──────────────────────────────────┘
       │ Every blink event
       ▼
┌─────────────────────────────────────────┐
│ SQLite: blink_events table              │
│   (timestamp, ear_value)                │
│                                          │
│ Retention: 24 hours only                │
└──────┬──────────────────────────────────┘
       │ Every 1 minute
       ▼
┌─────────────────────────────────────────┐
│ Aggregator (Background Thread)          │
│   Count blinks in last 60 seconds       │
│   Calculate: blinks/min, avg EAR        │
│   → SQLite: minute_rollups              │
│   → Trigger: Check alert rules          │
└──────┬──────────────────────────────────┘
       │ Every 5 minutes
       ▼
┌─────────────────────────────────────────┐
│ Sync Worker                              │
│   Collect last 5 minute_rollups         │
│   Create batch: {                        │
│     batch_id: "uuid",                    │
│     user_id: "...",                      │
│     data: [{ts, blinks, ear}, ...]       │
│   }                                      │
│   POST /api/sync/batch                   │
└──────┬──────────────────────────────────┘
       │ HTTPS
       ▼
┌─────────────────────────────────────────┐
│ Supabase Edge Function (optional)       │
│   Validate batch_id (dedupe check)      │
│   INSERT INTO minute_data VALUES (...)  │
│   Return: {synced: 5, duplicates: 0}    │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ PostgreSQL (TimescaleDB)                │
│   minute_data hypertable                │
│                                          │
│ Automatic processes:                     │
│   - Continuous aggregate → hourly_rollups│
│   - Retention policy → delete > 30 days  │
└─────────────────────────────────────────┘
```

**Data sizes:**
- Raw event: 16 bytes (timestamp + EAR)
- Minute rollup: 40 bytes (timestamp + 5 metrics)
- Per user per day: 40 bytes × 1440 min = ~58 KB
- 1000 users × 30 days = 1.7 GB (fits free tier!)

### 2. Alert Decision Flow (Client-side)

```
┌─────────────────────────────────────────┐
│ Every 1 minute: New rollup calculated   │
│   Current blink rate: 7/min             │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Check Personal Baseline                 │
│   User's P50 (median): 15/min           │
│   User's P25 (low threshold): 11/min    │
│                                          │
│   7 < 11? YES → Potential alert         │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Check Alert Cooldown                    │
│   Last "low blink" alert: 8 min ago     │
│   Cooldown period: 10 min               │
│                                          │
│   8 < 10? YES → Still in cooldown       │
│   → Skip this alert                      │
└──────┬──────────────────────────────────┘
       │ (If cooldown expired)
       ▼
┌─────────────────────────────────────────┐
│ Check Calendar (OS API)                 │
│   Query: Meetings in next 15 min?       │
│                                          │
│   Result: "Team standup at 10:00"       │
│   Current time: 09:47                   │
│                                          │
│   Meeting in 13 min? YES                │
│   → Defer alert until after meeting     │
└──────┬──────────────────────────────────┘
       │ (If no meeting)
       ▼
┌─────────────────────────────────────────┐
│ Check Flow State                         │
│   Last 30 min activity:                  │
│     - Blink rate: Declining (15→12→9→7) │
│     - Posture: Stable (leaning forward)  │
│     - Breaks: None                       │
│                                          │
│   Flow state detected? YES               │
│   → Queue alert for end of flow         │
│   → Set timer: Check again in 15 min    │
└──────┬──────────────────────────────────┘
       │ (If not in flow, send alert)
       ▼
┌─────────────────────────────────────────┐
│ Display Alert (OS Notification)          │
│   "Your blink rate is low (7/min).      │
│    Try the 20-20-20 rule."               │
│                                          │
│   [Dismiss]  [Remind in 10 min]          │
│                                          │
│ Log to SQLite: alert_history             │
└─────────────────────────────────────────┘
```

**Alert fatigue prevention** ([research](https://www.magicbell.com/blog/how-to-use-attention-resistance-to-fight-notification-fatigue)):
- Timely: Only when user can act (not during meetings)
- Personal: Based on individual baseline, not population average
- Actionable: Clear guidance (20-20-20 rule)
- Adaptive: Learn from dismissals (increase cooldown if always dismissed)

### 3. Dashboard Query Flow

```
┌─────────────────────────────────────────┐
│ User opens dashboard: "Last 7 days"     │
└──────┬──────────────────────────────────┘
       │ HTTPS
       ▼
┌─────────────────────────────────────────┐
│ Next.js Client (Browser)                │
│   Supabase JS client                    │
│   Query: daily_rollups table            │
│     WHERE user_id = $1                  │
│     AND date >= NOW() - '7 days'        │
│     ORDER BY date DESC                  │
└──────┬──────────────────────────────────┘
       │ HTTPS (PostgREST API)
       ▼
┌─────────────────────────────────────────┐
│ Supabase PostgREST                      │
│   Auto-generated REST API               │
│   Row Level Security (RLS):             │
│     user_id = auth.uid()                │
└──────┬──────────────────────────────────┘
       │ SQL query
       ▼
┌─────────────────────────────────────────┐
│ PostgreSQL (TimescaleDB)                │
│   Query: daily_rollups                  │
│   Result: 7 rows × 200 bytes = 1.4 KB   │
│                                          │
│   Index used: (user_id, date DESC)      │
│   Query time: <10ms                     │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Browser: Render charts (Recharts)       │
│   Line chart: Blink rate over time      │
│   Bar chart: Wellness score per day     │
│   Heatmap: Posture quality by hour      │
└─────────────────────────────────────────┘
```

**Why fast:**
- Daily rollups: 7 rows, not 10,080 minute records
- Pre-aggregated: No COUNT(), AVG() on raw data
- Indexed: (user_id, date) index covers query
- Small payload: 1.4 KB vs 400+ KB for raw data

---

## Critical Six Solutions

### 1. Glasses Detection Failure

**Problem:** 75% of users wear glasses, causing reflections and occlusions.

**Solution:**

1. **MediaPipe landmark confidence filtering:**
   ```python
   # Only use landmarks with confidence > 0.7
   for landmark in face_landmarks:
       if landmark.visibility > 0.7:
           use_for_blink_calculation()
   ```

2. **Fallback to single eye if other obscured:**
   ```python
   left_ear = calculate_ear(left_eye_landmarks)
   right_ear = calculate_ear(right_eye_landmarks)

   # Use both if available
   if left_ear.confidence > 0.7 and right_ear.confidence > 0.7:
       return (left_ear + right_ear) / 2
   # Fallback to best eye
   elif left_ear.confidence > 0.7:
       return left_ear
   else:
       return right_ear
   ```

3. **User calibration during onboarding:**
   - "Please blink 10 times normally"
   - Measure EAR range with user's glasses
   - Store personalized EAR threshold (vs. generic 0.2)

**Research backing:**
- MediaPipe with glasses: 4.8% error vs 4.3% without ([Google study](https://research.google/blog/mediapipe-iris-real-time-iris-tracking-depth-estimation/))
- Calibration improves accuracy significantly ([research](https://blog.roboflow.com/build-eye-tracking-in-browser/))

**Testing plan:**
- Test with 10 users: No glasses, thin frames, thick frames, transition lenses
- Success metric: >90% blink detection accuracy across all types

### 2. Lighting Robustness

**Problem:** Backlighting, shadows, changing natural light.

**Solution:**

1. **Zero-DCE preprocessing ([2024 study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11784707/)):**
   ```python
   if lighting_quality_poor():  # Check image histogram
       enhanced_frame = zero_dce_enhance(frame)
   else:
       enhanced_frame = frame  # Skip if lighting OK
   ```

2. **Adaptive histogram equalization (CLAHE):**
   - Improves contrast in shadowed eye regions
   - Reduces glare from overhead lighting

3. **Kalman filter for temporal smoothing:**
   - Reduces false positives from momentary lighting changes
   - Averages EAR over 5 frames (166ms window)

**Research backing:**
- Zero-DCE improves detection in low light ([Zhou 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC11784707/))
- Kalman filter increases robustness ([study](https://www.atlantis-press.com/proceedings/icsice-24/126011300))

**Testing plan:**
- Record 10 min video in each condition: Morning bright, afternoon glare, backlit, monitor-only
- Success metric: <5% difference in detection accuracy across conditions

### 3. Alert Fatigue & Timing

**Problem:** Users ignore alerts within 2 weeks (notification blindness).

**Solution:**

1. **Calendar integration (native OS APIs):**
   - macOS: EventKit framework
   - Windows: Outlook COM API or Windows Calendar
   - Check meetings in next 15 min before alerting

2. **Flow state detection:**
   ```python
   def is_in_flow_state():
       last_30_min = get_activity(minutes=30)
       return (
           last_30_min.blink_rate_declining and  # Focus increasing
           last_30_min.breaks == 0 and           # No interruptions
           last_30_min.posture_stable            # Deep engagement
       )
   ```

3. **Progressive cooldown:**
   - First alert dismissed: Wait 10 min
   - Second dismissed: Wait 20 min (user busy)
   - Third dismissed: Wait 60 min (likely false positive)
   - Reset cooldown after user takes action

4. **Batched alerts:**
   - Don't send 3 separate notifications for posture, blink, break
   - Wait 2 min, batch into one: "3 wellness tips for you"

**Research backing:**
- 50% increase in response with personalized timing ([study](https://www.magicbell.com/blog/how-to-use-attention-resistance-to-fight-notification-fatigue))
- Calendar integration reduces interruptions ([Flowtrace](https://www.flowtrace.co/))
- Batching reduces 78% of users deleting apps ([research](https://www.magicbell.com/blog/alert-fatigue))

**Testing plan:**
- 30-day user study: Track acknowledgment rate
- Success metric: >50% alerts still acknowledged after 30 days

### 4. Privacy/Surveillance Perception

**Problem:** "Always-on camera" triggers discomfort.

**Solution:**

1. **100% on-device processing ([architecture](https://viso.ai/viso-suite/privacy/)):**
   - NO frames sent to cloud (only metrics: blinks/min, posture score)
   - Show in UI: "No images leave this computer"

2. **Visual privacy indicators:**
   - Green LED in menu bar: "Local processing only"
   - Overlay on camera feed: "No recording, no uploads"

3. **Transparent data model:**
   ```
   What leaves your device:
   ✓ Blink rate: 12/min
   ✓ Posture score: 75/100
   ✓ Session duration: 2h 30m

   What NEVER leaves your device:
   ✗ Camera frames
   ✗ Eye images
   ✗ Face images
   ✗ Screen content
   ```

4. **GDPR compliance built-in:**
   - Data export: One-click CSV download
   - Data deletion: Cascade delete all user data
   - Consent: Required on first launch with clear explanation

**Research backing:**
- Edge AI increases trust ([study](https://viso.ai/evaluation-guide/privacy/))
- 80%+ adoption when privacy explained upfront ([research](https://viso.ai/deep-learning/privacy-preserving-deep-learning-for-computer-vision/))

**Testing plan:**
- A/B test onboarding screens: Privacy-first messaging vs. feature-first
- Success metric: >80% enable camera in first session

### 5. Individual Baseline Calibration

**Problem:** "Normal" blink rate varies 10-22/min across healthy people.

**Solution:**

1. **Automatic calibration during first 2 hours:**
   ```python
   if user.total_usage_time < 2 * 60 * 60:  # First 2 hours
       collect_baseline_data()

   if user.baseline_samples >= 120:  # 2 hours of 1-min samples
       calculate_personalized_baseline()
   ```

2. **Percentile-based thresholds ([research](https://pmc.ncbi.nlm.nih.gov/articles/PMC10289192/)):**
   ```python
   baseline = {
       'p50': 15.2,  # User's median blink rate
       'p25': 11.8,  # Low threshold (alert if below)
       'p75': 18.6,  # High threshold (unusually high)
   }

   # Alert if 2+ min below P25
   if current_rate < baseline['p25'] for 2 minutes:
       trigger_alert()
   ```

3. **Weekly re-calibration:**
   - Baseline shifts due to seasons (dry winter air)
   - Medication changes (ADHD meds, antidepressants)
   - LASIK recovery period
   - Slowly update baseline: `new = 0.9 * old + 0.1 * recent_median`

4. **Contextual baselines:**
   - Morning baseline: 16/min (well-rested)
   - Afternoon baseline: 14/min (normal fatigue)
   - Evening baseline: 12/min (tired)

**Research backing:**
- Personalized thresholds improve accuracy 15% ([study](https://www.sciencedirect.com/science/article/abs/pii/S0933365722001737))
- Individual baselines outperform population norms ([research](https://www.fortunejournals.com/articles/personalized-baselines-in-vital-signs-insights-from-wearablederived-sleep-data-in-healthy-adults.html))
- Auto-adaptive thresholds reduce false positives ([Dynatrace](https://docs.dynatrace.com/docs/discover-dynatrace/platform/davis-ai/anomaly-detection/concepts/auto-adaptive-threshold))

**Testing plan:**
- Compare alerts with population baseline (15/min) vs. personal baseline
- Success metric: >85% of alerts feel accurate to user

### 6. Flow State Interruption

**Problem:** Breaking deep focus = 23 min to recover context.

**Solution:**

1. **Flow state detection algorithm:**
   ```python
   def detect_flow_state():
       last_30_min = get_metrics(minutes=30)

       indicators = {
           'declining_blink_rate': last_30_min.blink_trend < -0.1,  # Increasing focus
           'stable_posture': last_30_min.posture_variance < 5,       # Not fidgeting
           'no_breaks': last_30_min.movement_events == 0,            # Continuous work
           'consistent_gaze': last_30_min.head_position_variance < 10 # Not distracted
       }

       return sum(indicators.values()) >= 3  # 3 out of 4 indicators
   ```

2. **Deferred alert queue:**
   - Alerts during flow → Silent queue
   - Show count in menu bar: "3 wellness tips (paused)"
   - On flow end (break detected or session end) → Show batched summary

3. **User-controlled focus mode:**
   - Manual toggle: "Focus for 90 min"
   - Calendar integration: "No alerts during 'Deep Work' blocks"
   - Smart end: If focus period set for 90 min but flow ends at 60 min, allow alerts

**Research backing:**
- Flow detection via declining blink rate ([study](https://www.flowtrace.co/))
- Interruption recovery time: 23 min ([research](https://www.flowtrace.co/))

**Testing plan:**
- Developer users: Track interruptions during coding sessions
- Success metric: Zero interruptions during user-defined focus periods

---

## Scaling Challenge Solutions

### 1. Offline Queue & Sync Storm

**Problem:** 500 users offline 2 hours = 54M records on reconnect.

**Solution:**

1. **Aggressive client-side aggregation:**
   - Store only minute_rollups in SQLite (not raw blinks)
   - 500 users × 120 min × 40 bytes = 2.4 MB (not 54M records!)

2. **Rate-limited sync ([pattern](https://www.powersync.com/blog/introducing-powersync-v1-0-postgres-sqlite-sync-layer)):**
   ```python
   def sync_on_reconnect():
       batches = get_pending_batches()  # Oldest first

       for batch in batches:
           upload_batch(batch)
           sleep(6)  # Max 10 batches/min

           if server_returns_429():  # Rate limited
               exponential_backoff()
   ```

3. **Supavisor auto-scaling:**
   - Connection pooler handles burst traffic automatically
   - Transaction mode: Quick connections, released immediately

**Why it works:**
- Minute rollups: 100x fewer records
- Rate limiting: 10 batches/min = 600 batches/hour = manageable
- Pooler: 40 connections shared across all users

### 2. Write Path & Connection Limits

**Problem:** 1,000 users × 30 writes/sec = connection exhaustion.

**Solution:**

1. **Batched writes (5-min intervals):**
   - Not 30 writes/sec per user
   - 1 write per 5 min per user
   - 1,000 users → 200 writes/min → 3.3 writes/sec (trivial)

2. **Supavisor transaction pooling:**
   - Pool size: 40 connections
   - Each write: Borrow connection, INSERT, return (20ms)
   - Throughput: 40 connections × 50 writes/sec each = 2,000 writes/sec

3. **Async Edge Function (if needed):**
   ```javascript
   // Supabase Edge Function
   export default async (req) => {
     const batch = await req.json();

     // Single INSERT with array
     await supabase.from('minute_data').insert(batch.data);

     return new Response(JSON.stringify({ synced: batch.data.length }));
   };
   ```

**Why it works:**
- Batching: 99% reduction in write frequency
- Pooling: Shares 40 connections across all users
- Single INSERT: One query for 5 records, not 5 queries

### 3. Data Volume & Retention Policy

**Problem:** 1,000 users × 30 days = 25.9 billion rows (unbounded growth).

**Solution:**

1. **TimescaleDB retention policy ([docs](https://medium.com/@anowerhossain97/automating-data-retention-with-add-retention-policy-in-timescale-for-postgresql-eacfeb341562)):**
   ```sql
   -- Minute data: 30 days
   SELECT add_retention_policy('minute_data', INTERVAL '30 days');

   -- Hourly rollups: 6 months
   SELECT add_retention_policy('hourly_rollups', INTERVAL '6 months');

   -- Daily rollups: Forever (tiny size)
   -- No retention policy
   ```

2. **Storage calculation:**
   - Minute data: 1,000 users × 1,440 min/day × 30 days × 40 bytes = 1.7 GB
   - Hourly rollups: 1,000 × 24 hr/day × 180 days × 60 bytes = 259 MB
   - Daily rollups: 1,000 × 365 days × 80 bytes = 29 MB
   - **Total: 2 GB** (fits free tier with headroom!)

3. **Automatic cleanup job:**
   - TimescaleDB runs retention policy nightly
   - No manual intervention needed

**Why it works:**
- Retention policies: Auto-delete old data
- Tiered storage: Minute → Hourly → Daily (increasing compression)
- Forever storage cheap: 29 MB/year for 1,000 users

### 4. Dashboard Query Performance

**Problem:** "Last 30 days" = 25.9M rows per user.

**Solution:**

1. **Query pre-aggregated data:**
   ```javascript
   // DON'T: Query minute_data (25.9M rows)
   const { data } = await supabase
     .from('minute_data')
     .select('*')
     .gte('timestamp', thirtyDaysAgo);  // Slow!

   // DO: Query daily_rollups (30 rows)
   const { data } = await supabase
     .from('daily_rollups')
     .select('*')
     .gte('date', thirtyDaysAgo);  // Fast!
   ```

2. **Continuous aggregates ([guide](https://www.mindee.com/blog/aggregate-time-series-data-with-timescaledb)):**
   ```sql
   CREATE MATERIALIZED VIEW daily_rollups
   WITH (timescaledb.continuous) AS
     SELECT
       user_id,
       time_bucket('1 day', timestamp) AS date,
       AVG(blink_rate) AS avg_blink_rate,
       AVG(posture_score) AS avg_posture_score,
       -- ... other metrics
     FROM minute_data
     GROUP BY user_id, date;

   -- Auto-refresh every hour
   SELECT add_continuous_aggregate_policy('daily_rollups',
     start_offset => INTERVAL '1 day',
     end_offset => INTERVAL '1 hour',
     schedule_interval => INTERVAL '1 hour');
   ```

3. **Client-side charting limits:**
   - Max 1,000 points per chart (browsers can't render millions)
   - 30 days daily: 30 points (perfect)
   - 7 days hourly: 168 points (fast)
   - 24 hours minute: 1,440 points (use every 5 min = 288 points)

**Why it works:**
- Query 30 rows, not 25.9M rows (999,666x faster)
- Continuous aggregates: Pre-computed, always up-to-date
- Charting: Small payload, instant render

### 5. Real-Time Alert Latency

**Problem:** Can't query database every second for every user.

**Solution:**

1. **Client-side alert engine (no server queries):**
   - All alert logic runs in desktop app
   - Every minute: Check local SQLite for thresholds
   - No network latency, instant response

2. **Personal baseline stored locally:**
   - Sync baseline to cloud (backup)
   - Load on app startup
   - No real-time query needed

3. **Calendar check (local API):**
   - OS calendar API: <10ms response
   - Query once per minute (not per second)

**Why it works:**
- Client-side: Zero server load for alerts
- Local SQLite: Microsecond queries
- No network: Alerts fire within seconds, not minutes

### 6. GDPR Deletion at Scale

**Problem:** 25M rows per user, DELETE with foreign key cascades.

**Solution:**

1. **TimescaleDB chunk-aware deletion:**
   - Hypertables partitioned by time chunks (1 week each)
   - Delete entire chunks if user's only data
   - Much faster than row-by-row DELETE

2. **Soft delete + background cleanup:**
   ```sql
   -- Immediate: Mark deleted
   UPDATE users SET deleted_at = NOW() WHERE id = $1;

   -- Background job (runs nightly):
   DELETE FROM minute_data WHERE user_id IN (
     SELECT id FROM users WHERE deleted_at < NOW() - '7 days'
   );
   ```

3. **Supabase RLS for privacy:**
   - Soft delete: User data invisible immediately (RLS filters deleted_at IS NULL)
   - Hard delete: Background job cleans up actual rows

**Why it works:**
- Soft delete: Instant privacy compliance
- Background cleanup: Spreads load over time
- Chunk deletion: Faster than row-by-row

### 7. Session Management

**Problem:** App crash = orphaned sessions (ended_at = NULL).

**Solution:**

1. **Heartbeat mechanism:**
   ```python
   # Every 30 seconds
   def send_heartbeat():
       session_id = get_current_session_id()
       update_session(session_id, last_heartbeat=now())

   # Server-side cleanup job (every 5 min):
   UPDATE sessions
   SET ended_at = last_heartbeat + INTERVAL '30 seconds'
   WHERE ended_at IS NULL
     AND last_heartbeat < NOW() - INTERVAL '2 minutes';
   ```

2. **Session recovery on app restart:**
   ```python
   def on_app_restart():
       last_session = get_last_session_from_sqlite()

       if last_session.ended_at is None:
           # Crashed or force-quit
           last_session.ended_at = last_session.last_heartbeat
           sync_to_cloud(last_session)
   ```

**Why it works:**
- Heartbeat: Detects crashes/disconnects within 2 min
- Cleanup job: Automatically closes orphaned sessions
- Recovery: App fixes own state on restart

### 8. Partial Sync Failure & Idempotency

**Problem:** Network fails at record 25,000 of 50,000 → duplicates on retry.

**Solution:**

1. **Batch-level idempotency ([pattern](https://www.sqliteforum.com/p/building-offline-first-applications)):**
   ```python
   # Client generates UUID per batch
   batch = {
       'batch_id': 'a1b2c3d4-...',  # UUID
       'user_id': 'user123',
       'data': [...]  # 5 minute rollups
   }

   # Server checks for duplicates
   if batch_exists(batch_id):
       return {'status': 'already_synced'}

   insert_batch(batch)
   return {'status': 'synced'}
   ```

2. **SQLite sync tracking:**
   ```sql
   CREATE TABLE sync_queue (
       batch_id TEXT PRIMARY KEY,
       data JSON,
       synced_at TIMESTAMP
   );

   -- On success:
   UPDATE sync_queue SET synced_at = NOW() WHERE batch_id = $1;

   -- Retry only unsynced:
   SELECT * FROM sync_queue WHERE synced_at IS NULL;
   ```

3. **Upsert for safety:**
   ```sql
   -- PostgreSQL upsert (if batch_id collision)
   INSERT INTO sync_batches (batch_id, user_id, data)
   VALUES ($1, $2, $3)
   ON CONFLICT (batch_id) DO NOTHING;
   ```

**Why it works:**
- UUID batch_id: Globally unique, collision-proof
- Client tracking: Knows exactly what's synced
- Upsert: Retries are safe (no duplicates)

### 9. Supabase Tier Limits

**Problem:** Free tier: 500MB DB, limited connections. When to upgrade?

**Solution:**

1. **Free tier capacity:**
   - 500 MB DB / 2 GB per 1,000 users = **250 users max**
   - 50K MAU / 250 users = **200 MAU per user** (way more than needed)
   - Bandwidth: 2 GB/month / 250 users = 8 MB/user/month (plenty for rollups)

2. **Pro tier upgrade triggers ($25/month):**
   - 8 GB DB = **4,000 users** (30 days retention)
   - 100 GB bandwidth = **50 MB/user/month** (10x buffer)
   - Dedicated CPU = Faster queries

3. **Enterprise/self-host threshold:**
   - 10,000+ users: Consider self-hosting PostgreSQL
   - Cost comparison: Supabase scales to ~$100/month, AWS RDS ~$200/month
   - Break-even: Around 20K users (Supabase limits hit)

4. **Optimization before upgrading:**
   - Reduce retention: 30 days → 14 days (halve storage)
   - Increase aggregation: Minute → 5-minute rollups (80% reduction)
   - Compress old data: Move >6 months to S3 (cheap archival)

**Tier roadmap:**
- 0-250 users: Free tier
- 250-4,000: Pro tier ($25/month)
- 4,000-10,000: Pro + optimizations
- 10,000+: Self-host PostgreSQL + TimescaleDB

### 10. Burst Traffic Handling

**Problem:** 9 AM Monday = 10x traffic in 5 minutes.

**Solution:**

1. **Supavisor auto-scaling:**
   - Connection pooler handles bursts automatically
   - 40 connections × transaction mode = 2,000 writes/sec capacity
   - 1,000 users × 0.2 writes/sec = 200 writes/sec actual (10x buffer)

2. **Client-side rate limiting:**
   ```python
   # Don't sync immediately on app start
   def on_app_start():
       random_delay = random.randint(0, 300)  # 0-5 min
       schedule_sync(delay=random_delay)
   ```

3. **Graceful degradation:**
   - If sync fails (HTTP 429): Exponential backoff
   - Desktop app: Continues working offline (core experience unaffected)
   - Dashboard: Show cached data with "Syncing..." indicator

**Why it works:**
- Randomized delays: Spreads 9 AM burst over 5 minutes
- Pooler: Handles 10x capacity headroom
- Offline-first: Bursts don't break core functionality

---

## Trade-offs & Limitations

### What We're Optimizing For

1. **Speed to market:** 3-4 days for MVP (not months)
2. **Simplicity:** 3 technologies (PyQt, Supabase, Next.js), not 10
3. **Privacy:** On-device processing (no cloud images)
4. **Cost:** Free tier to 250 users, $25/month to 4K users

### What We're NOT Optimizing For

1. **Real-time collaboration:** No team dashboards (add later)
2. **Mobile apps:** Desktop-only MVP (mobile = different UX)
3. **Advanced ML:** No emotion detection in MVP (nice-to-have)
4. **Enterprise features:** No SSO, SAML, admin consoles (add if needed)

### Known Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|------------|
| **Desktop only** | No mobile monitoring | Mobile app in Phase 2 (React Native) |
| **Single user** | No team analytics | Add team tables later if needed |
| **English only** | No i18n | Add translations later (low priority) |
| **30-day retention** | Limited historical analysis | Upgrade to 90 days if users request |
| **Glasses detection 90%** | 10% false negatives | User can manually adjust thresholds in settings |
| **Calendar integration OS-specific** | May not work on Linux | Fallback: Manual focus mode toggle |
| **No mobile alerts** | Users need desktop running | Future: Sync to phone for break reminders |

### Technical Debt We're Accepting

1. **No multi-tenancy isolation:** Single Supabase project for all users
   - *Why:* Simpler, cheaper, adequate for 10K users
   - *When to fix:* If enterprise customers need dedicated infrastructure

2. **Client-side aggregation only:** No server-side analytics pipeline
   - *Why:* Avoids building/hosting custom backend
   - *When to fix:* If we need cross-user insights (e.g., "average blink rate across all users")

3. **No distributed tracing:** Basic logging only
   - *Why:* Not needed at <10K users
   - *When to fix:* If debugging production issues becomes frequent

4. **Manual schema migrations:** No automated migration tool
   - *Why:* Supabase supports SQL migrations, manual is fine for MVP
   - *When to fix:* If team grows (add Prisma or similar)

### What Could Break at Scale

| Scale | What Breaks | Solution |
|-------|-------------|----------|
| **1K users** | Free tier storage (500 MB) | Upgrade to Pro ($25/month) |
| **5K users** | Dashboard query time (>500ms) | Add Redis cache for rollups |
| **10K users** | Supabase connection limits | Consider self-hosting PostgreSQL |
| **50K users** | Single DB write bottleneck | Shard by user_id (multiple DBs) |
| **100K users** | Supabase egress costs ($100+/month) | Self-host + CDN for dashboard |

---

## Cost Estimates

### Cost Breakdown by User Count

#### 1,000 Users (Free Tier)

**Supabase Free:**
- Database: 500 MB limit → 250 users at 2 GB/1K users
- **Need Pro tier at 500+ users**

**Supabase Pro ($25/month):**
- Database: 8 GB → Supports 4,000 users
- Bandwidth: 100 GB → 50 MB/user/month (plenty)
- Compute: Dedicated CPU

**Dashboard Hosting (Vercel Free):**
- Static site: Free for personal projects
- Bandwidth: 100 GB/month free
- Estimate: 1,000 users × 1 MB/month = 1 GB (well under limit)

**Total: $25/month** (Supabase Pro)

**Per-user cost: $0.025/month** (2.5 cents per user)

#### 10,000 Users (Pro Tier)

**Supabase Pro ($25/month base + overages):**
- Database: 8 GB included → Need ~20 GB for 10K users
- Overage: 12 GB × $0.125/GB = $1.50/month
- Bandwidth: 100 GB included → 10K × 5 MB = 50 GB (under limit)

**Supabase Total: $26.50/month**

**Vercel Pro ($20/month):**
- If dashboard traffic exceeds free tier
- Unlikely at 10K users with static site

**Total: $26.50-46.50/month**

**Per-user cost: $0.0027-0.0047/month** (0.3-0.5 cents per user)

#### 100,000 Users (Self-Host Threshold)

**Supabase Pro ($25/month + overages):**
- Database: 8 GB → Need ~200 GB for 100K users
- Overage: 192 GB × $0.125/GB = $24/month
- Bandwidth: 100 GB → Need ~500 GB (5 MB/user)
- Overage: 400 GB × $0.09/GB = $36/month

**Supabase Total: $85/month**

**Alternative: Self-Hosted PostgreSQL + TimescaleDB**

**AWS RDS (PostgreSQL 14):**
- db.m5.large (2 vCPU, 8 GB RAM): $140/month
- Storage: 250 GB SSD @ $0.115/GB = $29/month
- Bandwidth: 1 TB @ $0.09/GB = $90/month
- **Total: $259/month**

**DigitalOcean Managed PostgreSQL:**
- 4 GB RAM, 2 vCPU: $60/month
- Storage: 250 GB included
- Bandwidth: 5 TB included (generous)
- **Total: $60/month**

**Self-host winner: DigitalOcean at 100K users ($60 vs. $85 Supabase)**

**Dashboard Hosting:**
- Vercel Pro: $20/month (likely needed at this scale)

**Total: $60-85/month (DB) + $20 (hosting) = $80-105/month**

**Per-user cost: $0.0008-0.0011/month** (0.08-0.11 cents per user)

### Cost Comparison Table

| Users | Supabase | Self-Host (DO) | Dashboard | Total | Per-User |
|-------|----------|----------------|-----------|-------|----------|
| 250   | Free     | -              | Free      | $0    | $0       |
| 1,000 | $25      | -              | Free      | $25   | $0.025   |
| 5,000 | $25      | -              | Free      | $25   | $0.005   |
| 10,000 | $27     | $60            | Free-$20  | $27-47 | $0.003-0.005 |
| 50,000 | $60     | $60            | $20       | $80   | $0.0016  |
| 100,000 | $85    | $60            | $20       | $80-105 | $0.0008-0.0011 |

**Break-even point:** Self-host at ~20K users (Supabase costs approach $50-60/month)

### Development Costs (One-Time)

**MVP (4 days):**
- Day 1: Desktop app skeleton, MediaPipe integration ($0 - open source)
- Day 2: Alert engine, SQLite queue, Supabase setup ($0 - free tier)
- Day 3: Dashboard (Next.js), charts, GDPR features ($0)
- Day 4: Testing, packaging (PyInstaller), documentation ($0)

**Phase 2 (2 weeks):**
- Week 1: Polish, user testing, bug fixes
- Week 2: Continuous aggregates, retention policies, advanced alerts

**Tools:**
- PyCharm Community: Free
- VS Code: Free
- Supabase: Free tier
- Vercel: Free tier

**Total development cost: $0 in software** (labor not included)

### Revenue Model Ideas (Not Required for Assignment)

**Freemium:**
- Free: 7 days history, basic alerts
- Pro ($5/month): 30 days history, flow mode, calendar integration
- Team ($10/user/month): Team dashboard, admin features

**B2B:**
- Small teams (5-20 users): $50/month
- Enterprise (50+ users): $500/month + custom features

**At 1,000 paying users ($5/month):**
- Revenue: $5,000/month
- Costs: $25/month (Supabase)
- **Margin: 99.5%** (SaaS dream!)

---

## Implementation Checklist

### Phase 1: Core MVP (4 days)

**Day 1: Detection Engine**
- [ ] PyQt6 project setup
- [ ] MediaPipe FaceMesh integration
- [ ] Blink detection (EAR algorithm)
- [ ] Posture detection (head position)
- [ ] Zero-DCE light enhancement
- [ ] Confidence filtering for glasses
- [ ] Test with 3 users: No glasses, thin frames, thick frames

**Day 2: Data & Sync**
- [ ] SQLite schema (raw events, rollups, sync queue)
- [ ] Background aggregation thread (1-min rollups)
- [ ] Supabase project setup
- [ ] PostgreSQL schema (TimescaleDB hypertables)
- [ ] Sync worker (5-min batches)
- [ ] Idempotency (batch UUID)
- [ ] Test offline → online sync

**Day 3: Alerts & UI**
- [ ] Personal baseline calibration (first 2 hours)
- [ ] Alert rules engine
- [ ] Calendar integration (macOS EventKit or Windows API)
- [ ] Flow state detection
- [ ] System tray integration
- [ ] OS notifications (toast alerts)
- [ ] Test with simulated meetings

**Day 4: Dashboard & GDPR**
- [ ] Next.js project setup
- [ ] Supabase Auth (email + Google OAuth)
- [ ] Dashboard page (Recharts graphs)
- [ ] Query daily_rollups (not raw data)
- [ ] Settings page (GDPR export, delete)
- [ ] Deploy to Vercel
- [ ] End-to-end test: Desktop app → Cloud → Dashboard

### Phase 2: Polish (1 week)

- [ ] Continuous aggregates (hourly, daily, weekly)
- [ ] Retention policies (30 days minute data)
- [ ] Session heartbeat + cleanup job
- [ ] Batch alert notifications
- [ ] Progressive cooldown
- [ ] Windows packaging (PyInstaller .exe)
- [ ] macOS packaging (py2app .dmg)
- [ ] User testing with 10 people
- [ ] Bug fixes

### Phase 3: Documentation (1 day)

- [ ] README with architecture diagram
- [ ] Setup instructions (dev environment)
- [ ] Deployment guide (Supabase + Vercel)
- [ ] GDPR compliance document
- [ ] Test results (glasses, lighting, alerts)
- [ ] Future roadmap (mobile, emotion, teams)

---

## Conclusion

This architecture solves all Critical Six and 10 Scaling Challenges using **simple, proven technology**:

**Critical Six:**
1. ✅ Glasses: MediaPipe confidence filtering + calibration
2. ✅ Lighting: Zero-DCE + Kalman filter
3. ✅ Alert Fatigue: Calendar integration + flow detection + batching
4. ✅ Privacy: 100% on-device processing
5. ✅ Baseline: Auto-calibration + percentile thresholds
6. ✅ Flow State: Detection algorithm + deferred alerts

**Scaling Challenges:**
1. ✅ Offline Sync: Minute rollups + rate limiting (99% reduction)
2. ✅ Connections: Batching + Supavisor pooling (3 writes/sec, not 30K)
3. ✅ Data Volume: Retention policies (2 GB for 1K users)
4. ✅ Query Speed: Continuous aggregates (30 rows, not 25M)
5. ✅ Alert Latency: Client-side engine (no network)
6. ✅ GDPR: Soft delete + background cleanup
7. ✅ Sessions: Heartbeat + auto-close
8. ✅ Idempotency: UUID batches + upsert
9. ✅ Tier Limits: Free → Pro at 500 users ($25/month)
10. ✅ Bursts: Randomized delays + pooler headroom

**Cost:** $0 to 250 users, $25/month to 4K users, $60-80/month to 100K users.

**Timeline:** 4 days MVP + 1 week polish = **Production-ready in 2 weeks**.

**Philosophy:** Boring technology, client-heavy, privacy-first, offline-capable. Simple things that work.

---

## Sources

### Computer Vision & Detection
- [MediaPipe Iris: Real-time Iris Tracking & Depth Estimation](https://research.google/blog/mediapipe-iris-real-time-iris-tracking-depth-estimation/)
- [A review of deep learning in blink detection](https://pmc.ncbi.nlm.nih.gov/articles/PMC11784707/)
- [MediaPipe Iris and Kalman Filter for Robust Eye Gaze Tracking](https://www.atlantis-press.com/proceedings/icsice-24/126011300)
- [How to Build Real-Time Eye Tracking in the Browser](https://blog.roboflow.com/build-eye-tracking-in-browser/)

### Privacy & Edge Computing
- [Privacy-Preserving Deep Learning in Health and Vision](https://viso.ai/deep-learning/privacy-preserving-deep-learning-for-computer-vision/)
- [Edge AI for Real-Time Computer Vision & Privacy](https://viso.ai/viso-suite/privacy/)
- [Edge AI Vision: Efficient, Private On-Device AI](https://viso.ai/evaluation-guide/connectivity/)

### Alert Fatigue & Notifications
- [How to Use Attention Resistance to Fight Notification Fatigue](https://www.magicbell.com/blog/how-to-use-attention-resistance-to-fight-notification-fatigue)
- [Alert Fatigue: Impact on Users & Solutions](https://www.magicbell.com/blog/alert-fatigue)
- [Flowtrace – Meeting Analytics Platform](https://www.flowtrace.co/)

### Personalized Health Monitoring
- [Personalized ECG Monitoring and Adaptive Machine Learning](https://pmc.ncbi.nlm.nih.gov/articles/PMC10843583/)
- [Personalized Baselines in Vital Signs: Insights from Wearable-Derived Sleep Data](https://www.fortunejournals.com/articles/personalized-baselines-in-vital-signs-insights-from-wearablederived-sleep-data-in-healthy-adults.html)
- [Adaptive and personalized user behavior modeling in remote health monitoring](https://www.sciencedirect.com/science/article/abs/pii/S0933365722001737)
- [Auto-adaptive thresholds for anomaly detection](https://docs.dynatrace.com/docs/discover-dynatrace/platform/davis-ai/anomaly-detection/concepts/auto-adaptive-threshold)

### Database & Time-Series
- [Automating Data Retention with add_retention_policy() in Timescale](https://medium.com/@anowerhossain97/automating-data-retention-with-add-retention-policy-in-timescale-for-postgresql-eacfeb341562)
- [Aggregate Time Series Data with TimescaleDB](https://www.mindee.com/blog/aggregate-time-series-data-with-timescaledb)
- [Efficient Time-Series Data Handling: Exploring TimescaleDB](https://stormatics.tech/blogs/efficient-time-series-data-handling-exploring-timescaledb-in-postgresql)
- [Time-based retention strategies in Postgres](https://blog.sequinstream.com/time-based-retention-strategies-in-postgres/)

### Supabase & Connection Pooling
- [Connect to your database | Supabase Docs](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Connection management | Supabase Docs](https://supabase.com/docs/guides/database/connection-management)
- [PgBouncer is now available in Supabase](https://supabase.com/blog/supabase-pgbouncer)

### Offline-First Architecture
- [Offline First: Using SQLite and Caching in Desktop Apps](https://www.thecodingdev.com/2025/04/offline-first-using-sqlite-and-caching.html)
- [Building Offline-First Apps with SQLite: Sync Strategies](https://www.sqliteforum.com/p/building-offline-first-applications)
- [Introducing PowerSync v1.0: Postgres<>SQLite Sync Layer](https://www.powersync.com/blog/introducing-powersync-v1-0-postgres-sqlite-sync-layer)
- [Offline-first frontend apps in 2025: IndexedDB and SQLite](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
