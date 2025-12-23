# WellnessGuard - Quick Reference Card

Print this. Keep it next to your monitor.

---

## Tech Stack

```
Desktop:    PyQt6 + MediaPipe + SQLite
Backend:    Supabase (Auth + PostgreSQL)
Dashboard:  Next.js 14 (static export)
Packaging:  PyInstaller (Win), py2app (Mac)
```

---

## Blink Detection Constants

```python
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
EAR_THRESHOLD = 0.21
CONSEC_FRAMES = 2
CONFIDENCE_MIN = 0.7  # for glasses handling
```

---

## Data Flow

```
Camera (30 FPS)
    |
    v
MediaPipe FaceMesh (10ms)
    |
    v
EAR Calculation -> Blink Event -> SQLite
    |
    +-> Alert Engine (client-side, <100ms)
    |
    v
Every 60s: Aggregate to minute_rollup
    |
    v
Every 5 min: Sync batch to Supabase
    |
    v
Dashboard: Query minute/hour/day rollups
```

---

## SQLite Tables (Local)

| Table | Purpose | Retention |
|-------|---------|-----------|
| blink_events | Raw data | 24 hours |
| minute_rollups | Aggregated | Sync then keep 7 days |
| sync_queue | Pending uploads | Until synced |
| user_baseline | Calibration | Forever |

---

## Supabase Tables (Cloud)

| Table | Purpose |
|-------|---------|
| user_preferences | Thresholds, settings |
| wellness_data | Minute rollups from clients |
| sessions | Session summaries |
| alerts | Alert history |

---

## Alert Rules

| Alert | Condition | Duration | Cooldown |
|-------|-----------|----------|----------|
| Low blink | rate < p25 baseline | 2 min | 10 min |
| Poor posture | score < 50 | 3 min | 15 min |
| Long session | > 90 min | Immediate | 30 min |
| Critical blink | rate < p10 baseline | 3 min | 15 min |

---

## Baseline Calculation

```python
baseline = {
    'p25': percentile(2hr_blinks, 25),  # Alert below this
    'p50': percentile(2hr_blinks, 50),  # "Normal"
    'p75': percentile(2hr_blinks, 75),  # Good
}
```

Cold start: Use population average (15 blinks/min) until 2 hours of data.

---

## Sync Strategy

```
Offline: Queue in SQLite
Online: Batch 100 rollups every 5 min
Failure: Exponential backoff (5s, 10s, 20s, 40s...)
Idempotency: UUID per rollup, upsert on conflict
```

---

## Project Structure

```
src/
  main.py           # Entry
  ui/               # PyQt windows, tray
  detection/        # Camera, MediaPipe, EAR
  core/             # Session, alerts, baseline
  data/             # SQLite, Supabase sync

web-dashboard/
  src/app/          # Next.js pages

tests/
  test_*.py         # pytest
```

---

## Critical Six Solutions

| Problem | Solution |
|---------|----------|
| Glasses | Confidence filter + single-eye fallback |
| Lighting | Histogram equalization + Kalman smoothing |
| Alert fatigue | Cooldowns + flow detection + escalation |
| Privacy | 100% on-device, only metrics sync |
| Baselines | Auto-calibrate using 2hr percentiles |
| Flow state | Detect via activity, queue alerts |

---

## Commands

```bash
# Run app (Windows)
python -X utf8 src/main.py

# Run tests
pytest tests/

# Build Windows exe
pyinstaller --onefile --windowed src/main.py

# Run dashboard locally
cd web-dashboard && npm run dev
```

---

## Cost at Scale

| Users | Cost/Month |
|-------|------------|
| 0-250 | $0 (free tier) |
| 1K | $25 |
| 10K | $27 |
| 100K | $60 (self-host) |

---

## Dependencies

```
# requirements.txt
PyQt6>=6.6.0
opencv-python>=4.8.0
mediapipe>=0.10.0
supabase>=2.0.0
psutil>=5.9.0
numpy>=1.24.0
```

---

## Checklist Before Submission

- [ ] App works offline
- [ ] Alerts fire correctly
- [ ] Flow state suppresses alerts
- [ ] Baseline calibrates in 2 hours
- [ ] Data syncs to Supabase
- [ ] Dashboard shows historical data
- [ ] GDPR export/delete works
- [ ] Works with glasses
- [ ] Works in different lighting
- [ ] Windows .exe packaged
