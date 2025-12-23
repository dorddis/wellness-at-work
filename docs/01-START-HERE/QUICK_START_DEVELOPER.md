# Quick Start - Developer

**Goal:** Get Lumina running locally in under 5 minutes.

---

## Prerequisites

- **Node.js:** 18+ ([Download](https://nodejs.org/))
- **pnpm:** 8+ (`npm install -g pnpm`)
- **Git:** For cloning the repository

**Optional (for cloud sync):**
- Supabase account ([Free tier](https://supabase.com/))

---

## 1. Clone & Install (2 minutes)

```bash
# Clone repository
git clone https://github.com/dorddis/wellness-at-work.git
cd wellness-at-work/lumina

# Install dependencies
pnpm install
```

---

## 2. Run in Demo Mode (30 seconds)

**Default configuration** (no setup needed):

```bash
pnpm dev:desktop
```

This starts the Electron app with:
- ✅ **Demo data pre-loaded** (14 days of history, achievements, streaks)
- ✅ **Auth bypassed** (uses mock dev user)
- ✅ **Camera works** but no cloud sync
- ✅ **Realistic blink patterns** (17/min morning → 12/min afternoon)

**First time users:** Demo mode is ENABLED by default in `.env.example`.

---

## 3. Explore the App

After launch, you'll see:

| Feature | What to try |
|---------|-------------|
| **Real-time detection** | Allow camera access → See blink counter update |
| **Achievements** | Click "Achievements" → See 4/9 unlocked |
| **Streaks** | Check daily use streak (5 days) |
| **History** | View 14 days of wellness data |
| **Meeting Mode** | Open Zoom/Teams → See notification to calibrate |

---

## 4. Development Modes

### Mode 1: Demo Mode (Default)
**Use for:** UI development, testing features without auth

```bash
# Already configured in apps/desktop/.env
VITE_DEMO_MODE=true
VITE_BYPASS_AUTH=true
```

### Mode 2: Production Mode (Cloud Sync)
**Use for:** Testing Supabase integration, multi-user scenarios

```bash
# Edit apps/desktop/.env
VITE_DEMO_MODE=false
VITE_BYPASS_AUTH=false

# Add Supabase credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Setup Supabase:** See [Supabase Setup Guide](../07-API-REFERENCE/SUPABASE_SETUP.md)

---

## 5. Run Web Dashboard

```bash
# Terminal 1: Desktop app
pnpm dev:desktop

# Terminal 2: Next.js dashboard
pnpm dev:web
```

**Access dashboard:** http://localhost:3000

**Login:** Use Google OAuth or magic link (requires Supabase setup)

---

## Common Commands

```bash
# Development
pnpm dev              # Run both desktop + web
pnpm dev:desktop      # Electron app only
pnpm dev:web          # Next.js dashboard only

# Type checking
pnpm typecheck        # Check all packages

# Linting
pnpm lint             # ESLint

# Build
pnpm build            # Build all apps
pnpm build:desktop    # Package Electron (creates installer)
pnpm build:web        # Build Next.js for deployment
```

---

## Troubleshooting

### Camera permission denied
**macOS:** System Settings → Privacy & Security → Camera → Allow Electron

**Windows:** Settings → Privacy → Camera → Allow desktop apps

### "Module not found" errors
```bash
# Clear pnpm cache and reinstall
rm -rf node_modules
pnpm store prune
pnpm install
```

### Database errors (SQLite)
```bash
# Delete local database (demo mode only)
rm ~/Library/Application\ Support/lumina/lumina.db  # macOS
rm %APPDATA%\lumina\lumina.db                       # Windows
```

### React peer dependency warnings
**Expected behavior** - react-joyride expects React 15-18 but we use 19.2.3 for security patches (CVE-2025-55182). Onboarding tour still works correctly.

---

## Next Steps

**I want to...**

- **Understand the codebase** → [Codebase Tour](../04-IMPLEMENTATION/CODEBASE_TOUR.md)
- **Set up Supabase** → [Supabase Setup](../07-API-REFERENCE/SUPABASE_SETUP.md)
- **Learn development workflow** → [Development Workflow](../04-IMPLEMENTATION/DEVELOPMENT_WORKFLOW.md)
- **Build for production** → [Deployment Guide](../04-IMPLEMENTATION/DEPLOYMENT.md)
- **Reset demo data** → [Demo Mode Guide](../04-IMPLEMENTATION/DEMO_MODE_GUIDE.md)

---

## Project Structure (Quick Ref)

```
lumina/
├── apps/
│   ├── desktop/          # Electron app (main + renderer)
│   └── web/              # Next.js admin dashboard
├── packages/
│   ├── core/             # Detection algorithms (EAR, MAR, PERCLOS)
│   ├── ui/               # Shared React components
│   └── api/              # Supabase client + queries
└── docs/                 # Documentation
```

---

**Questions?** See [Documentation Index](../INDEX.md) or read [Architecture Overview](../03-ARCHITECTURE/ARCHITECTURE_OVERVIEW.md).
