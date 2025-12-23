# Terminology & Glossary

**Purpose:** Decode technical acronyms and domain-specific terms used throughout Lumina documentation.

---

## Computer Vision Algorithms

### EAR (Eye Aspect Ratio)
**Formula:** `(A + B) / (2.0 * C)`
- **A, B:** Vertical distances between eyelid landmarks
- **C:** Horizontal distance between eye corners
- **Usage:** Blink detection (EAR < 0.18 = eyes closed)
- **Source:** "Real-Time Eye Blink Detection using Facial Landmarks" (Soukupová & Čech, 2016)

**Why it matters:** Core algorithm for detecting blinks in real-time. Lower EAR = eyes more closed.

**Example values:**
- EAR > 0.25: Eyes fully open
- EAR 0.18-0.25: Normal blinking range
- EAR < 0.18: Eyes closed (blink detected)

---

### MAR (Mouth Aspect Ratio)
**Formula:** Similar to EAR but for mouth landmarks
- **Usage:** Yawn detection (MAR > threshold + duration > 2 seconds = yawn)
- **Landmarks:** Mouth corners (61, 291), lips (13, 14), inner mouth (78, 308)

**Why it matters:** Yawns indicate fatigue/drowsiness, trigger break suggestions.

**Example values:**
- MAR < 0.5: Mouth closed
- MAR 0.5-0.7: Talking/normal
- MAR > 0.7 for 2+ seconds: Yawn detected

---

### PERCLOS (Percentage of Eye Closure)
**Definition:** % of time eyes are >80% closed in a 1-minute window
- **Usage:** Drowsiness detection (PERCLOS >15% = fatigue)
- **Medical standard:** Used in sleep studies, driver fatigue detection

**Why it matters:** More reliable than blink rate for detecting drowsiness. Heavy eyelids = need rest.

**Example values:**
- PERCLOS <10%: Alert
- PERCLOS 10-15%: Mildly tired
- PERCLOS >15%: Drowsy (suggest break)
- PERCLOS >20%: Very drowsy (urgent break)

---

## Database & Architecture

### RLS (Row Level Security)
**Definition:** PostgreSQL security feature that filters rows based on user identity
- **Usage:** Ensures users only see their organization's data
- **Implementation:** `WHERE user_id = auth.uid()` in Supabase policies

**Why it matters:** Multi-tenant data isolation without application-layer logic. Security enforced at DB level.

**Example policy:**
```sql
CREATE POLICY "Users can only see their org's data" ON wellness_data
FOR SELECT USING (organization_id = (SELECT organization_id FROM org_members WHERE user_id = auth.uid()));
```

---

### TimescaleDB
**Definition:** PostgreSQL extension optimized for time-series data
- **Features:** Hypertables, continuous aggregates, compression, retention policies
- **Usage:** Store minute rollups, auto-aggregate to hourly/daily

**Why it matters:** Handles 1,440 rollups/user/day efficiently. 100K users = 144M rows/day, queries stay fast.

---

### Hypertable
**Definition:** TimescaleDB's time-series table that auto-partitions by time
- **Benefit:** Fast queries on recent data (partition pruning)
- **Example:** `wellness_events` partitioned by `timestamp` column

---

### Continuous Aggregate
**Definition:** Materialized view that auto-updates as new data arrives
- **Usage:** Pre-compute hourly/daily rollups for dashboards
- **Benefit:** Admin dashboards query 24 rows (hourly), not 1,440 (minute)

**Example:**
```sql
CREATE MATERIALIZED VIEW wellness_1hour_rollup
WITH (timescaledb.continuous) AS
SELECT user_id, time_bucket('1 hour', timestamp) AS hour,
       AVG(blink_rate) AS avg_blink_rate
FROM wellness_1min_rollup GROUP BY user_id, hour;
```

---

### WAL Mode (Write-Ahead Logging)
**Definition:** SQLite journaling mode that enables concurrent reads during writes
- **Usage:** Desktop app uses WAL for better-sqlite3 database
- **Benefit:** Detection thread writes, UI thread reads - no blocking

**Why it matters:** App stays responsive during high-frequency blink writes (30 FPS).

---

## Data Reduction Concepts

### Minute Rollups
**Definition:** Aggregated metrics for each 60-second window
- **Stored fields:** Blink count, avg EAR, min/max EAR, wellness score
- **Data reduction:** 1,800 raw events (30 FPS × 60s) → 1 rollup row

**Why it matters:** 99.8% data reduction. 2.6M raw events/day → 1,440 rollups/day.

---

### Event-Driven Architecture (Rejected Alternative)
**Definition:** System where components communicate via event streams (Kafka, RabbitMQ)
- **Why we rejected it:** Overkill for 99% of use cases, adds complexity
- **When it makes sense:** >1M users with real-time collaboration needs
- **Our choice:** TimescaleDB (simpler, cheaper, good to 100K users)

See [Architecture Decision](../03-ARCHITECTURE/ARCHITECTURE_DECISION.md) for full analysis.

---

## Detection & Alerts

### Baseline Calibration
**Definition:** Measuring user's normal blink rate over 2 hours to set personalized thresholds
- **Method:** Calculate P25, P50 (median), P75 percentiles
- **Usage:** Alert if blink rate < P25 for 5+ minutes

**Why it matters:** 12 blinks/min is normal for YOU, 18 for someone else. Avoid false positives.

---

### Kalman Smoothing
**Definition:** Statistical filter that removes noise from sensor data
- **Usage:** Smooth EAR values frame-to-frame (reduce jitter from head motion)
- **Benefit:** More stable blink detection

**Example:** Raw EAR [0.22, 0.15, 0.23, 0.16] → Smoothed [0.21, 0.17, 0.20, 0.18]

---

### Alert Cooldown
**Definition:** Minimum time between repeated alerts of the same type
- **Usage:** "Low blink rate" alert waits 15 minutes before showing again
- **Benefit:** Reduces alert fatigue, improves user tolerance

**Why it matters:** Users ignore apps that nag constantly. Cooldowns preserve trust.

---

### Flow State Detection
**Definition:** Identifying when user is deeply focused (via declining blink rate)
- **Indicator:** Blink rate drops 30-40% during concentration
- **Action:** Queue alerts instead of interrupting

**Why it matters:** Interrupting flow destroys productivity. Wait until break time.

---

## Privacy & Compliance

### GDPR (General Data Protection Regulation)
**Definition:** EU law requiring user consent, data portability, right to deletion
- **Our compliance:** Data export (JSON/CSV), account deletion (30-day grace), consent tracking

**Why it matters:** Required for EU enterprise customers. B2B SaaS selling to EU = must comply.

---

### PII (Personally Identifiable Information)
**Definition:** Data that can identify an individual (email, name, face images)
- **Our approach:** No images stored, only aggregated metrics

**Why it matters:** Less PII = lower compliance burden, better privacy positioning.

---

## Electron & Desktop

### IPC (Inter-Process Communication)
**Definition:** How Electron's main process and renderer process communicate
- **Methods:** `ipcMain.handle()`, `ipcRenderer.invoke()`
- **Usage:** Renderer requests camera access → Main process handles permission

**Why it matters:** Security boundary - renderer can't access system resources directly.

---

### Preload Script
**Definition:** Sandboxed bridge between main and renderer processes
- **Usage:** Expose safe IPC channels to renderer
- **Security:** Prevents renderer from calling arbitrary Node.js APIs

---

### Electron Builder
**Definition:** Tool for packaging Electron apps into installers
- **Outputs:** NSIS (Windows), DMG (macOS), AppImage (Linux)
- **Features:** Code signing, auto-updates, native modules

---

## Supabase & Auth

### Magic Link
**Definition:** Passwordless authentication via email link
- **Flow:** User enters email → Receives link → Clicks → Logged in
- **Benefit:** No password to remember, phishing-resistant

---

### OAuth (Open Authorization)
**Definition:** Standard for delegated authentication (e.g., "Sign in with Google")
- **Usage:** Lumina uses Google OAuth for enterprise SSO
- **Flow:** Redirect to Google → User approves → Redirect back with token

---

### JWT (JSON Web Token)
**Definition:** Signed token containing user identity claims
- **Usage:** Supabase auth tokens, passed in API requests
- **Security:** Signed by Supabase, verified on server

**Example structure:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "authenticated",
  "exp": 1735689600
}
```

---

## Gamification

### Streaks
**Definition:** Consecutive days/hours of desired behavior
- **Types:** Daily Use (login every day), Healthy Eyes (blink rate >15/min)
- **Behavior:** Visual progress, reset on miss, "freeze" power-ups

---

### Achievements
**Definition:** One-time unlockable badges for milestones
- **Examples:** First Steps (first day), Perfect Day (100% wellness score), Blink Master (1000 blinks)
- **Psychology:** Progress towards goals, social proof

---

## Performance Metrics

### FPS (Frames Per Second)
**Definition:** Rate at which video frames are processed
- **Our rate:** 30 FPS (1 frame every 33ms)
- **MediaPipe inference:** ~10ms per frame on modern CPU
- **Headroom:** 23ms for JavaScript processing (33ms - 10ms)

**Why it matters:** Higher FPS = more blinks detected, but also higher CPU usage.

---

### Inference Time
**Definition:** Time for ML model to process one frame
- **MediaPipe FaceLandmarker:** 8-12ms on Intel i5+
- **Target:** <20ms to maintain 30 FPS
- **Fallback:** Drop to 20 FPS on slower machines

---

## Meeting Mode

### Screen Capture API
**Definition:** Browser/Electron API to capture screen regions as video stream
- **Usage:** Capture Zoom/Teams self-view window
- **Method:** `desktopCapturer.getSources()` → `getUserMedia()`

---

### Self-View Preview
**Definition:** Small video showing your own face during video calls
- **Location:** Usually bottom-right corner of meeting window
- **Size:** ~200x150 pixels (varies by app)

**Why we capture it:** When Zoom owns the camera, we screen-capture this preview to continue detection.

---

### Calibration Region
**Definition:** User-defined bounding box around self-view preview
- **Format:** `{x, y, width, height}` in screen coordinates
- **Storage:** Saved per-app (Zoom calibration ≠ Teams calibration)

---

## React & UI

### Zustand
**Definition:** Lightweight React state management library
- **Usage:** Global stores for settings, sessions, achievements
- **Persistence:** Auto-sync to localStorage

**Why vs Redux:** 10x less boilerplate, simpler for small apps.

---

### React Joyride
**Definition:** Library for guided product tours
- **Usage:** Onboarding flow (6 steps: Welcome → Privacy → Camera → Calibration → Goals → Complete)
- **Note:** Peer dep warning with React 19 is expected, still works

---

### Recharts
**Definition:** React charting library built on D3
- **Usage:** Wellness score trends, blink rate charts, department comparisons

---

## Acronyms Quick Reference

| Acronym | Full Name | Category |
|---------|-----------|----------|
| **EAR** | Eye Aspect Ratio | Detection |
| **MAR** | Mouth Aspect Ratio | Detection |
| **PERCLOS** | Percentage of Eye Closure | Detection |
| **RLS** | Row Level Security | Database |
| **WAL** | Write-Ahead Logging | Database |
| **GDPR** | General Data Protection Regulation | Compliance |
| **PII** | Personally Identifiable Information | Privacy |
| **IPC** | Inter-Process Communication | Electron |
| **JWT** | JSON Web Token | Auth |
| **OAuth** | Open Authorization | Auth |
| **FPS** | Frames Per Second | Performance |
| **CV** | Computer Vision | General |

---

## Medical/Research Terms

### CVS (Computer Vision Syndrome)
**Definition:** Eye strain from prolonged screen use
- **Symptoms:** Dry eyes, blurred vision, headaches, neck pain
- **Prevalence:** 75% of computer users

---

### 20-20-20 Rule
**Definition:** Every 20 minutes, look at something 20 feet away for 20 seconds
- **Purpose:** Reduce eye strain by relaxing focus muscles
- **Lumina implementation:** Break reminders trigger after 20 min sessions

---

### Accommodation
**Definition:** Eye's ability to focus on objects at different distances
- **Problem:** Constant near focus (screen) causes eye fatigue
- **Solution:** Periodic distance viewing (20-20-20 rule)

---

## Related Documentation

- **Architecture deep-dive:** [Architecture Overview](../03-ARCHITECTURE/ARCHITECTURE_OVERVIEW.md)
- **Business terms:** [Cost Analysis](../06-BUSINESS/COST_ANALYSIS.md) (TAM, SAM, SOM, CAC, LTV)
- **API reference:** [Database Schema](../07-API-REFERENCE/DATABASE_SCHEMA.md) (full table definitions)

---

**Confused by a term?** Check the [Documentation Index](../INDEX.md) or file an issue.
