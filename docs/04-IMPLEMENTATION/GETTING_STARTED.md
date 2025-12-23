# Getting Started - Full Setup Guide

**Status:** Active | Last Updated: Dec 23, 2025

---

## Quick Start (5 minutes)

**Want to jump straight in?** See [Quick Start Developer](../01-START-HERE/QUICK_START_DEVELOPER.md)

**This guide:** Comprehensive setup for production deployment and development.

---

## Prerequisites

### Required Software

| Tool | Minimum Version | Download | Why Needed |
|------|----------------|----------|------------|
| **Node.js** | 18.0.0+ | [nodejs.org](https://nodejs.org/) | Runtime for Electron + Next.js |
| **pnpm** | 8.0.0+ | `npm install -g pnpm` | Package manager (monorepo support) |
| **Git** | 2.0.0+ | [git-scm.com](https://git-scm.com/) | Version control |

### Optional (Production Deployment)

| Tool | Purpose | Download |
|------|---------|----------|
| **PostgreSQL** | Local TimescaleDB testing | [postgresql.org](https://www.postgresql.org/) |
| **Docker** | Supabase local dev | [docker.com](https://www.docker.com/) |

---

## Repository Setup

### 1. Clone Repository

```bash
git clone https://github.com/dorddis/wellness-at-work.git
cd wellness-at-work/lumina
```

### 2. Install Dependencies

```bash
# Install all workspace packages (6 packages)
pnpm install

# Verify installation
pnpm list --depth=0
```

**Expected output:**
```
lumina@0.1.5
├── @lumina/api@0.1.5
├── @lumina/core@0.1.5
├── @lumina/desktop@0.1.5
├── @lumina/ui@0.1.5
└── @lumina/web@0.1.5
```

**Installation time:** ~2 minutes (depends on network speed)

---

## Configuration

### Desktop App (.env)

**File:** `lumina/apps/desktop/.env`

```bash
# Demo Mode (RECOMMENDED for first-time users)
VITE_DEMO_MODE=true              # Pre-load 14 days of realistic data
VITE_BYPASS_AUTH=true            # Skip Supabase login (uses mock dev user)

# Supabase (Required for cloud sync in production mode)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Analytics & Error Tracking
VITE_SENTRY_DSN=                 # Sentry error tracking (leave blank to disable)
VITE_ANALYTICS_ID=               # Google Analytics (leave blank to disable)
```

**Get Supabase credentials:**
1. Create project at [supabase.com](https://supabase.com/)
2. Project Settings → API → Copy `URL` and `anon` key
3. See [Supabase Setup Guide](../07-API-REFERENCE/SUPABASE_SETUP.md) for full config

### Web Dashboard (.env.local)

**File:** `lumina/apps/web/.env.local`

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Google OAuth (Required for "Sign in with Google")
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Optional: Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX  # Google Analytics
```

**Get Google OAuth credentials:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`
5. See [Deployment Guide](DEPLOYMENT.md#google-oauth-setup) for details

---

## Development Workflow

### Run Desktop App

```bash
# From lumina/ root
pnpm dev:desktop

# Or from apps/desktop/
cd apps/desktop
pnpm electron:dev
```

**What happens:**
1. Vite dev server starts (http://localhost:5173)
2. Electron window opens with hot reload
3. Camera permission requested on first run
4. Demo data loads if `VITE_DEMO_MODE=true`

**Troubleshooting:**
- **Camera blocked:** System Settings → Privacy → Camera → Allow Electron
- **Port 5173 in use:** Kill process or change port in `vite.config.ts`

### Run Web Dashboard

```bash
# From lumina/ root
pnpm dev:web

# Or from apps/web/
cd apps/web
pnpm dev
```

**Access:** http://localhost:3000

**Login methods:**
- Magic link (email OTP)
- Google OAuth
- **Demo mode:** Requires Supabase setup (no bypass available for web)

### Run Both Simultaneously

```bash
# Terminal 1
pnpm dev:desktop

# Terminal 2
pnpm dev:web

# Or use concurrently (single terminal)
pnpm dev  # Runs both
```

---

## Project Structure Tour

```
lumina/
├── apps/
│   ├── desktop/              # Electron app (main + renderer)
│   │   ├── src/
│   │   │   ├── main/         # Node.js backend (camera, DB, tray, sync)
│   │   │   │   ├── database.ts       # SQLite setup (WAL mode)
│   │   │   │   ├── sync.ts           # Cloud sync logic
│   │   │   │   ├── tray.ts           # System tray (5 icon states)
│   │   │   │   └── meetingMode.ts    # Meeting detection (PowerShell)
│   │   │   ├── renderer/     # React frontend (detection UI)
│   │   │   │   ├── hub/      # Main app window
│   │   │   │   └── settings/ # Settings window
│   │   │   └── preload/      # IPC bridge (security boundary)
│   │   └── dist/             # Built app (after pnpm build)
│   │
│   └── web/                  # Next.js 15 admin dashboard
│       ├── src/
│       │   ├── app/          # App Router (layouts, pages, API routes)
│       │   │   ├── (dashboard)/  # Protected routes
│       │   │   │   ├── admin/    # Team analytics (admin-only)
│       │   │   │   └── dashboard/ # User personal stats
│       │   │   ├── auth/     # OAuth callback handler
│       │   │   └── login/    # Login page
│       │   ├── components/   # Web-specific components
│       │   └── lib/          # Supabase client (server + client)
│       └── public/           # Static assets
│
├── packages/
│   ├── core/                 # Business logic (detection algorithms)
│   │   ├── src/
│   │   │   ├── detection/    # EAR, MAR, PERCLOS, posture
│   │   │   ├── baseline/     # Auto-calibration (P25/P50/P75)
│   │   │   ├── alert/        # Alert engine (cooldowns, duration requirements)
│   │   │   └── session/      # Session manager (lifecycle, rollups)
│   │
│   ├── ui/                   # Shared React components (desktop + web)
│   │   ├── src/
│   │   │   ├── components/   # 24 React components (StatusIndicator, AlertToast, etc.)
│   │   │   ├── stores/       # Zustand stores (session, settings, achievements, streaks)
│   │   │   └── hooks/        # Custom hooks (useBlinkDetection, useWellnessScore)
│   │
│   └── api/                  # Supabase integration
│       ├── src/
│       │   ├── client.ts     # Supabase client singleton
│       │   ├── auth.ts       # signUpWithEmail, signInWithGoogle, etc.
│       │   ├── sync.ts       # syncWellnessData (500-record batches)
│       │   └── queries.ts    # 107 exported CRUD functions
│
├── docs/                     # Documentation (you are here)
│   ├── 01-START-HERE/        # Quick starts, terminology
│   ├── 02-PRODUCT/           # Vision, roadmap, research
│   ├── 03-ARCHITECTURE/      # System design, data flow
│   ├── 04-IMPLEMENTATION/    # Developer guides
│   ├── 05-FEATURES/          # Feature deep-dives
│   ├── 06-BUSINESS/          # Cost analysis, market sizing
│   ├── 07-API-REFERENCE/     # Database schema, API specs
│   └── 08-TESTING/           # Test strategy, E2E verification
│
└── package.json              # Root workspace config
```

**Key files to explore first:**
1. `apps/desktop/src/renderer/hub/App.tsx` - Main detection loop (757-916 lines)
2. `packages/core/src/detection/blink.ts` - EAR algorithm implementation
3. `packages/ui/src/stores/sessionStore.ts` - Session state management
4. `apps/desktop/src/main/database.ts` - SQLite schema & setup

---

## Type Checking

```bash
# Check all packages
pnpm typecheck

# Check specific package
cd apps/desktop
pnpm typecheck
```

**Common type errors:**
- Missing `@types/` packages → `pnpm install -D @types/package-name`
- Zustand store types → Ensure `useStore.getState()` is used for selectors
- MediaPipe types → `@mediapipe/tasks-vision` includes types

---

## Linting

```bash
# Lint all packages
pnpm lint

# Lint specific package
cd apps/web
pnpm lint

# Auto-fix
pnpm lint --fix
```

**ESLint config:** `eslint.config.js` (ESLint 9 flat config)

**Common warnings:**
- React hooks deps → Add to dependency array or disable with `// eslint-disable-next-line`
- Unused vars → Remove or prefix with `_` (e.g., `_unusedParam`)

---

## Building for Production

### Desktop App (Electron)

```bash
cd apps/desktop
pnpm build           # Vite build → dist/
pnpm package         # electron-builder → release/
```

**Outputs:**
- **Windows:** `release/Lumina Setup 0.1.5.exe` (NSIS installer)
- **macOS:** `release/Lumina-0.1.5.dmg` (DMG installer)

**Installer sizes:**
- Windows: ~150 MB (includes Electron + Node)
- macOS: ~180 MB (includes Electron + native libs)

**See:** [Deployment Guide](DEPLOYMENT.md) for code signing & notarization

### Web Dashboard (Next.js)

```bash
cd apps/web
pnpm build           # Next.js build → .next/

# Test production build locally
pnpm start           # http://localhost:3000
```

**Deploy to Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd apps/web
vercel --prod
```

**Environment variables on Vercel:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

**See:** [Deployment Guide](DEPLOYMENT.md#vercel-deployment) for full setup

---

## Testing

### Manual Testing (Demo Mode)

1. Enable demo mode: `VITE_DEMO_MODE=true` in `apps/desktop/.env`
2. Run: `pnpm dev:desktop`
3. **Verify:**
   - ✅ 14 days of history shown
   - ✅ Achievements: 4/9 unlocked
   - ✅ Streaks: Daily Use (5 days)
   - ✅ Camera works (real-time blink counter)

### Unit Tests (Planned)

```bash
# Run tests (when implemented)
pnpm test

# Watch mode
pnpm test:watch
```

**Coverage goals:**
- Core detection algorithms: 80%+
- Sync logic: 70%+
- UI components: 60%+

**See:** [Test Strategy](../08-TESTING/TEST_STRATEGY.md)

### E2E Tests (Planned)

```bash
# Desktop E2E (Playwright)
cd apps/desktop
pnpm test:e2e

# Web E2E
cd apps/web
pnpm test:e2e
```

**Test scenarios:**
- Onboarding flow (6 steps)
- Blink detection accuracy
- Meeting mode calibration
- Cloud sync (offline → online)

**See:** [E2E Verification](../08-TESTING/E2E_VERIFICATION.md)

---

## Common Workflows

### Reset Demo Data

```bash
# Stop app first
# Then delete SQLite database

# macOS
rm ~/Library/Application\ Support/lumina/lumina.db

# Windows
del %APPDATA%\lumina\lumina.db

# Linux
rm ~/.config/lumina/lumina.db

# Clear localStorage (optional)
# Open DevTools → Application → Local Storage → Clear All

# Restart app - demo data reloads
pnpm dev:desktop
```

**See:** [Demo Mode Guide](DEMO_MODE_GUIDE.md) for details

### Switch Between Demo and Production

**Demo Mode → Production:**
```bash
# Edit apps/desktop/.env
VITE_DEMO_MODE=false
VITE_BYPASS_AUTH=false

# Add real Supabase credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Restart
pnpm dev:desktop
```

**Production → Demo Mode:**
```bash
# Edit apps/desktop/.env
VITE_DEMO_MODE=true
VITE_BYPASS_AUTH=true

# Delete database (optional, to reset)
rm ~/Library/Application\ Support/lumina/lumina.db  # macOS

# Restart
pnpm dev:desktop
```

### Update Dependencies

```bash
# Check for updates
pnpm outdated

# Update all packages
pnpm update

# Update specific package
pnpm update react@latest

# Update workspace packages
cd apps/desktop
pnpm update @lumina/ui@latest
```

**Security updates:** Check `pnpm audit` regularly

---

## Troubleshooting

### pnpm install fails

**Error:** `ERR_PNPM_NO_MATCHING_VERSION`

**Fix:**
```bash
# Clear pnpm cache
pnpm store prune

# Delete lockfile
rm pnpm-lock.yaml

# Reinstall
pnpm install
```

### Electron app won't start

**Symptom:** Window opens then closes immediately

**Fixes:**
1. Check logs: `apps/desktop/logs/main.log`
2. Verify `.env` file exists
3. Try: `pnpm dev:desktop --no-sandbox` (disable Chromium sandbox)

### Camera permission denied

**macOS:**
1. System Settings → Privacy & Security → Camera
2. Find "Electron" → Toggle ON
3. Restart app

**Windows:**
1. Settings → Privacy → Camera
2. "Let desktop apps access your camera" → ON
3. Restart app

### Meeting mode not detecting Zoom/Teams

**Check:**
1. Meeting app is running (not just installed)
2. PowerShell execution policy: `Set-ExecutionPolicy RemoteSigned`
3. App has screen recording permission (macOS: System Settings → Privacy → Screen Recording)

**Debug:**
```javascript
// In apps/desktop/src/main/meetingMode.ts
console.log('Detected processes:', detectedApps)
```

### Supabase connection fails

**Error:** `Invalid API key` or `CORS error`

**Fixes:**
1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
2. Check Supabase project is running (not paused due to inactivity)
3. Whitelist domain in Supabase dashboard: Authentication → URL Configuration

---

## Next Steps

**Now that you're set up:**

- **Understand the codebase:** [Codebase Tour](CODEBASE_TOUR.md)
- **Learn development workflow:** [Development Workflow](DEVELOPMENT_WORKFLOW.md)
- **Deploy to production:** [Deployment Guide](DEPLOYMENT.md)
- **Explore features:** [Meeting Mode](../05-FEATURES/MEETING_MODE.md), [Blink Detection](../05-FEATURES/BLINK_DETECTION.md)

---

**Questions?** See [Documentation Index](../INDEX.md) or file an issue.
