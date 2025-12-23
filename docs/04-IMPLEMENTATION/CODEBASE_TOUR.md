# Codebase Tour - File Structure Walkthrough

**Status:** Active | Last Updated: Dec 23, 2025

---

## Overview

Lumina is a **Turborepo monorepo** with 3 apps and 3 shared packages. This guide walks through the codebase structure and explains what each file does.

**Total lines of code:** ~24,000 (TypeScript/React)

---

## Repository Structure

```
wellness-at-work/
├── lumina/                    # Monorepo root
│   ├── apps/                  # Application packages
│   │   ├── desktop/           # Electron app (main product)
│   │   └── web/               # Next.js admin dashboard
│   ├── packages/              # Shared libraries
│   │   ├── core/              # Detection algorithms
│   │   ├── ui/                # React components
│   │   └── api/               # Supabase client
│   ├── docs/                  # Documentation (this file)
│   └── package.json           # Workspace config
├── docs/                      # Project-level docs
└── README.md                  # Entry point
```

---

## Apps: Desktop (Electron)

**Path:** `lumina/apps/desktop/`

### Main Process (Node.js Backend)

**Purpose:** System-level operations (database, camera, tray, sync)

| File | Lines | Purpose |
|------|-------|---------|
| `src/main/index.ts` | 150 | Entry point, window creation, IPC handlers |
| `src/main/database.ts` | 300 | SQLite setup, schema migrations, cleanup |
| `src/main/sync.ts` | 200 | Cloud sync logic, batch uploads, retry |
| `src/main/tray.ts` | 120 | System tray (5 icon states, menu) |
| `src/main/meetingMode.ts` | 180 | Meeting detection (PowerShell), screen capture |

**Key code: `src/main/database.ts`**
```typescript
// SQLite setup with WAL mode
export function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'lumina.db')
  const db = new Database(dbPath)

  // Enable WAL for concurrent reads/writes
  db.pragma('journal_mode = WAL')

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS blink_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      ear_left REAL,
      ear_right REAL,
      ear_avg REAL,
      is_blink BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS minute_rollups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      minute_start INTEGER NOT NULL,
      blink_count INTEGER DEFAULT 0,
      avg_ear REAL,
      min_ear REAL,
      max_ear REAL,
      wellness_score INTEGER,
      synced BOOLEAN DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch() * 1000)
    );
  `)

  return db
}
```

### Renderer Process (React Frontend)

**Purpose:** User interface, detection loop, MediaPipe

| File | Lines | Purpose |
|------|-------|---------|
| `src/renderer/hub/App.tsx` | 1,200 | Main app window, detection loop (757-916) |
| `src/renderer/settings/Settings.tsx` | 400 | Settings UI, calibration, preferences |
| `src/renderer/components/StatusIndicator.tsx` | 100 | Real-time blink counter |
| `src/renderer/components/WellnessScore.tsx` | 150 | Wellness score gauge (0-100) |

**Key code: `src/renderer/hub/App.tsx` (lines 757-916)**
```typescript
// Detection loop (30 FPS)
useEffect(() => {
  if (!faceLandmarker || !videoRef.current) return

  let animationId: number

  async function detect() {
    const video = videoRef.current
    const timestamp = performance.now()

    // MediaPipe inference (10ms)
    const results = await faceLandmarker.detectForVideo(video, timestamp)

    if (results.faceLandmarks.length > 0) {
      const landmarks = results.faceLandmarks[0]

      // Calculate EAR
      const leftEAR = calculateEAR(landmarks, LEFT_EYE_INDICES)
      const rightEAR = calculateEAR(landmarks, RIGHT_EYE_INDICES)
      const avgEAR = (leftEAR + rightEAR) / 2.0

      // Detect blink
      const isBlink = avgEAR < EAR_THRESHOLD

      // Save to SQLite (IPC call to main process)
      await window.electron.saveBlinkEvent({
        timestamp: Date.now(),
        earLeft: leftEAR,
        earRight: rightEAR,
        earAvg: avgEAR,
        isBlink
      })

      // Update UI
      if (isBlink) {
        setBlinkCount(prev => prev + 1)
      }
    }

    // Schedule next frame (30 FPS)
    animationId = requestAnimationFrame(detect)
  }

  detect()

  return () => cancelAnimationFrame(animationId)
}, [faceLandmarker])
```

### Preload (Security Bridge)

**Purpose:** Expose safe IPC channels to renderer

| File | Lines | Purpose |
|------|-------|---------|
| `src/preload/index.ts` | 100 | contextBridge API, IPC methods |

**Key code:**
```typescript
// Expose safe APIs to renderer
contextBridge.exposeInMainWorld('electron', {
  // Database
  saveBlinkEvent: (data) => ipcRenderer.invoke('save-blink-event', data),
  getMinuteRollups: (startTime, endTime) => ipcRenderer.invoke('get-minute-rollups', startTime, endTime),

  // Meeting mode
  detectMeetingApp: () => ipcRenderer.invoke('detect-meeting-app'),
  startScreenCapture: (sourceId, region) => ipcRenderer.invoke('start-screen-capture', sourceId, region),

  // Sync
  syncNow: () => ipcRenderer.invoke('sync-now')
})
```

---

## Apps: Web (Next.js Dashboard)

**Path:** `lumina/apps/web/`

### App Router Structure

**Next.js 15 App Router** (file-based routing)

```
src/app/
├── (dashboard)/              # Protected routes (requires auth)
│   ├── layout.tsx            # Dashboard shell (sidebar, header)
│   ├── admin/
│   │   └── page.tsx          # Team analytics (admin-only)
│   ├── dashboard/
│   │   └── page.tsx          # User personal stats
│   └── settings/
│       └── page.tsx          # Account settings, data export
├── auth/
│   └── callback/
│       └── route.ts          # OAuth callback handler
├── login/
│   └── page.tsx              # Login page (magic link + Google)
├── privacy/
│   └── page.tsx              # Privacy policy (GDPR)
├── layout.tsx                # Root layout (fonts, providers)
└── page.tsx                  # Landing page (redirects to /login)
```

### Key Pages

**Admin Dashboard:** `src/app/(dashboard)/admin/page.tsx`
```typescript
export default async function AdminPage() {
  const supabase = createClient()

  // Get team wellness score
  const { data: teamStats } = await supabase
    .from('wellness_1day_rollup')
    .select('avg_wellness_score')
    .gte('day', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))

  const teamWellnessScore = average(teamStats.map(d => d.avg_wellness_score))

  // Get department breakdown
  const { data: deptStats } = await supabase
    .from('wellness_1day_rollup')
    .select(`
      avg_wellness_score,
      org_members!inner(department)
    `)

  return (
    <div>
      <h1>Team Wellness Dashboard</h1>
      <WellnessScoreGauge score={teamWellnessScore} />
      <DepartmentComparisonChart data={deptStats} />
    </div>
  )
}
```

**User Dashboard:** `src/app/(dashboard)/dashboard/page.tsx`
```typescript
export default async function DashboardPage() {
  const supabase = createClient()
  const user = await supabase.auth.getUser()

  // Get last 7 days of data
  const { data: weeklyData } = await supabase
    .from('wellness_1day_rollup')
    .select('*')
    .eq('user_id', user.id)
    .gte('day', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .order('day', { ascending: true })

  return (
    <div>
      <h1>Your Wellness Stats</h1>
      <WellnessScoreChart data={weeklyData} />
      <BlinkRateTrend data={weeklyData} />
      <SessionHistory data={weeklyData} />
    </div>
  )
}
```

### Middleware (Route Protection)

**File:** `src/middleware.ts`
```typescript
export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if not authenticated
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Admin-only routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const { data: member } = await supabase
      .from('org_members')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (member?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*']
}
```

---

## Packages: Core (Detection Algorithms)

**Path:** `lumina/packages/core/`

### Detection Algorithms

| File | Lines | Purpose |
|------|-------|---------|
| `src/detection/blink.ts` | 350 | EAR calculation, blink detector |
| `src/detection/posture.ts` | 200 | Distance, tilt, lean detection |
| `src/detection/yawn.ts` | 150 | MAR calculation, yawn detector |
| `src/detection/drowsiness.ts` | 180 | PERCLOS, fatigue scoring |
| `src/detection/faceLandmarker.ts` | 100 | MediaPipe initialization |

**Key code: `src/detection/blink.ts`**
```typescript
// Eye Aspect Ratio formula
export function calculateEAR(
  landmarks: NormalizedLandmark[],
  eyeIndices: number[]
): number {
  const [p1, p2, p3, p4, p5, p6] = eyeIndices.map(i => landmarks[i])

  // Vertical distances
  const A = distance(p2, p6)
  const B = distance(p3, p5)

  // Horizontal distance
  const C = distance(p1, p4)

  return (A + B) / (2.0 * C)
}

// Blink detector with frame counter
export class BlinkDetector {
  private consecutiveFrames = 0
  private readonly CONSEC_THRESHOLD = 2
  private blinkCount = 0

  update(ear: number): boolean {
    if (ear < EAR_THRESHOLD) {
      this.consecutiveFrames++

      if (this.consecutiveFrames === this.CONSEC_THRESHOLD) {
        this.blinkCount++
        return true // Blink detected
      }
    } else {
      this.consecutiveFrames = 0
    }

    return false
  }
}
```

### Baseline Calibration

**File:** `src/baseline/calibration.ts`
```typescript
// Auto-calibration (2 hours of data)
export class BaselineCalibrator {
  private samples: number[] = []
  private readonly CALIBRATION_DURATION = 2 * 60 * 60 * 1000 // 2 hours

  addSample(blinkRate: number) {
    this.samples.push(blinkRate)

    if (this.isCalibrated()) {
      this.calculatePercentiles()
    }
  }

  isCalibrated(): boolean {
    return this.samples.length >= (this.CALIBRATION_DURATION / 60000) // 120 samples
  }

  calculatePercentiles() {
    const sorted = this.samples.sort((a, b) => a - b)

    return {
      p25: sorted[Math.floor(sorted.length * 0.25)], // 25th percentile
      p50: sorted[Math.floor(sorted.length * 0.50)], // Median
      p75: sorted[Math.floor(sorted.length * 0.75)]  // 75th percentile
    }
  }
}
```

---

## Packages: UI (React Components)

**Path:** `lumina/packages/ui/`

### Components (24 total)

| Component | Lines | Purpose |
|-----------|-------|---------|
| `StatusIndicator.tsx` | 80 | Real-time status (green/yellow/red) |
| `AlertToast.tsx` | 120 | Alert notifications (break reminders) |
| `BlinkRateChart.tsx` | 200 | Recharts line chart |
| `WellnessScoreGauge.tsx` | 150 | Circular gauge (0-100) |
| `OnboardingFlow.tsx` | 400 | 6-step guided setup |
| `AchievementCard.tsx` | 100 | Badge display |
| `StreakCounter.tsx` | 90 | Streak visualization |

### Zustand Stores (7 total)

| Store | Purpose |
|-------|---------|
| `sessionStore.ts` | Current session state (blink count, EAR, wellness score) |
| `settingsStore.ts` | User preferences (persistence to localStorage) |
| `achievementStore.ts` | Achievement unlock state |
| `streakStore.ts` | Streak tracking (daily use, healthy eyes, etc.) |
| `alertStore.ts` | Alert queue, cooldown management |
| `meetingModeStore.ts` | Meeting detection, calibration regions |
| `onboardingStore.ts` | Onboarding progress (6 steps) |

**Key code: `src/stores/sessionStore.ts`**
```typescript
interface SessionState {
  isActive: boolean
  blinkCount: number
  currentEAR: number
  wellnessScore: number
  startTime: number | null

  startSession: () => void
  endSession: () => void
  updateBlink: (ear: number, isBlink: boolean) => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  isActive: false,
  blinkCount: 0,
  currentEAR: 0,
  wellnessScore: 100,
  startTime: null,

  startSession: () => set({ isActive: true, startTime: Date.now() }),

  endSession: () => {
    const { blinkCount, startTime } = get()
    const duration = Date.now() - (startTime || 0)

    // Save to SQLite
    window.electron.saveSession({ blinkCount, duration })

    set({ isActive: false, blinkCount: 0, startTime: null })
  },

  updateBlink: (ear, isBlink) => {
    const { blinkCount } = get()

    set({
      currentEAR: ear,
      blinkCount: isBlink ? blinkCount + 1 : blinkCount,
      wellnessScore: calculateWellnessScore(ear, blinkCount)
    })
  }
}))
```

---

## Packages: API (Supabase Integration)

**Path:** `lumina/packages/api/`

### Structure

| File | Lines | Purpose |
|------|-------|---------|
| `src/client.ts` | 50 | Supabase client singleton |
| `src/auth.ts` | 200 | signUpWithEmail, signInWithGoogle, etc. |
| `src/sync.ts` | 300 | syncWellnessData (batch uploads) |
| `src/queries.ts` | 1,500 | 107 CRUD functions |

**Key code: `src/sync.ts`**
```typescript
export async function syncWellnessData(db: Database, supabase: SupabaseClient) {
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

  // Bulk insert (single network call)
  const { error } = await supabase.from('wellness_data').insert(payload)

  if (!error) {
    // Mark as synced
    const ids = unsynced.map(r => r.id).join(',')
    db.prepare(`UPDATE minute_rollups SET synced = 1 WHERE id IN (${ids})`).run()
  }

  return { synced: unsynced.length, error }
}
```

**Key code: `src/queries.ts` (sample functions)**
```typescript
// Get user's last 7 days of data
export async function getWeeklyWellnessData(userId: string) {
  const { data, error } = await supabase
    .from('wellness_1day_rollup')
    .select('*')
    .eq('user_id', userId)
    .gte('day', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .order('day', { ascending: true })

  return { data, error }
}

// Get team wellness score (admin only)
export async function getTeamWellnessScore(organizationId: string) {
  const { data, error } = await supabase
    .from('wellness_1hour_rollup')
    .select('avg_wellness_score')
    .eq('organization_id', organizationId)
    .gte('hour', new Date(Date.now() - 24 * 60 * 60 * 1000))

  const avgScore = average(data.map(d => d.avg_wellness_score))

  return { score: avgScore, error }
}

// Export user data (GDPR compliance)
export async function exportUserData(userId: string) {
  const { data: wellness } = await supabase
    .from('wellness_data')
    .select('*')
    .eq('user_id', userId)

  const { data: sessions } = await supabase
    .from('exercise_sessions')
    .select('*')
    .eq('user_id', userId)

  return {
    wellness_data: wellness,
    exercise_sessions: sessions,
    exported_at: new Date().toISOString()
  }
}
```

---

## Configuration Files

### Root Package.json

**File:** `lumina/package.json`
```json
{
  "name": "lumina",
  "version": "0.1.5",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "dev:desktop": "turbo run dev --filter=@lumina/desktop",
    "dev:web": "turbo run dev --filter=@lumina/web",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.6.3",
    "typescript": "^5.9.3"
  }
}
```

### TypeScript Config

**Shared:** `lumina/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

**Desktop extends:** `lumina/apps/desktop/tsconfig.json`
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "types": ["electron", "better-sqlite3"]
  },
  "include": ["src/**/*"]
}
```

---

## Critical Files for Onboarding

**If you're new to the codebase, read these 5 files first:**

1. **`apps/desktop/src/renderer/hub/App.tsx` (lines 757-916)**
   - Understand detection loop (30 FPS)
   - See how MediaPipe is called
   - Learn blink detection logic

2. **`packages/core/src/detection/blink.ts`**
   - EAR formula implementation
   - Blink detector class
   - Kalman smoothing

3. **`apps/desktop/src/main/database.ts`**
   - SQLite schema
   - WAL mode setup
   - Auto-cleanup queries

4. **`packages/api/src/sync.ts`**
   - Cloud sync strategy
   - Batch upload logic
   - Error handling

5. **`apps/web/src/app/(dashboard)/admin/page.tsx`**
   - Admin dashboard queries
   - RLS policy enforcement
   - Team analytics

---

## File Naming Conventions

- **Components:** PascalCase (`StatusIndicator.tsx`)
- **Stores:** camelCase (`sessionStore.ts`)
- **Utils:** camelCase (`calculateEAR.ts`)
- **Types:** PascalCase (`types/Session.ts`)
- **Constants:** UPPER_SNAKE_CASE (`constants/THRESHOLDS.ts`)

---

## Import Patterns

**Workspace imports:**
```typescript
// From desktop app → shared UI
import { StatusIndicator } from '@lumina/ui'

// From desktop app → core detection
import { calculateEAR } from '@lumina/core/detection/blink'

// From web app → API client
import { getWeeklyWellnessData } from '@lumina/api/queries'
```

**Relative imports (within package):**
```typescript
// Same directory
import { BlinkDetector } from './blink'

// Parent directory
import { BaselineCalibrator } from '../baseline/calibration'
```

---

## Related Documentation

- **Getting Started:** [Full setup guide](GETTING_STARTED.md)
- **Development Workflow:** [Git, testing, debugging](DEVELOPMENT_WORKFLOW.md)
- **Architecture:** [System design](../03-ARCHITECTURE/ARCHITECTURE_OVERVIEW.md)
- **Data Flow:** [End-to-end pipeline](../03-ARCHITECTURE/DATA_FLOW.md)

---

**Questions?** See [Documentation Index](../INDEX.md) or explore the code directly.
