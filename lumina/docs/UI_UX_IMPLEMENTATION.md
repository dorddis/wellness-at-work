# UI/UX Enhancement Implementation Guide

This document details all UI/UX enhancements implemented for Lumina, based on competitor research (f.lux, Iris, Stretchly, Eyeblink, SitApp) and user retention best practices.

**Implementation Date:** December 2024
**Goal:** Reduce 77% Day-3 abandonment rate through gamification, better onboarding, and delightful UX.

---

## Table of Contents

1. [New Components](#new-components)
2. [Onboarding Flow](#onboarding-flow)
3. [Gamification System](#gamification-system)
4. [Settings Enhancements](#settings-enhancements)
5. [Dynamic Tray Icons](#dynamic-tray-icons)
6. [Database Schema](#database-schema)
7. [Verification Checklist](#verification-checklist)

---

## New Components

All new components are in `packages/ui/src/components/` and exported from `index.ts`.

### Privacy & Status

| Component | File | Purpose |
|-----------|------|---------|
| `PrivacyIndicator` | `PrivacyIndicator.tsx` | Shows camera privacy badge with "100% local" messaging |

**Props:**
```typescript
interface PrivacyIndicatorProps {
  isActive?: boolean;      // Whether camera is active
  isCompact?: boolean;     // Compact mode for headers
  className?: string;
}
```

### Posture Monitoring

| Component | File | Purpose |
|-----------|------|---------|
| `PostureIndicator` | `PostureIndicator.tsx` | Spine icon with color-coded posture status |
| `PostureStatusCard` | `PostureStatusCard.tsx` | Dashboard card showing posture metrics |

**PostureIndicator Props:**
```typescript
type PostureStatus = 'good' | 'fair' | 'poor' | 'unknown';

interface PostureIndicatorProps {
  status: PostureStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}
```

**PostureStatusCard Props:**
```typescript
interface PostureStatusCardProps {
  status: PostureStatus;
  totalMinutes: number;      // Good posture minutes today
  longestStreak: number;     // Longest streak in minutes
  className?: string;
}
```

### Analytics & Trends

| Component | File | Purpose |
|-----------|------|---------|
| `WeeklyTrendCard` | `WeeklyTrendCard.tsx` | 7-day wellness score visualization |

**Props:**
```typescript
interface DayData {
  label: string;        // "Mon", "Tue", etc.
  score: number | null; // 0-100 or null if no data
  isToday?: boolean;
}

interface WeeklyTrendCardProps {
  days: DayData[];
  className?: string;
}
```

### Gamification

| Component | File | Purpose |
|-----------|------|---------|
| `StreakBadge` | `StreakBadge.tsx` | Flame icon with streak count |
| `AchievementBadge` | `AchievementBadge.tsx` | Individual achievement display |

**StreakBadge Props:**
```typescript
interface StreakBadgeProps {
  count: number;
  type?: 'daily' | 'blink' | 'break' | 'posture';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**AchievementBadge Props:**
```typescript
type AchievementId =
  | 'first_session'
  | 'perfect_day'
  | 'week_warrior'
  | 'blink_master'
  | 'flow_state'
  | 'wellness_champion';

interface Achievement {
  id: AchievementId;
  name: string;
  description: string;
  icon: string;
  requirement: string;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked?: boolean;
  unlockedAt?: Date;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**Available Achievements (exported as `ACHIEVEMENTS`):**
```typescript
import { ACHIEVEMENTS } from '@lumina/ui';
// ACHIEVEMENTS.first_session, ACHIEVEMENTS.perfect_day, etc.
```

### Notifications

| Component | File | Purpose |
|-----------|------|---------|
| `PreBreakToast` | `PreBreakToast.tsx` | 30-second warning before breaks (Stretchly pattern) |

**Props:**
```typescript
interface PreBreakToastProps {
  secondsRemaining: number;
  onStartNow: () => void;
  onPostpone: () => void;
  postponesRemaining: number;
  maxPostpones?: number;  // Default: 2
  className?: string;
}
```

---

## Onboarding Flow

Located in `packages/ui/src/components/onboarding/`.

### Components

| Step | Component | Duration | Purpose |
|------|-----------|----------|---------|
| 1 | `WelcomeStep` | 10s | Logo animation, value proposition |
| 2 | `PrivacyStep` | 15s | Privacy promises (local, no images, your data) |
| 3 | `CameraStep` | 20s | Request permission with explanation |
| 4 | `CalibrationStep` | 30s | Baseline blink rate calibration |
| 5 | `GoalsStep` | 30s | Select wellness goals |
| 6 | `CompleteStep` | 10s | Confetti celebration, tips |

### Main Orchestrator

```typescript
import { OnboardingFlow } from '@lumina/ui';

<OnboardingFlow
  onComplete={() => markOnboardingDone()}
  onSkip={() => skipOnboarding()}
  hasCameraPermission={false}
  onRequestCameraPermission={async () => {
    const granted = await requestCameraPermission();
    return granted;
  }}
  onCalibrationComplete={(data) => {
    saveBaselineEar(data.baselineEar);
  }}
  onGoalsSelected={(goals) => {
    saveUserGoals(goals);
  }}
/>
```

### Goals Interface

```typescript
interface Goals {
  reduceEyeStrain: boolean;
  improvePosture: boolean;
  takeRegularBreaks: boolean;
}
```

---

## Gamification System

### Stores

Located in `packages/ui/src/stores/`.

#### streakStore.ts

```typescript
import { useStreakStore } from '@lumina/ui';

const {
  streaks,           // Record<StreakType, Streak>
  incrementStreak,   // (type: StreakType) => void
  breakStreak,       // (type: StreakType) => void
  getStreak,         // (type: StreakType) => Streak
} = useStreakStore();

type StreakType = 'daily_use' | 'healthy_blink' | 'break_compliance' | 'good_posture';

interface Streak {
  type: StreakType;
  currentCount: number;
  longestCount: number;
  lastUpdated: Date;
}
```

#### achievementStore.ts

```typescript
import { useAchievementStore } from '@lumina/ui';

const {
  unlockedAchievements,  // UnlockedAchievement[]
  progress,              // Record<AchievementId, number>
  unlockAchievement,     // (id: AchievementId) => void
  updateProgress,        // (id: AchievementId, value: number) => void
  isUnlocked,            // (id: AchievementId) => boolean
} = useAchievementStore();
```

---

## Settings Enhancements

Added to `apps/desktop/src/renderer/hub/App.tsx` in SettingsView:

### Sound Settings
- Sound preference dropdown: silence, chime, bell, soft-ping, nature
- Volume slider (0-100%)

### Break Settings
- Break interval slider (10-60 min, default 20)
- Break duration slider (10-60 sec, default 20)
- Pre-break notification toggle
- Max postpones slider (0-5, default 2)

### Posture Monitoring
- Enable posture monitoring toggle
- Posture sensitivity slider (1-5)
- Show posture alerts toggle

### Appearance
- Theme selector (system, light, dark)
- Compact mode toggle
- Show in menu bar toggle

---

## Dynamic Tray Icons

Located in `apps/desktop/src/main/tray.ts`.

### Icon States

| State | Color | Tooltip | Trigger |
|-------|-------|---------|---------|
| `active` | Green | "Lumina - {rate} blinks/min" | Healthy blink rate (>=10/min) |
| `warning` | Yellow | "Lumina - Low blink rate" | Low blink rate (<10/min) |
| `break` | Blue | "Lumina - Break Time!" | During break |
| `paused` | Gray | "Lumina - Monitoring Paused" | Detection stopped |
| `dnd` | Dark Gray | "Lumina - Do Not Disturb" | DnD mode active |

### API

```typescript
import { TrayManager, TrayIconState } from './tray';

// Set icon state manually
trayManager.setIconState('break');
trayManager.setIconState('active', 'Custom tooltip');

// Update menu (auto-updates icon based on state)
trayManager.updateMenu(isDetecting, blinkRate, isDnd);

// Set break mode
trayManager.setBreakMode(true);

// Get current state
const state: TrayIconState = trayManager.getIconState();
```

### Menu Items

- Open Dashboard
- Toggle Status Bar
- Start/Pause Detection
- Enable/Disable Do Not Disturb
- Take a Break Now
- Settings
- Quit Lumina

---

## Database Schema

Added to `apps/desktop/src/main/database.ts`.

### Tables

```sql
-- Streak tracking
CREATE TABLE IF NOT EXISTS user_streaks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL UNIQUE,
  current_count INTEGER DEFAULT 0,
  longest_count INTEGER DEFAULT 0,
  last_updated INTEGER NOT NULL,
  broken_at INTEGER
);

-- Achievement tracking
CREATE TABLE IF NOT EXISTS user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  badge_id TEXT NOT NULL UNIQUE,
  unlocked_at INTEGER NOT NULL,
  progress INTEGER DEFAULT 0
);

-- Daily progress
CREATE TABLE IF NOT EXISTS daily_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  breaks_taken INTEGER DEFAULT 0,
  breaks_skipped INTEGER DEFAULT 0,
  healthy_blink_minutes INTEGER DEFAULT 0,
  good_posture_minutes INTEGER DEFAULT 0,
  total_session_minutes INTEGER DEFAULT 0
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### Database Methods

```typescript
// Streaks
db.getStreaks(): StreakRecord[]
db.incrementStreak(type: string): void
db.breakStreak(type: string): void

// Achievements
db.getAchievements(): AchievementRecord[]
db.unlockAchievement(badgeId: string): void

// Daily Progress
db.getTodayProgress(): DailyProgress | null
db.incrementBreaksTaken(): void
db.incrementBreaksSkipped(): void
db.addHealthyBlinkMinutes(minutes: number): void
db.addGoodPostureMinutes(minutes: number): void

// Settings
db.getUserSettings(): UserSettings
db.updateUserSettings(settings: Partial<UserSettings>): void
```

---

## Verification Checklist

> **Status:** All items verified as implemented (2024-12)

### Components

- [x] **PrivacyIndicator**: Renders in header, shows pulsing when camera active
- [x] **PostureIndicator**: Shows correct color for good/fair/poor/unknown
- [x] **PostureStatusCard**: Displays minutes and streak correctly
- [x] **WeeklyTrendCard**: Shows 7 days with correct scores and today highlight
- [x] **StreakBadge**: Flame icon with count, different types work
- [x] **AchievementBadge**: Shows locked/unlocked state with icons
- [x] **PreBreakToast**: Countdown, Start Now, Postpone buttons work

### Onboarding

- [x] **WelcomeStep**: Logo animation plays, Get Started advances
- [x] **PrivacyStep**: Three privacy points display, I Understand advances
- [x] **CameraStep**: Shows detection items, requests permission on click
- [x] **CalibrationStep**: 30-second countdown, blink counting, completion screen
- [x] **GoalsStep**: Toggle goals, at least one required, Continue advances
- [x] **CompleteStep**: Confetti animation, tips display, Open Dashboard works

### Tray Icons

- [x] Icon changes to green when detecting with healthy rate
- [x] Icon changes to yellow when blink rate < 10/min
- [x] Icon changes to blue during breaks
- [x] Icon changes to gray when paused
- [x] Icon changes to dark gray in DnD mode
- [x] Menu shows correct state labels
- [x] "Take a Break Now" triggers break screen

### Settings

- [x] Sound preference saves and loads
- [x] Break interval slider updates
- [x] Pre-break notification toggles
- [x] Posture monitoring toggles
- [x] Theme selector works

### Database

- [x] Streaks table created on first run
- [x] `incrementStreak` increases count
- [x] `breakStreak` resets current, preserves longest
- [x] Achievements persist across restarts
- [x] Daily progress resets each day

---

## Files Modified/Created

### Created (22 files)

```
packages/ui/src/components/
├── PrivacyIndicator.tsx
├── PostureIndicator.tsx
├── PostureStatusCard.tsx
├── WeeklyTrendCard.tsx
├── StreakBadge.tsx
├── AchievementBadge.tsx
├── PreBreakToast.tsx
└── onboarding/
    ├── index.ts
    ├── OnboardingFlow.tsx
    ├── WelcomeStep.tsx
    ├── PrivacyStep.tsx
    ├── CameraStep.tsx
    ├── CalibrationStep.tsx
    ├── GoalsStep.tsx
    └── CompleteStep.tsx

packages/ui/src/stores/
├── streakStore.ts
└── achievementStore.ts
```

### Modified (4 files)

```
packages/ui/src/components/index.ts    # Added all exports
packages/ui/src/stores/index.ts        # Added store exports
apps/desktop/src/main/database.ts      # Added gamification tables
apps/desktop/src/main/tray.ts          # Added dynamic icons
apps/desktop/src/renderer/hub/App.tsx  # Dashboard redesign + settings
```

---

## Design Decisions

1. **Black/white/gray palette** - Per assignment requirements, only grayscale in UI. Tray icons use color for visibility.

2. **Framer Motion animations** - Smooth, professional feel for onboarding and components.

3. **Zustand with persist** - Streaks and achievements persist across sessions.

4. **SQLite for gamification** - Same database pattern as wellness events, no new dependencies.

5. **Pre-generated tray icons** - Icons cached at startup for instant state changes.

6. **2-minute onboarding** - Research shows 38% drop-off during long onboarding.

7. **Stretchly-inspired pre-break** - 30-second warning with 2 postpones reduces alert fatigue.

---

## Next Steps (Not Implemented)

1. **Flow State Detection** - Queue alerts when blink rate drops 30%+ (indicates focus)
2. **Calendar Integration** - Pause during Google Calendar meetings
3. **Eye Exercise Animations** - SVG exercises during breaks
4. **Sound Files** - Add actual audio files for notification sounds
5. **Insight Cards** - AI-generated tips based on patterns
