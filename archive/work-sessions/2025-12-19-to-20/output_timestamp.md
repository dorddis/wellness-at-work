# Lumina - Implementation Summary

**Date:** December 19, 2024
**Project:** B2B AI Wellness Platform for Enterprises

---

## What Was Built

### Phase 1: Monorepo Foundation

Created a Turborepo + pnpm monorepo with three shared packages:

**@lumina/core** - Detection Logic
- `src/detection/constants.ts` - Eye indices (LEFT_EYE, RIGHT_EYE), EAR threshold (0.21)
- `src/detection/blink.ts` - EAR calculation, BlinkDetector class
- `src/detection/faceLandmarker.ts` - MediaPipe FaceLandmarker wrapper
- `src/alerts/engine.ts` - Alert triggering with cooldowns
- `src/alerts/rules.ts` - Configurable alert rules
- `src/baseline/calibration.ts` - 2-hour auto-calibration using percentiles
- `src/session/manager.ts` - Session tracking and minute rollups

**@lumina/ui** - Shared React Components
- `src/components/StatusIndicator.tsx` - Compact/full wellness display
- `src/components/AlertToast.tsx` - Animated alert notifications
- `src/components/WellnessScore.tsx` - Score visualization with trends
- `src/components/BlinkRateChart.tsx` - Recharts time-series chart
- `src/stores/sessionStore.ts` - Zustand session state
- `src/stores/alertStore.ts` - Zustand alerts
- `src/stores/settingsStore.ts` - Persisted settings
- `src/globals.css` - Tailwind base styles + wellness colors

**@lumina/api** - Supabase Client
- `src/client.ts` - Typed Supabase client
- `src/auth.ts` - Magic link, Google OAuth, org membership
- `src/sync.ts` - Offline-first SyncQueue
- `src/queries.ts` - Employee + Admin dashboard queries

**Database Schema** (`supabase/migrations/001_initial_schema.sql`)
- Multi-tenant: `organizations`, `org_members`
- Wellness data: `wellness_data`, `user_baselines`
- Alerts: `org_alerts`
- Row Level Security (RLS) policies for all tables

---

### Phase 2: Electron Desktop App

**Main Process** (`apps/desktop/src/main/`)
- `index.ts` - App entry, lifecycle management
- `windows.ts` - WindowManager for Hub, Status, Overlay windows
- `tray.ts` - System tray with context menu
- `database.ts` - SQLite with better-sqlite3, WAL mode
- `ipc.ts` - IPC handlers for all renderer communication

**Preload** (`apps/desktop/src/preload/`)
- `index.ts` - contextBridge with typed LuminaAPI interface

**Renderer Windows** (`apps/desktop/src/renderer/`)
- `hub/` - Main dashboard with camera preview, blink detection, charts
- `status/` - Floating compact status indicator
- `overlay/` - Alert toast notifications

**Key Features:**
- Vite + Electron plugin for hot reload
- MediaPipe FaceLandmarker integration
- SQLite local storage with minute rollups
- System tray with detection toggle
- Multi-window architecture (Wispr-inspired)

---

### Phase 3: Next.js Admin Dashboard

**Public Pages** (`apps/web/src/app/`)
- `/` - Landing page with features, pricing CTA
- `/login` - Magic link + Google OAuth
- `/join` - Organization invite code flow

**Employee Dashboard** (`apps/web/src/app/(dashboard)/dashboard/`)
- `/dashboard` - Today's stats, wellness score, session history
- `/dashboard/my-wellness` - Personal baseline, weekly trend, recommendations

**Admin Dashboard** (`apps/web/src/app/(dashboard)/admin/`)
- `/admin` - Team overview, department breakdown, recent alerts
- `/admin/employees` - Employee list with search/filter
- `/admin/employees/[id]` - Individual employee detail + actions
- `/admin/alerts` - Alert inbox with acknowledge, severity filter
- `/admin/settings` - Org settings, privacy mode, alert thresholds

**Infrastructure:**
- `src/middleware.ts` - Role-based routing (admin/manager vs employee)
- `src/lib/supabase/server.ts` - Server-side Supabase client
- `src/lib/supabase/client.ts` - Client-side Supabase client

---

## Full Directory Structure

```
lumina/
├── package.json                    # Workspace root
├── pnpm-workspace.yaml             # pnpm workspaces
├── turbo.json                      # Turborepo config
├── tsconfig.json                   # Base TypeScript config
│
├── packages/
│   ├── core/                       # @lumina/core
│   │   ├── src/
│   │   │   ├── detection/
│   │   │   │   ├── constants.ts
│   │   │   │   ├── blink.ts
│   │   │   │   └── faceLandmarker.ts
│   │   │   ├── alerts/
│   │   │   │   ├── engine.ts
│   │   │   │   └── rules.ts
│   │   │   ├── baseline/
│   │   │   │   └── calibration.ts
│   │   │   └── session/
│   │   │       └── manager.ts
│   │   └── package.json
│   │
│   ├── ui/                         # @lumina/ui
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── StatusIndicator.tsx
│   │   │   │   ├── AlertToast.tsx
│   │   │   │   ├── WellnessScore.tsx
│   │   │   │   ├── BlinkRateChart.tsx
│   │   │   │   └── index.ts
│   │   │   ├── stores/
│   │   │   │   ├── sessionStore.ts
│   │   │   │   ├── alertStore.ts
│   │   │   │   └── settingsStore.ts
│   │   │   ├── lib/
│   │   │   │   └── utils.ts
│   │   │   ├── globals.css
│   │   │   └── index.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── api/                        # @lumina/api
│       ├── src/
│       │   ├── client.ts
│       │   ├── auth.ts
│       │   ├── sync.ts
│       │   ├── queries.ts
│       │   └── index.ts
│       └── package.json
│
├── apps/
│   ├── desktop/                    # Electron app
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── index.ts
│   │   │   │   ├── windows.ts
│   │   │   │   ├── tray.ts
│   │   │   │   ├── database.ts
│   │   │   │   └── ipc.ts
│   │   │   ├── preload/
│   │   │   │   └── index.ts
│   │   │   └── renderer/
│   │   │       ├── hub/
│   │   │       │   ├── index.html
│   │   │       │   ├── main.tsx
│   │   │       │   └── App.tsx
│   │   │       ├── status/
│   │   │       │   ├── index.html
│   │   │       │   ├── main.tsx
│   │   │       │   └── App.tsx
│   │   │       └── overlay/
│   │   │           ├── index.html
│   │   │           ├── main.tsx
│   │   │           └── App.tsx
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   └── package.json
│   │
│   └── web/                        # Next.js dashboard
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx              # Landing
│       │   │   ├── globals.css
│       │   │   ├── login/
│       │   │   │   └── page.tsx
│       │   │   ├── join/
│       │   │   │   └── page.tsx
│       │   │   └── (dashboard)/
│       │   │       ├── layout.tsx        # Sidebar nav
│       │   │       ├── dashboard/
│       │   │       │   ├── page.tsx
│       │   │       │   └── my-wellness/
│       │   │       │       └── page.tsx
│       │   │       └── admin/
│       │   │           ├── page.tsx      # Team overview
│       │   │           ├── employees/
│       │   │           │   ├── page.tsx
│       │   │           │   └── [id]/
│       │   │           │       └── page.tsx
│       │   │           ├── alerts/
│       │   │           │   └── page.tsx
│       │   │           └── settings/
│       │   │               └── page.tsx
│       │   ├── lib/
│       │   │   └── supabase/
│       │   │       ├── server.ts
│       │   │       └── client.ts
│       │   └── middleware.ts
│       ├── next.config.ts
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── postcss.config.mjs
│       └── package.json
│
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Monorepo | Turborepo + pnpm |
| Desktop | Electron 33+ with Vite |
| Web | Next.js 15 |
| UI | React 18 + Tailwind CSS |
| State | Zustand |
| Animations | Motion (framer-motion) |
| CV | @mediapipe/tasks-vision (FaceLandmarker) |
| Local DB | better-sqlite3 |
| Cloud | Supabase (Auth + PostgreSQL + RLS) |
| Charts | Recharts |

---

## Key Algorithms

### Eye Aspect Ratio (EAR)
```typescript
// From @lumina/core/src/detection/blink.ts
export function calculateEAR(landmarks: Point[]): number {
  const A = euclideanDistance(landmarks[1], landmarks[5]); // vertical
  const B = euclideanDistance(landmarks[2], landmarks[4]); // vertical
  const C = euclideanDistance(landmarks[0], landmarks[3]); // horizontal
  return (A + B) / (2.0 * C);
}

// Eye indices for MediaPipe FaceLandmarker
export const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
export const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
export const EAR_THRESHOLD = 0.21;
export const CONSEC_FRAMES = 2;
```

### Baseline Calibration
- Collects 2 hours of blink rate data
- Calculates P25, P50, P75 percentiles
- Uses for personalized alert thresholds

---

## Commands

```bash
# Install dependencies
cd lumina
pnpm install

# Development
pnpm dev              # Run all apps
pnpm dev:desktop      # Electron only
pnpm dev:web          # Next.js only

# Type checking
pnpm typecheck

# Build
pnpm build
pnpm build:desktop    # Package Electron
pnpm build:web        # Build Next.js

# Lint
pnpm lint
```

---

## Next Steps

1. **Set up Supabase project** at supabase.com
2. **Run the migration** - Copy `supabase/migrations/001_initial_schema.sql` to Supabase SQL editor
3. **Add environment variables**:
   ```
   # apps/web/.env.local
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

   # apps/desktop/.env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```
4. **Test the apps**:
   ```bash
   pnpm dev:web      # http://localhost:3000
   pnpm dev:desktop  # Opens Electron app
   ```

---

## B2B Features Implemented

- **Multi-tenancy**: Organizations with employees, RLS policies
- **Privacy modes**: Anonymous, Named, Manager-only (configurable per org)
- **Admin dashboard**: Team overview, department breakdown, individual reports
- **Alert system**: Severity levels, acknowledge flow, email/in-app notifications
- **Invite codes**: Employees join via code or domain matching
- **Role-based access**: Admin, Manager, Employee roles

---

## Files Created (Count)

| Package/App | Files |
|-------------|-------|
| @lumina/core | 9 |
| @lumina/ui | 12 |
| @lumina/api | 5 |
| apps/desktop | 15 |
| apps/web | 18 |
| supabase | 1 |
| Root configs | 4 |
| **Total** | **64 files** |
