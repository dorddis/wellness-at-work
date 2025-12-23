# Implementation Checklist

Concrete steps. Check them off as you go.

---

## Day 1: Project Setup + Camera

### Setup
- [ ] Create project folder structure
- [ ] Create virtual environment: `python -m venv venv`
- [ ] Install dependencies: `pip install PyQt6 opencv-python mediapipe numpy`
- [ ] Create `src/main.py` entry point
- [ ] Create `src/app.py` PyQt application class

### Camera Module (`src/detection/camera.py`)
- [ ] Initialize cv2.VideoCapture(0)
- [ ] Capture frames at 30 FPS
- [ ] Handle camera not found error
- [ ] Add camera release on app close

### Basic Window (`src/ui/main_window.py`)
- [ ] Create QMainWindow with dark theme
- [ ] Add QLabel for video display
- [ ] Add QLabel for blink count
- [ ] Connect camera frames to display
- [ ] Test: Camera feed shows in window

---

## Day 2: Blink Detection

### MediaPipe Integration (`src/detection/blink_detector.py`)
- [ ] Initialize mp.solutions.face_mesh
- [ ] Process frames through face_mesh
- [ ] Extract LEFT_EYE and RIGHT_EYE landmarks
- [ ] Calculate Eye Aspect Ratio (EAR)
- [ ] Implement blink detection logic (EAR < 0.21 for 2+ frames)
- [ ] Add confidence filtering (>0.7)
- [ ] Add single-eye fallback for glasses

### Connect to UI
- [ ] Update blink count in real-time
- [ ] Show EAR value for debugging
- [ ] Test: Blink counter increments on real blinks
- [ ] Test with glasses (thin frames)
- [ ] Test with glasses (thick frames)

---

## Day 3: Local Database

### SQLite Setup (`src/data/local_db.py`)
- [ ] Create database file in app data folder
- [ ] Enable WAL mode for concurrency
- [ ] Create blink_events table
- [ ] Create minute_rollups table
- [ ] Create sync_queue table
- [ ] Create user_baseline table
- [ ] Add indexes for performance

### Event Storage
- [ ] Save blink events to blink_events table
- [ ] Create background thread for aggregation
- [ ] Aggregate every 60 seconds to minute_rollups
- [ ] Delete raw events older than 24 hours
- [ ] Test: Events persist after app restart

---

## Day 4: Alert Engine

### Alert Rules (`src/core/alerts.py`)
- [ ] Define ALERT_RULES dictionary
- [ ] Implement AlertEngine class
- [ ] Add cooldown tracking (per alert type)
- [ ] Add condition duration tracking
- [ ] Implement evaluate() method

### Notifications
- [ ] Create toast notification (system tray)
- [ ] Connect alert engine to UI
- [ ] Test: Low blink alert fires after 2 minutes
- [ ] Test: Cooldown prevents repeated alerts
- [ ] Test: Critical alerts override cooldowns

---

## Day 5: Session & Baseline

### Session Management (`src/core/session.py`)
- [ ] Start session on app open
- [ ] Send heartbeat every 30 seconds
- [ ] End session on app close
- [ ] Handle crash recovery (orphaned sessions)
- [ ] Calculate session summary on end

### Baseline Calibration (`src/core/baseline.py`)
- [ ] Collect blink rates for first 2 hours
- [ ] Calculate percentiles (p25, p50, p75)
- [ ] Store baseline in user_baseline table
- [ ] Use population average until calibrated
- [ ] Update alert thresholds based on baseline
- [ ] Test: Baseline calibrates after 2 hours

---

## Day 6: System Tray & Flow State

### System Tray (`src/ui/system_tray.py`)
- [ ] Create QSystemTrayIcon
- [ ] Add tray menu (status, pause, settings, quit)
- [ ] Show current blink rate in menu
- [ ] Handle minimize to tray
- [ ] Handle tray icon click (show window)

### Flow State Detection
- [ ] Track activity (keyboard, mouse) - optional
- [ ] Detect declining blink rate (simpler)
- [ ] Set flow_state flag when detected
- [ ] Queue alerts during flow state
- [ ] Show summary when flow ends
- [ ] Test: Alerts are queued during focus

---

## Day 7: Supabase Setup

### Supabase Project
- [ ] Create Supabase project
- [ ] Enable Google OAuth
- [ ] Run SQL schema (see FINAL_ARCHITECTURE.md)
- [ ] Enable Row Level Security
- [ ] Create RLS policies
- [ ] Test: Can insert/select via Supabase dashboard

### Auth Integration (`src/ui/login_dialog.py`)
- [ ] Install supabase-py
- [ ] Create login dialog (email + Google)
- [ ] Handle sign up flow
- [ ] Store session token locally
- [ ] Auto-login on app start
- [ ] Test: Can login and logout

---

## Day 8: Cloud Sync

### Sync Manager (`src/data/sync.py`)
- [ ] Create SyncManager class
- [ ] Query unsynced minute_rollups
- [ ] Batch into 100-record chunks
- [ ] Upload to Supabase wellness_data
- [ ] Mark synced in local database
- [ ] Add exponential backoff on failure
- [ ] Add network connectivity check
- [ ] Run sync every 5 minutes
- [ ] Test: Data appears in Supabase after sync

---

## Day 9: Web Dashboard

### Next.js Setup
- [ ] Create Next.js project in web-dashboard/
- [ ] Install @supabase/supabase-js
- [ ] Configure Supabase client
- [ ] Create auth provider

### Dashboard Page
- [ ] Login page with Supabase Auth
- [ ] Dashboard page (protected route)
- [ ] Query wellness_data for logged-in user
- [ ] Display blink rate chart (last 24 hours)
- [ ] Display session history table
- [ ] Test: Dashboard shows synced data

---

## Day 10: Polish & GDPR

### Settings (`src/ui/settings_dialog.py`)
- [ ] Alert thresholds (blink rate, posture)
- [ ] Quiet hours (start, end)
- [ ] Break interval setting
- [ ] Flow detection toggle
- [ ] Save to user_preferences

### GDPR Compliance
- [ ] Export data button (download JSON)
- [ ] Delete account button (with confirmation)
- [ ] Clear local data on logout
- [ ] Privacy policy text
- [ ] Test: Can export and delete all data

### Performance Monitor (`src/core/performance.py`)
- [ ] CPU usage (psutil.cpu_percent)
- [ ] Memory usage (psutil.virtual_memory)
- [ ] Power status (psutil.sensors_battery)
- [ ] Display in UI footer

---

## Day 11-12: Testing & Packaging

### Testing
- [ ] Test offline for 1 hour, then sync
- [ ] Test with different users (glasses, no glasses)
- [ ] Test in different lighting (bright, dim, backlit)
- [ ] Test alert fatigue (do alerts annoy you?)
- [ ] Test baseline accuracy (are thresholds right?)
- [ ] Fix any bugs found

### Packaging
- [ ] Create PyInstaller spec file
- [ ] Build Windows .exe: `pyinstaller --onefile --windowed src/main.py`
- [ ] Test .exe on fresh Windows machine
- [ ] Create installer (optional: NSIS)

---

## Day 13-14: Documentation & Submission

### README.md
- [ ] Project description
- [ ] Screenshots (app, dashboard, alerts)
- [ ] Installation instructions
- [ ] Build instructions
- [ ] Architecture overview (simplified)
- [ ] Acknowledgments

### Final Checks
- [ ] Code is clean (no debug prints)
- [ ] No hardcoded API keys (use .env)
- [ ] .gitignore includes .env, __pycache__, build/
- [ ] All tests pass
- [ ] App runs on fresh install
- [ ] Dashboard deploys to Vercel

---

## Success Metrics (Must Pass)

| Metric | Target | Test |
|--------|--------|------|
| Blink accuracy | >90% with glasses | Count blinks manually, compare |
| Alert latency | <100ms | Use timer in code |
| Offline resilience | 1+ hour | Disconnect WiFi, use app, reconnect |
| Sync reliability | 100% | Check Supabase has all local data |
| Dashboard load | <1s | Time page load |
| Memory usage | <200MB | Check task manager |
| Baseline calibration | 2 hours | Monitor calibration status |

---

## If Running Out of Time

**Cut in this order:**

1. Flow state detection (use simple timer-based breaks instead)
2. Posture detection (focus on blink only)
3. Google OAuth (email-only is fine)
4. Performance monitor (CPU/Memory display)
5. macOS packaging (Windows-only is acceptable)

**Never cut:**

- Blink detection (core feature)
- Offline support (differentiator)
- Cloud sync (required)
- Alert system (required)
- Dashboard (required)
