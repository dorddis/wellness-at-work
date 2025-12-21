# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MCP Restrictions

**DO NOT use any Chrome DevTools MCP tools in this project.** This is a desktop application - browser automation is irrelevant.

## Project Overview

**Lumina** - B2B AI wellness platform for enterprises. Singapore startup assignment.

**Architecture:** Turborepo monorepo with Electron desktop + Next.js admin dashboard.
See `lumina/` folder for the implementation.

## Tech Stack (Current - Lumina)

| Component | Technology |
|-----------|------------|
| Monorepo | Turborepo + pnpm |
| Desktop App | Electron 33+ with Vite |
| Web Dashboard | Next.js 15 |
| UI Framework | React 18 + Tailwind CSS |
| State Management | Zustand |
| Computer Vision | @mediapipe/tasks-vision (FaceLandmarker) |
| Local Storage | better-sqlite3 (WAL mode) |
| Cloud Backend | Supabase (Auth + PostgreSQL + RLS) |
| Packaging | electron-builder |

## Legacy Tech Stack (Original PyQt6 approach - archived)

| Component | Technology |
|-----------|------------|
| Desktop UI | PyQt6 |
| Computer Vision | MediaPipe Face Mesh (478 landmarks) |
| Local Storage | SQLite (WAL mode) |
| Cloud Backend | Supabase (Auth + TimescaleDB + Realtime) |
| Web Dashboard | Next.js 14 (static export) |
| Packaging | PyInstaller (Win), py2app (Mac) |

## Commands (Lumina)

```bash
# Setup
cd lumina
pnpm install

# Development
pnpm dev              # Run all apps
pnpm dev:desktop      # Electron app only
pnpm dev:web          # Next.js dashboard only

# Type checking
pnpm typecheck

# Build
pnpm build
pnpm build:desktop    # Package Electron
pnpm build:web        # Build Next.js

# Lint
pnpm lint
```

## Legacy Commands (PyQt6 - archived)

```bash
# Run reference blink counter (their 79-line implementation)
python -X utf8 eye-tracker-share/eye_blink_counter.py
```

## Architecture

**Offline-first with aggressive aggregation:**
```
Camera (30 FPS) -> MediaPipe (10ms) -> EAR Calculation
                                            |
                              Blink Event -> SQLite (local)
                                            |
                              Every 60s: Raw -> Minute Rollups
                                            |
                              Every 5min: Batch Sync -> Supabase
                                            |
                              TimescaleDB: Continuous Aggregates
                                            |
                              Dashboard: Query Rollups (30 rows, not 2.6M)
```

**Why rollups matter:** Raw events = 2.6M rows/user/day. Minute rollups = 1,440 rows/user/day (99.8% reduction).

## Critical Nine Challenges (Pareto 20%)

Must solve these before anything else. Product fails without them.

| # | Challenge | Solution | Success Metric |
|---|-----------|----------|----------------|
| 1 | Glasses (75% users) | MediaPipe confidence filter + single-eye fallback | >90% accuracy with glasses |
| 2 | Lighting (100% users) | Zero-DCE enhancement + Kalman smoothing | Works backlit, low light |
| 3 | Alert fatigue | Calendar API + flow detection + cooldowns | >50% ack rate at 30 days |
| 4 | Privacy perception | 100% on-device CV, visual "no recording" | >80% enable camera |
| 5 | Baseline calibration | Auto-calibrate 2hr using P25/P50/P75 | >85% alert accuracy |
| 6 | Flow interruption | Detect via declining blink rate, queue alerts | Zero interrupts in flow |
| **7** | **Meeting Mode (30-50% of workday)** | **Screen-capture self-view from Zoom/Teams/Meet** | **>85% detection accuracy in meetings** |
| **8** | **Posture Detection** | **Face landmarks for distance/tilt/lean** | **>90% accuracy, <10% false positives** |
| **9** | **Yawn & Drowsiness Detection** | **MAR + PERCLOS algorithms** | **>85% yawn accuracy, >75% fatigue correlation** |

### Challenge #7: Meeting Mode (CRITICAL FOR B2B)

**Problem:** Enterprise users spend 30-50% of their workday in video meetings. During meetings, the camera is "owned" by Zoom/Teams/Meet, so our app cannot access it directly. **Without solving this, Lumina is useless during 4+ hours/day.**

**Solution:** Screen-capture the user's self-view preview (the small video of yourself in the corner):
1. Detect meeting app is active (process monitoring)
2. User calibrates self-view region once per app (drag box around their face preview)
3. Capture that screen region at ~10 FPS
4. Run existing MediaPipe pipeline on captured frames
5. Calculate EAR and detect blinks as normal

**Implementation:** See `lumina/docs/features/MEETING_MODE.md` for full technical spec.

**Priority:** P1.5 - Must ship in v1.2 before enterprise pilots.

### Challenge #8: Posture Detection

**Problem:** Poor posture causes neck/back pain and eye strain. Users sit too close, tilt heads, lean forward.

**Solution:** Use existing MediaPipe face landmarks to detect:
- **Too close/far from screen** - Face bounding box size (larger = closer)
- **Head tilt** - Angle between eye corners vs horizontal
- **Forward lean** - Nose-to-eye vertical ratio changes
- **Looking down** - Nose position relative to eyes

**Landmarks used:** Eye corners (33, 263), nose tip (1), chin (152), forehead (10)

**Alert strategy:** Gentle nudge after 30s of poor posture, 10-15 min cooldown.

### Challenge #9: Yawn & Drowsiness Detection

**Problem:** Fatigue causes eye strain and reduced productivity. Users don't realize they're tired.

**Solution:** Extend CV pipeline with:
1. **Mouth Aspect Ratio (MAR)** - Like EAR but for mouth. High MAR + 2+ seconds = yawn
2. **PERCLOS** - % of time eyes are >80% closed in 1-minute window. >15% = drowsy
3. **Combined fatigue score** - Yawn frequency + PERCLOS + low blink rate

**Landmarks used:** Mouth corners (61, 291), lips (13, 14), inner mouth (78, 308)

**Alert strategy:**
- Yawn detected: Log only (no interruption)
- 2+ yawns in 10 min: "Feeling tired? A short break might help"
- PERCLOS >20%: "Your eyes are heavy - take a break"

**Implementation:** See `lumina/docs/features/POSTURE_YAWN_DETECTION.md`

### EXPLICIT NON-GOAL: Emotion Detection

**We do NOT and WILL NOT implement emotion/sentiment detection.**

**Why not:**
1. **Privacy destruction** - "Employer tracks when you're frustrated" is surveillance, not wellness
2. **Legal risk** - EU AI Act classifies workplace emotion AI as HIGH-RISK
3. **Technical inaccuracy** - Facial expression ≠ emotion (60-70% accuracy = useless)
4. **Trust killer** - Undermines our "privacy-first" positioning
5. **Product focus** - We measure physiological metrics, not subjective mental states

**Our positioning:** "We DON'T track your emotions" is a FEATURE, not a missing capability.

See `DEC-006` in `lumina/docs/PRODUCT_DECISIONS.md` for full rationale.

## Blink Detection Algorithm

From `eye-tracker-share/eye_blink_counter.py`:
```python
EAR_THRESHOLD = 0.21    # Below = eyes closed
CONSEC_FRAMES = 2       # Frames to confirm blink
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]

# Eye Aspect Ratio formula
EAR = (A + B) / (2.0 * C)  # A,B = vertical, C = horizontal
```

## Project Structure

```
wellness-at-work/
├── src/                        # Desktop app (PyQt6)
│   ├── main.py                 # Entry point
│   ├── ui/                     # PyQt windows, system tray
│   ├── detection/              # MediaPipe blink/posture detectors
│   ├── core/                   # Session, analytics, alerts engine
│   └── data/                   # SQLite, Supabase sync, models
├── web-dashboard/              # Next.js static dashboard
├── tests/                      # pytest
├── eye-tracker-share/          # Their reference (79 lines)
└── docs/                       # Architecture docs
```

## Key Documentation

| File | Purpose | Read Time |
|------|---------|-----------|
| `ARCHITECTURE_SUMMARY.md` | Executive summary | 5 min |
| `ARCHITECTURE_DECISION.md` | TimescaleDB vs Event-Driven decision | 10 min |
| `CRITICAL_CHALLENGES.md` | The 6 make-or-break problems | 5 min |
| `IMPLEMENTATION_ROADMAP.md` | 4-week sprint plan | 15 min |
| `SCALE_CHALLENGES_FILTERED.md` | Top 10 scaling challenges | 10 min |
| `lumina/docs/features/MEETING_MODE.md` | **Planned:** Meeting mode via screen capture | 10 min |
| `lumina/docs/features/POSTURE_YAWN_DETECTION.md` | **Planned:** Posture, yawn, drowsiness detection | 10 min |
| `lumina/docs/PRODUCT_DECISIONS.md` | **All product decisions for founder demo** | 20 min |
| `lumina/docs/UI_UX_IMPLEMENTATION.md` | **UI/UX enhancements: components, onboarding, gamification** | 15 min |

## Database Schema (TimescaleDB)

```sql
-- Hypertable for time-series data
CREATE TABLE wellness_events (
  event_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL
);
SELECT create_hypertable('wellness_events', 'timestamp');
SELECT add_retention_policy('wellness_events', INTERVAL '7 days');

-- Continuous aggregates (auto-updated)
CREATE MATERIALIZED VIEW wellness_1min_rollup
WITH (timescaledb.continuous) AS
SELECT user_id, time_bucket('1 minute', timestamp) AS bucket,
       COUNT(*) FILTER (WHERE event_type = 'blink_detected') AS blink_count
FROM wellness_events GROUP BY user_id, bucket;
```

## UI Requirements

- **Colors:** Black, white, grays only (assignment requirement)
- **System tray:** Must run in background with icon
- **Real-time:** Blink count updates live (<100ms latency)
- **Performance:** Show CPU %, Memory MB, Power usage

## Cost Projections

| Users | Storage | Monthly Cost | Per-User |
|-------|---------|--------------|----------|
| 0-250 | 500 MB | $0 (free) | $0 |
| 1K | 2 GB | $25 | $0.025 |
| 10K | 20 GB | $27 | $0.003 |
| 100K | 200 GB | $60 (self-host) | $0.0006 |

## Development Notes

- **Windows UTF-8:** Always run `python -X utf8` to avoid Unicode issues
- **Performance monitoring:** Use `psutil` for CPU/Memory/Power
- **Supabase client:** `supabase-py`
- **Test on both Windows and macOS** before submission
- **No images leave device** - only metrics (blinks/min, posture score)
