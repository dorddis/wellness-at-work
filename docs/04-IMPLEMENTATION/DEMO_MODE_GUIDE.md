# Demo Mode Guide

**Status:** Active | Last Updated: Dec 23, 2025

---

## Overview

**Demo Mode** pre-loads Lumina with 14 days of realistic wellness data, allowing instant product demonstrations without waiting for actual usage.

**Use cases:**
- Founder pitches to investors (show mature product)
- Sales demos to enterprise customers (skip onboarding)
- UI/UX development (test with realistic data)
- Screenshots for marketing materials

---

## Enabling Demo Mode

### Configuration

**File:** `lumina/apps/desktop/.env`

```bash
# Demo Mode (Pre-load data)
VITE_DEMO_MODE=true              # Enables demo data

# Auth Bypass (Skip login)
VITE_BYPASS_AUTH=true            # Uses mock dev user

# Supabase (Not required for demo mode)
VITE_SUPABASE_URL=               # Leave blank
VITE_SUPABASE_ANON_KEY=          # Leave blank
```

**Default:** Demo mode is ENABLED in `.env.example` for first-time users.

### Starting the App

```bash
cd lumina
pnpm dev:desktop
```

**What happens:**
1. App launches with demo data pre-loaded
2. No login required (uses mock user: `dev@lumina.local`)
3. Shows 14 days of historical data
4. Achievements 4/9 unlocked
5. Streaks active (5-day daily use)
6. Camera works but no cloud sync

---

## Demo Data Specification

### User Profile

**Mock user (when `VITE_BYPASS_AUTH=true`):**
```typescript
{
  id: 'dev-user-uuid',
  email: 'dev@lumina.local',
  organization: {
    id: 'dev-org-uuid',
    name: 'Development Org',
    role: 'admin'
  }
}
```

### Historical Data (SQLite)

**Daily Progress (14 days):**
```typescript
// Realistic weekly pattern
const weekdayPattern = {
  breaks: 4,              // 4 breaks per workday
  blinkMinutes: 420,      // 7 hours of good blink rate
  postureMinutes: 300     // 5 hours of good posture
}

const weekendPattern = {
  breaks: 1,              // 1 break per weekend day
  blinkMinutes: 120,      // 2 hours (less screen time)
  postureMinutes: 60      // 1 hour
}

// Example data (14 days ago to today)
[
  { date: '2025-12-09', ...weekdayPattern, wellnessScore: 85 },  // Mon
  { date: '2025-12-10', ...weekdayPattern, wellnessScore: 88 },  // Tue
  { date: '2025-12-11', ...weekdayPattern, wellnessScore: 82 },  // Wed
  { date: '2025-12-12', ...weekdayPattern, wellnessScore: 90 },  // Thu
  { date: '2025-12-13', ...weekdayPattern, wellnessScore: 87 },  // Fri
  { date: '2025-12-14', ...weekendPattern, wellnessScore: 75 },  // Sat
  { date: '2025-12-15', ...weekendPattern, wellnessScore: 78 },  // Sun
  // ... repeat for 2 weeks
]
```

**Minute Rollups (Last 7 days):**
- ~3,500 records (480 per weekday, 120 per weekend day)
- Realistic blink patterns:
  - Morning (9am-12pm): 17 blinks/min (alert)
  - Afternoon (12pm-3pm): 14 blinks/min (moderate)
  - Evening (3pm-6pm): 12 blinks/min (fatigued)

**Example rollup:**
```typescript
{
  minute_start: 1734955200000,  // 2025-12-23 10:00:00
  blink_count: 17,              // 17 blinks in this minute
  avg_ear: 0.22,                // Average eye aspect ratio
  min_ear: 0.18,                // Minimum (blink depth)
  max_ear: 0.26,                // Maximum (eyes wide open)
  wellness_score: 88,           // Calculated score
  synced: 0                     // Not synced (demo mode)
}
```

**Wellness Events (Last 7 days):**
- 15 yawn events (2-3 per day)
- 10 posture warnings (too close: 5, tilt: 3, lean: 2)
- 5 drowsiness alerts (PERCLOS >15%)

**User Baseline (Pre-calibrated):**
```typescript
{
  p25: 12.5,    // 25th percentile: 12.5 blinks/min
  p50: 15.8,    // Median: 15.8 blinks/min
  p75: 19.2,    // 75th percentile: 19.2 blinks/min
  calibrated_at: Date.now() - 7 * 24 * 60 * 60 * 1000  // 7 days ago
}
```

### Achievements (4/9 Unlocked)

**Unlocked:**
```typescript
[
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Complete your first wellness session',
    icon: '👋',
    unlockedAt: Date.now() - 13 * 24 * 60 * 60 * 1000  // 13 days ago
  },
  {
    id: 'perfect-day',
    name: 'Perfect Day',
    description: 'Achieve 100% wellness score for a full day',
    icon: '⭐',
    unlockedAt: Date.now() - 10 * 24 * 60 * 60 * 1000  // 10 days ago
  },
  {
    id: 'blink-master',
    name: 'Blink Master',
    description: 'Maintain healthy blink rate for 7 consecutive days',
    icon: '👁️',
    unlockedAt: Date.now() - 6 * 24 * 60 * 60 * 1000   // 6 days ago
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Start a wellness session before 9 AM',
    icon: '🌅',
    unlockedAt: Date.now() - 12 * 24 * 60 * 60 * 1000  // 12 days ago
  }
]
```

**Locked (5):**
- Night Owl, Break Champion, Wellness Warrior, Streak Legend, Perfect Week

### Streaks

**Active streaks (localStorage):**
```typescript
{
  dailyUse: {
    current: 5,              // 5 consecutive days
    best: 12,                // Personal best: 12 days
    lastUpdated: Date.now()
  },
  healthyEyes: {
    current: 3,              // 3 hours today
    best: 8,                 // Personal best: 8 hours
    lastUpdated: Date.now()
  },
  breakMaster: {
    current: 2,              // 2 breaks today
    best: 5,                 // Personal best: 5 breaks
    lastUpdated: Date.now()
  },
  goodPosture: {
    current: 45,             // 45 minutes today
    best: 90,                // Personal best: 90 minutes
    lastUpdated: Date.now()
  }
}
```

### Settings (Pre-configured)

**localStorage:**
```typescript
{
  onboardingComplete: true,                    // Skip onboarding flow
  cameraPermissionGranted: true,
  meetingModeEnabled: true,
  notificationsEnabled: true,
  theme: 'light',
  organization: {
    id: 'dev-org-uuid',
    name: 'Acme Corporation'                   // Demo company name
  },
  preferences: {
    breakReminderInterval: 20,                 // Minutes
    postureCheckInterval: 30,                  // Minutes
    wellnessGoal: 85                           // Target score
  }
}
```

---

## Demo Mode Implementation

### Database Seeding

**File:** `lumina/apps/desktop/src/main/demo.ts`

```typescript
export function seedDemoData(db: Database) {
  if (import.meta.env.VITE_DEMO_MODE !== 'true') return

  console.log('Seeding demo data...')

  // 1. Daily progress (14 days)
  const now = Date.now()
  for (let i = 13; i >= 0; i--) {
    const date = now - i * 24 * 60 * 60 * 1000
    const isWeekend = new Date(date).getDay() % 6 === 0 // Sat/Sun

    const breaks = isWeekend ? 1 : 4
    const blinkMinutes = isWeekend ? 120 : 420
    const postureMinutes = isWeekend ? 60 : 300
    const wellnessScore = isWeekend ? 75 + Math.random() * 5 : 82 + Math.random() * 8

    db.prepare(`
      INSERT INTO daily_progress (date, breaks, blink_minutes, posture_minutes, wellness_score)
      VALUES (?, ?, ?, ?, ?)
    `).run(date, breaks, blinkMinutes, postureMinutes, Math.round(wellnessScore))
  }

  // 2. Minute rollups (last 7 days)
  for (let day = 6; day >= 0; day--) {
    const dayStart = now - day * 24 * 60 * 60 * 1000
    const isWeekend = new Date(dayStart).getDay() % 6 === 0

    const minutesPerDay = isWeekend ? 120 : 480 // 2hr vs 8hr
    const startHour = 9 // 9am start

    for (let i = 0; i < minutesPerDay; i++) {
      const minute = dayStart + startHour * 60 * 60 * 1000 + i * 60 * 1000
      const hourOfDay = new Date(minute).getHours()

      // Realistic blink pattern (higher morning, lower afternoon)
      let blinkCount
      if (hourOfDay < 12) {
        blinkCount = 16 + Math.round(Math.random() * 3)  // 16-19
      } else if (hourOfDay < 15) {
        blinkCount = 13 + Math.round(Math.random() * 3)  // 13-16
      } else {
        blinkCount = 11 + Math.round(Math.random() * 3)  // 11-14
      }

      const avgEar = 0.20 + Math.random() * 0.04  // 0.20-0.24
      const minEar = avgEar - 0.04                 // Blink depth
      const maxEar = avgEar + 0.04                 // Eyes wide
      const wellnessScore = Math.round(70 + Math.random() * 25)

      db.prepare(`
        INSERT INTO minute_rollups (minute_start, blink_count, avg_ear, min_ear, max_ear, wellness_score, synced)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `).run(minute, blinkCount, avgEar, minEar, maxEar, wellnessScore)
    }
  }

  // 3. User baseline (pre-calibrated)
  db.prepare(`
    INSERT INTO user_baseline (p25, p50, p75, calibrated_at)
    VALUES (12.5, 15.8, 19.2, ?)
  `).run(now - 7 * 24 * 60 * 60 * 1000)

  // 4. Wellness events (last 7 days)
  const eventTypes = [
    { type: 'yawn', count: 15 },
    { type: 'posture_close', count: 5 },
    { type: 'posture_tilt', count: 3 },
    { type: 'posture_lean', count: 2 },
    { type: 'drowsiness', count: 5 }
  ]

  eventTypes.forEach(({ type, count }) => {
    for (let i = 0; i < count; i++) {
      const timestamp = now - Math.random() * 7 * 24 * 60 * 60 * 1000
      const severity = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]

      db.prepare(`
        INSERT INTO wellness_events (timestamp, event_type, severity, metadata, synced)
        VALUES (?, ?, ?, ?, 0)
      `).run(timestamp, type, severity, JSON.stringify({}))
    }
  })

  console.log('✅ Demo data seeded')
}
```

**Called in:** `apps/desktop/src/main/index.ts`
```typescript
app.on('ready', () => {
  const db = initDatabase()

  // Seed demo data on first run
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    const hasData = db.prepare('SELECT COUNT(*) as count FROM daily_progress').get()
    if (hasData.count === 0) {
      seedDemoData(db)
    }
  }

  createWindow()
})
```

### Store Initialization

**Achievement Store:** `packages/ui/src/stores/achievementStore.ts`
```typescript
export const useAchievementStore = create<AchievementState>((set) => {
  // Initialize from localStorage
  const stored = localStorage.getItem('lumina-achievements')

  const initialState = import.meta.env.VITE_DEMO_MODE === 'true'
    ? {
        achievements: DEMO_ACHIEVEMENTS,  // 4 unlocked
        lastUpdated: Date.now()
      }
    : stored
    ? JSON.parse(stored)
    : { achievements: [], lastUpdated: null }

  return {
    ...initialState,
    unlockAchievement: (id) => {
      // ...
    }
  }
})
```

**Streak Store:** `packages/ui/src/stores/streakStore.ts`
```typescript
const initialState = import.meta.env.VITE_DEMO_MODE === 'true'
  ? {
      dailyUse: { current: 5, best: 12, lastUpdated: Date.now() },
      healthyEyes: { current: 3, best: 8, lastUpdated: Date.now() },
      breakMaster: { current: 2, best: 5, lastUpdated: Date.now() },
      goodPosture: { current: 45, best: 90, lastUpdated: Date.now() }
    }
  : loadFromLocalStorage()
```

**Settings Store:** `packages/ui/src/stores/settingsStore.ts`
```typescript
const initialState = import.meta.env.VITE_DEMO_MODE === 'true'
  ? {
      onboardingComplete: true,
      organization: {
        id: 'dev-org-uuid',
        name: 'Acme Corporation'
      },
      // ... other demo settings
    }
  : loadFromLocalStorage()
```

---

## Resetting Demo Data

### Full Reset (Recommended)

```bash
# 1. Stop app
# Close all Lumina windows

# 2. Delete SQLite database
# macOS
rm ~/Library/Application\ Support/lumina/lumina.db
rm ~/Library/Application\ Support/lumina/lumina.db-shm
rm ~/Library/Application\ Support/lumina/lumina.db-wal

# Windows
del %APPDATA%\lumina\lumina.db
del %APPDATA%\lumina\lumina.db-shm
del %APPDATA%\lumina\lumina.db-wal

# Linux
rm ~/.config/lumina/lumina.db
rm ~/.config/lumina/lumina.db-shm
rm ~/.config/lumina/lumina.db-wal

# 3. Clear localStorage (optional)
# Open DevTools (Cmd+Option+I)
# Application → Local Storage → chrome-extension://... → Clear All

# 4. Restart app
pnpm dev:desktop
```

**Result:** Fresh demo data reloaded on next launch.

### Partial Reset (Keep Some Data)

**Reset only minute rollups:**
```sql
-- Open SQLite console
sqlite3 ~/Library/Application\ Support/lumina/lumina.db

-- Delete rollups
DELETE FROM minute_rollups;

-- Restart app - rollups regenerate from demo seed
```

**Reset only achievements:**
```javascript
// In DevTools console
localStorage.removeItem('lumina-achievements')
window.location.reload()
```

**Reset only streaks:**
```javascript
localStorage.removeItem('lumina-streaks')
window.location.reload()
```

---

## Switching Modes

### Demo → Production

**1. Update `.env`:**
```bash
# apps/desktop/.env
VITE_DEMO_MODE=false
VITE_BYPASS_AUTH=false

# Add real Supabase credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**2. Delete demo database:**
```bash
rm ~/Library/Application\ Support/lumina/lumina.db  # macOS
```

**3. Restart app:**
```bash
pnpm dev:desktop
```

**Result:**
- Real login required (Supabase auth)
- Onboarding flow shown
- Empty data (needs calibration)
- Cloud sync enabled

### Production → Demo

**1. Update `.env`:**
```bash
VITE_DEMO_MODE=true
VITE_BYPASS_AUTH=true

# Comment out Supabase (optional)
# VITE_SUPABASE_URL=
# VITE_SUPABASE_ANON_KEY=
```

**2. Delete production database (optional):**
```bash
rm ~/Library/Application\ Support/lumina/lumina.db
```

**3. Restart app:**
```bash
pnpm dev:desktop
```

**Result:** Demo data reloaded.

---

## Demo Scenarios

### Founder Pitch (15-minute demo)

**Goal:** Show mature product with realistic usage

**Setup:**
1. Enable demo mode (`VITE_DEMO_MODE=true`)
2. Run app: `pnpm dev:desktop`
3. Open dashboard view (show 14 days of history)

**Walkthrough:**
1. **Dashboard Overview** (2 min)
   - Point to wellness score trend (85-90 range)
   - Show 14 days of consistent usage
   - Highlight active streaks (5-day daily use)

2. **Achievements** (2 min)
   - Click "Achievements" tab
   - Show 4/9 unlocked (First Steps, Perfect Day, Blink Master, Early Bird)
   - Explain gamification strategy

3. **Real-Time Detection** (3 min)
   - Enable camera
   - Show blink counter updating
   - Explain EAR algorithm (on-device CV)

4. **Meeting Mode** (5 min)
   - Open Zoom/Teams
   - Show notification: "Meeting detected"
   - Calibrate self-view
   - **KEY DIFFERENTIATOR:** Detection continues during meeting

5. **Historical Data** (3 min)
   - Show minute-by-minute blink rate chart
   - Point to realistic pattern (higher morning, lower afternoon)
   - Explain 99.8% data reduction

**Outcome:** Investor sees production-ready product, not empty prototype.

### Sales Demo (Enterprise Prospect)

**Goal:** Show admin dashboard + user experience

**Setup:**
1. Desktop app in demo mode
2. Web dashboard at http://localhost:3000

**Walkthrough:**
1. **User View** (Desktop app)
   - Personal wellness dashboard
   - Real-time blink detection
   - Achievements and streaks

2. **Admin View** (Web dashboard)
   - Team wellness score (aggregated)
   - Department comparison chart
   - Alert inbox (who needs support)

**Outcome:** Buyer understands both end-user and admin value.

### UI/UX Development

**Goal:** Test components with realistic data

**Setup:**
1. Demo mode enabled
2. Component isolation (Storybook-style)

**Usage:**
```typescript
// Test component with demo data
const demoData = db.prepare('SELECT * FROM minute_rollups LIMIT 100').all()

<WellnessScoreChart data={demoData} />
```

**Outcome:** Faster iteration without waiting for real usage.

---

## Known Limitations

### Demo Mode Restrictions

**What works:**
- ✅ Real-time camera detection
- ✅ Blink counting
- ✅ Meeting mode
- ✅ Historical charts
- ✅ Achievements/streaks
- ✅ Settings UI

**What doesn't work:**
- ❌ Cloud sync (no Supabase when `VITE_BYPASS_AUTH=true`)
- ❌ Multi-device sync
- ❌ Team admin dashboard (requires real users)
- ❌ Data export (GDPR) - only works with real Supabase data

### Data Persistence

**Demo data persists until:**
1. Database file deleted
2. App uninstalled
3. Manual reset (see above)

**Not persistent:**
- Real-time blink counts (reset on app close)
- Current session state

---

## Related Documentation

- **Getting Started:** [Full setup guide](GETTING_STARTED.md)
- **Development Workflow:** [Daily dev routine](DEVELOPMENT_WORKFLOW.md)
- **Quick Start:** [5-minute setup](../01-START-HERE/QUICK_START_DEVELOPER.md)

---

**Questions?** See [Documentation Index](../INDEX.md) or file an issue.
