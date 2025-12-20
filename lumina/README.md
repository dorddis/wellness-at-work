# Lumina

B2B AI wellness platform for enterprises. Tracks employee eye strain and blink patterns using computer vision.

## Quick Start

```bash
# Install dependencies
pnpm install

# Development (all apps)
pnpm dev

# Development (desktop only)
pnpm dev:desktop

# Development (web only)
pnpm dev:web
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Monorepo | Turborepo + pnpm |
| Desktop | Electron 33+ |
| Web | Next.js 15 |
| UI | React 18 + Tailwind |
| State | Zustand |
| CV | MediaPipe FaceLandmarker |
| Local DB | better-sqlite3 |
| Cloud | Supabase (Auth + PostgreSQL) |

## Project Structure

```
lumina/
├── packages/
│   ├── ui/       # @lumina/ui - Shared React components
│   ├── core/     # @lumina/core - Blink detection logic
│   └── api/      # @lumina/api - Supabase client
├── apps/
│   ├── desktop/  # Electron app (employee use)
│   └── web/      # Next.js dashboard (admin + employee)
└── supabase/
    └── migrations/  # Database schema
```

## Features

### Desktop App (Electron)
- Real-time blink detection via webcam
- Floating status bar (always visible)
- System tray integration
- Local SQLite storage (offline-first)
- Background sync to Supabase

### Web Dashboard (Next.js)
- **Admin view:** Org-wide wellness metrics, team breakdown, alert inbox
- **Employee view:** Personal wellness data and trends
- Role-based access control

### B2B Features
- Multi-tenant organizations
- Configurable privacy (anonymous/named/manager-only)
- Department breakdowns
- Admin alerts for concerning metrics

## Setup

### 1. Supabase Project
1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and anon key

### 2. Environment Variables

Create `.env` files:

```bash
# apps/desktop/.env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Install & Run
```bash
pnpm install
pnpm dev
```

## Packages

### @lumina/core
Blink detection using MediaPipe FaceLandmarker:
- Eye Aspect Ratio (EAR) algorithm
- Baseline calibration
- Alert engine with cooldowns
- Session management

### @lumina/ui
Shared React components:
- StatusIndicator (compact/full)
- AlertToast with animations
- WellnessScore display
- BlinkRateChart with Recharts
- Zustand stores (session, alerts, settings)

### @lumina/api
Supabase client and queries:
- Authentication (magic link, Google)
- Organization management
- Wellness data sync
- Admin queries

## Blink Detection

Uses Eye Aspect Ratio (EAR) from 6 eye landmarks:

```
EAR = (|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|)
```

- Threshold: 0.21 (below = eyes closed)
- Consecutive frames: 2 (to confirm blink)
- Baseline: Auto-calibrated over 2 hours

## License

Proprietary - All rights reserved.
