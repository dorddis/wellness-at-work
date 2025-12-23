# WellnessGuard - AI Wellness Coach for Knowledge Workers

## Product Vision

Transform a simple blink counter into a comprehensive AI-powered wellness monitoring system that helps knowledge workers maintain physical and mental health during long screen sessions.

**Tagline:** "Your AI companion for healthier screen time"

---

## Feature Tiers

### Tier 1: Core (Must Have for Assignment)
*These fulfill the assignment requirements*

| Feature | Description | Tech |
|---------|-------------|------|
| User Authentication | Email/password + OAuth (Google) | Supabase Auth |
| Real-time Blink Tracking | Integrate their eye tracker | MediaPipe |
| Blink Rate Analytics | Blinks/min, session totals | Python |
| Performance Monitor | CPU, Memory, Power usage display | psutil |
| Cloud Sync | Store blink data in cloud | Supabase DB |
| Offline Support | Queue data when offline, sync on reconnect | SQLite local + sync |
| Web Dashboard | View historical blink data | Next.js/React |
| System Tray/Menu Bar | App runs in background | PyQt |
| GDPR Compliance | Consent, data export, deletion | Backend APIs |

### Tier 2: Impressive (Differentiation)
*These make us stand out*

| Feature | Description | Tech |
|---------|-------------|------|
| Posture Detection | Head position, shoulder slouch | MediaPipe Pose |
| Fatigue Detection | Yawning, drowsy eyes, slow blinks | Custom ML |
| Smart Alerts | Context-aware wellness notifications | Rule engine |
| 20-20-20 Rule | Timed reminders for eye breaks | Timer + notification |
| Session Summaries | End-of-session wellness report | Analytics |
| Daily Wellness Score | 0-100 composite score | Scoring algorithm |
| Break Reminders | Movement prompts after X minutes | Timer |

### Tier 3: Above & Beyond (WOW Factor)
*Mention in README as roadmap, implement if time permits*

| Feature | Description | Tech |
|---------|-------------|------|
| Emotion Detection | Stress, focus, fatigue states | DeepFace/FER |
| Predictive Alerts | "You usually crash at 3pm" | ML patterns |
| Guided Breathing | Built-in stress relief exercises | UI + timer |
| Focus Mode | Batch alerts during deep work | State machine |
| Weekly Reports | Email summaries with trends | Scheduled jobs |
| Hydration Reminders | Drink water prompts | Timer |
| Ergonomic Tips | Personalized suggestions | Rule engine |

---

## Architecture

```
+--------------------------------------------------+
|                    USER DEVICES                   |
+--------------------------------------------------+
|                                                  |
|  +----------------+      +-------------------+   |
|  | Windows App    |      | macOS App         |   |
|  | (PyQt6)        |      | (PyQt6)           |   |
|  +-------+--------+      +--------+----------+   |
|          |                        |              |
|          +----------+-------------+              |
|                     |                            |
|            +--------v--------+                   |
|            | Detection Engine |                  |
|            | - Blink (MediaPipe)                 |
|            | - Posture (MediaPipe)               |
|            | - Fatigue (Custom)                  |
|            | - Emotion (DeepFace)                |
|            +--------+--------+                   |
|                     |                            |
|            +--------v--------+                   |
|            | Local Database   |                  |
|            | (SQLite)         |                  |
|            | - Offline queue  |                  |
|            | - Session cache  |                  |
|            +--------+--------+                   |
|                     |                            |
+---------------------|----------------------------+
                      |
                      | HTTPS (REST API)
                      |
+---------------------|----------------------------+
|                     v           CLOUD            |
|  +------------------------------------------+   |
|  |              SUPABASE                     |   |
|  |  +-------------+  +------------------+   |   |
|  |  | Auth        |  | PostgreSQL DB    |   |   |
|  |  | - Email/pwd |  | - users          |   |   |
|  |  | - OAuth     |  | - sessions       |   |   |
|  |  +-------------+  | - blink_data     |   |   |
|  |                   | - posture_data   |   |   |
|  |  +-------------+  | - alerts         |   |   |
|  |  | Storage     |  +------------------+   |   |
|  |  | - Avatars   |                         |   |
|  |  +-------------+  +------------------+   |   |
|  |                   | Realtime         |   |   |
|  |                   | - Live sync      |   |   |
|  |                   +------------------+   |   |
|  +------------------------------------------+   |
|                     |                            |
+---------------------|----------------------------+
                      |
                      | HTTPS
                      |
+---------------------|----------------------------+
|                     v                            |
|  +------------------------------------------+   |
|  |           WEB DASHBOARD                   |   |
|  |           (Next.js / React)               |   |
|  |                                          |   |
|  |  - Login with same Supabase auth         |   |
|  |  - View historical data                  |   |
|  |  - Charts and trends                     |   |
|  |  - Export data (GDPR)                    |   |
|  |  - Account settings                      |   |
|  +------------------------------------------+   |
|                                                  |
+--------------------------------------------------+
```

---

## Data Models

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    gdpr_consent BOOLEAN DEFAULT FALSE,
    consent_timestamp TIMESTAMPTZ,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preferences JSONB structure:
-- {
--   "blink_alert_threshold": 8,
--   "posture_alerts_enabled": true,
--   "break_interval_minutes": 30,
--   "quiet_hours_start": "22:00",
--   "quiet_hours_end": "08:00"
-- }
```

### Sessions Table
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    total_blinks INTEGER DEFAULT 0,
    avg_blink_rate FLOAT,
    wellness_score INTEGER,
    summary JSONB,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Summary JSONB structure:
-- {
--   "posture_alerts": 5,
--   "fatigue_alerts": 2,
--   "breaks_taken": 3,
--   "focus_periods": [{"start": "...", "end": "...", "duration": 1800}]
-- }
```

### Blink Data Table (Time-series)
```sql
CREATE TABLE blink_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    blink_count INTEGER NOT NULL,
    blink_rate FLOAT,  -- blinks per minute at this point
    ear_value FLOAT,   -- eye aspect ratio
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient time-range queries
CREATE INDEX idx_blink_data_user_time ON blink_data(user_id, timestamp DESC);
```

### Posture Data Table
```sql
CREATE TABLE posture_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    head_position JSONB,  -- {x, y, z, pitch, yaw, roll}
    posture_score INTEGER, -- 0-100
    is_slouching BOOLEAN,
    is_leaning_forward BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Alerts Table
```sql
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id),
    alert_type TEXT NOT NULL, -- 'blink', 'posture', 'fatigue', 'break', 'hydration'
    severity TEXT NOT NULL,   -- 'info', 'warning', 'critical'
    message TEXT NOT NULL,
    dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Desktop App Structure

```
wellness-guard/
├── src/
│   ├── main.py                 # Entry point
│   ├── app.py                  # PyQt Application
│   │
│   ├── ui/
│   │   ├── main_window.py      # Main window
│   │   ├── login_dialog.py     # Auth dialog
│   │   ├── dashboard.py        # Main dashboard view
│   │   ├── settings.py         # Settings panel
│   │   ├── system_tray.py      # Tray icon & menu
│   │   ├── alerts.py           # Alert notifications
│   │   └── styles.qss          # Qt stylesheet (dark theme)
│   │
│   ├── detection/
│   │   ├── __init__.py
│   │   ├── camera.py           # Camera capture management
│   │   ├── blink_detector.py   # Blink detection (MediaPipe)
│   │   ├── posture_detector.py # Posture detection
│   │   ├── fatigue_detector.py # Fatigue/drowsiness
│   │   └── emotion_detector.py # Emotion recognition
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── session.py          # Session management
│   │   ├── analytics.py        # Wellness score calculation
│   │   ├── alerts_engine.py    # Alert rules & triggers
│   │   └── performance.py      # CPU/Memory/Power monitoring
│   │
│   ├── data/
│   │   ├── __init__.py
│   │   ├── local_db.py         # SQLite for offline
│   │   ├── cloud_sync.py       # Supabase sync
│   │   └── models.py           # Data classes
│   │
│   └── utils/
│       ├── __init__.py
│       ├── config.py           # App configuration
│       └── logger.py           # Logging setup
│
├── assets/
│   ├── icons/                  # App icons
│   └── sounds/                 # Alert sounds (optional)
│
├── tests/
│   ├── test_blink_detector.py
│   ├── test_posture_detector.py
│   └── test_analytics.py
│
├── .github/
│   └── workflows/
│       ├── test.yml            # Run tests
│       └── build.yml           # Build executables
│
├── requirements.txt
├── setup.py
├── build_windows.py            # PyInstaller config
├── build_macos.py              # py2app config
└── README.md
```

---

## UI Wireframes (Text)

### Main Dashboard
```
+----------------------------------------------------------+
|  [=] WellnessGuard                          [_][O][X]    |
+----------------------------------------------------------+
|                                                          |
|  +------------------+  +-----------------------------+   |
|  |                  |  |     TODAY'S WELLNESS        |   |
|  |   LIVE CAMERA    |  |                             |   |
|  |      FEED        |  |      +-------------+        |   |
|  |                  |  |      |     78      |        |   |
|  |  [Blink: 12/min] |  |      |   /100      |        |   |
|  |  [Posture: Good] |  |      +-------------+        |   |
|  |                  |  |       Wellness Score        |   |
|  +------------------+  +-----------------------------+   |
|                                                          |
|  +--------------------------------------------------+   |
|  |                 SESSION STATS                     |   |
|  |                                                   |   |
|  |  Duration: 2h 34m    Blinks: 1,847    Breaks: 3  |   |
|  |                                                   |   |
|  |  [====== Blink Rate Over Time Chart ======]      |   |
|  |                                                   |   |
|  +--------------------------------------------------+   |
|                                                          |
|  +--------------------------------------------------+   |
|  |              SYSTEM PERFORMANCE                   |   |
|  |  CPU: [====----] 45%   MEM: [======--] 72%       |   |
|  |  Power: Normal                                    |   |
|  +--------------------------------------------------+   |
|                                                          |
+----------------------------------------------------------+
```

### System Tray Menu
```
+------------------------+
| WellnessGuard          |
+------------------------+
| Score: 78/100          |
| Blink Rate: 12/min     |
| Session: 2h 34m        |
+------------------------+
| [ ] Pause Monitoring   |
| [x] Show Alerts        |
| Settings...            |
+------------------------+
| Open Dashboard         |
| View Web Dashboard     |
+------------------------+
| Quit                   |
+------------------------+
```

### Alert Notification (Toast)
```
+------------------------------------------+
|  [!] Posture Alert                   [X] |
|                                          |
|  You've been slouching for 5 minutes.    |
|  Try rolling your shoulders back.        |
|                                          |
|  [Dismiss]  [Remind in 10 min]           |
+------------------------------------------+
```

---

## Alert Rules Engine

```python
ALERT_RULES = {
    "low_blink_rate": {
        "condition": "blink_rate < 8 for 2 minutes",
        "severity": "warning",
        "message": "Your blink rate is low. Take a moment to rest your eyes.",
        "action": "20-20-20 rule prompt",
        "cooldown_minutes": 10
    },
    "critical_blink_rate": {
        "condition": "blink_rate < 5 for 3 minutes",
        "severity": "critical",
        "message": "Your eyes need immediate rest! Look away from screen.",
        "action": "Forced break prompt",
        "cooldown_minutes": 15
    },
    "poor_posture": {
        "condition": "slouching_detected for 3 minutes",
        "severity": "info",
        "message": "Posture check! Sit up straight and roll shoulders back.",
        "action": "Posture guide",
        "cooldown_minutes": 15
    },
    "forward_head": {
        "condition": "head_distance < threshold for 2 minutes",
        "severity": "warning",
        "message": "You're leaning too close to the screen.",
        "action": "Distance reminder",
        "cooldown_minutes": 10
    },
    "fatigue_detected": {
        "condition": "yawn_count > 3 in 10 minutes OR drowsy_eyes",
        "severity": "warning",
        "message": "You look tired. Consider a short break or power nap.",
        "action": "Break suggestion",
        "cooldown_minutes": 20
    },
    "long_session": {
        "condition": "session_duration > 90 minutes without break",
        "severity": "info",
        "message": "You've been working for 90 minutes. Time for a stretch!",
        "action": "Stretch routine",
        "cooldown_minutes": 30
    },
    "twenty_twenty_twenty": {
        "condition": "every 20 minutes",
        "severity": "info",
        "message": "20-20-20: Look at something 20 feet away for 20 seconds.",
        "action": "Timer overlay",
        "cooldown_minutes": 20
    }
}
```

---

## Wellness Score Algorithm

```python
def calculate_wellness_score(session_data):
    """
    Calculate 0-100 wellness score based on multiple factors.
    """
    scores = {}

    # Blink Rate Score (0-25 points)
    # Healthy: 15-20 blinks/min, concerning: <10 blinks/min
    avg_blink_rate = session_data.avg_blink_rate
    if avg_blink_rate >= 15:
        scores['blink'] = 25
    elif avg_blink_rate >= 10:
        scores['blink'] = 15 + (avg_blink_rate - 10) * 2
    else:
        scores['blink'] = max(0, avg_blink_rate * 1.5)

    # Posture Score (0-25 points)
    # Based on % of time with good posture
    good_posture_pct = session_data.good_posture_percentage
    scores['posture'] = good_posture_pct * 0.25

    # Break Score (0-25 points)
    # Did user take breaks at appropriate intervals?
    expected_breaks = session_data.duration_minutes // 30
    actual_breaks = session_data.breaks_taken
    break_ratio = min(actual_breaks / max(expected_breaks, 1), 1.0)
    scores['breaks'] = break_ratio * 25

    # Fatigue Score (0-25 points)
    # Based on absence of fatigue indicators
    fatigue_incidents = session_data.fatigue_alerts
    if fatigue_incidents == 0:
        scores['fatigue'] = 25
    elif fatigue_incidents <= 2:
        scores['fatigue'] = 15
    else:
        scores['fatigue'] = max(0, 25 - fatigue_incidents * 3)

    total_score = sum(scores.values())

    return {
        'total': round(total_score),
        'breakdown': scores,
        'grade': get_grade(total_score)
    }

def get_grade(score):
    if score >= 90: return 'A'
    if score >= 80: return 'B'
    if score >= 70: return 'C'
    if score >= 60: return 'D'
    return 'F'
```

---

## Implementation Priority

### Phase 1: Core (Day 1-2)
- [ ] Project setup, dependencies
- [ ] Basic PyQt window with dark theme
- [ ] Integrate blink detection
- [ ] Local blink counting display
- [ ] Supabase auth (email + Google)
- [ ] Basic cloud sync

### Phase 2: Features (Day 2-3)
- [ ] Performance monitoring (CPU/Mem/Power)
- [ ] System tray integration
- [ ] Posture detection
- [ ] Alert notifications
- [ ] Session tracking
- [ ] Wellness score

### Phase 3: Polish (Day 3-4)
- [ ] Web dashboard
- [ ] Offline support with sync
- [ ] GDPR features (export, delete)
- [ ] CI/CD pipeline
- [ ] Windows packaging (.exe)
- [ ] macOS packaging (.dmg)

### Phase 4: Documentation
- [ ] Architecture diagram
- [ ] README with setup instructions
- [ ] GDPR compliance documentation
- [ ] Test cases
- [ ] Future roadmap section

---

## What to Build vs Document

### BUILD (for submission):
- Full desktop app with blink + posture detection
- Cloud auth and sync
- Basic web dashboard
- Wellness score
- Smart alerts
- System tray
- One platform packaging (Windows or Mac based on your machine)

### DOCUMENT (in README as roadmap):
- Emotion detection
- Predictive analytics
- Guided breathing
- Focus mode
- Weekly email reports
- Mobile app companion
- Team/enterprise features
- Integration APIs

---

## Negotiation Leverage

This submission demonstrates:

1. **Full-stack skills** - Desktop + Backend + Web
2. **ML/CV expertise** - Multiple detection models
3. **Product thinking** - User-centric feature design
4. **Architecture skills** - Scalable, offline-first design
5. **DevOps** - CI/CD, packaging, deployment
6. **Security awareness** - GDPR, auth, data protection

**This is not a 4-hour assignment. This is a product.**

Use this to justify: "I built what would take most teams weeks. 18 LPA is fair."
