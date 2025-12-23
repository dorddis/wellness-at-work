# Lumina - AI Wellness Platform

**Status:** Production-ready MVP (Assignment submission for Singapore startup)
**Tech Stack:** Electron 39+ + Next.js 15 + MediaPipe + Supabase
**Timeline:** Dec 2024 - Dec 2025 (12 months, ~68-103 hours focused implementation)

---

## 🎯 Quick Navigation

**I want to...**

- **🚀 Run a founder demo** → [Founder Demo Package](docs/FOUNDER_DEMO_PACKAGE.md)
- **💻 Start developing** → [Developer Quick Start](docs/01-START-HERE/QUICK_START_DEVELOPER.md)
- **🏗️ Understand the architecture** → [Architecture Overview](docs/03-ARCHITECTURE/ARCHITECTURE_OVERVIEW.md)
- **📊 See business case** → [Cost Analysis](docs/06-BUSINESS/COST_ANALYSIS.md)
- **🔍 Explore all docs** → [Documentation Index](docs/INDEX.md)
- **✅ Check what's built** → [Current Implementation Status](docs/CURRENT_IMPLEMENTATION_STATUS.md)

---

## What is Lumina?

**Lumina** is a B2B AI wellness platform that helps enterprises prevent eye strain and fatigue among knowledge workers using computer vision and real-time blink detection.

### The Problem

- **Eye strain = #1 computer-related health complaint** (American Optometric Association)
- Knowledge workers spend 8-12 hours/day on screens
- Reduced blink rate (12/min working vs 17/min normal) causes dry eyes, headaches, fatigue
- Existing solutions fail: no all-in-one platform, wearables inconvenient, enterprise underserved

### The Solution

**Lumina = AI wellness coach using computer vision (no wearables required)**

- ✅ **Real-time blink detection** via MediaPipe FaceLandmarker (478 landmarks, 30 FPS)
- ✅ **Meeting mode** - Screen capture during Zoom/Teams/Meet calls (30-50% of workday)
- ✅ **Offline-first** - 100% on-device CV, 99.8% data reduction (2.6M → 1,440 rows/user/day)
- ✅ **Enterprise dashboard** - Team analytics, privacy modes, GDPR compliant
- ✅ **Gamification** - Achievements, streaks, break reminders (20-20-20 rule)
- ✅ **Auto-calibration** - Personalizes baselines using P25/P50/P75 percentiles (2-hour calibration)

---

## Tech Stack

| Component | Technology | Version | Why Chosen |
|-----------|------------|---------|------------|
| **Desktop Framework** | Electron | 39.2.7 | Cross-platform, native APIs, screen capture |
| **Web Framework** | Next.js | 15.1.11 | App Router, SSR, Vercel deployment |
| **UI Framework** | React | 18.3.1 | Component reuse across desktop + web |
| **Computer Vision** | MediaPipe FaceLandmarker | 0.10.21 | 478 landmarks, 10ms inference, runs on CPU |
| **Local Storage** | better-sqlite3 | 12.5.0 | Offline-first, WAL mode, 9 tables |
| **Cloud Backend** | Supabase | PostgreSQL + Auth + RLS | Free tier 0-250 users, multi-tenant architecture |
| **State Management** | Zustand | 5.0.9 | Lightweight, localStorage persistence |
| **Charts** | Recharts | 3.6.0 | Declarative, responsive charts |
| **Monorepo** | Turborepo + pnpm | Latest | 6 workspace packages |

**Security:** All packages updated Dec 23, 2025 (Next.js CVE-2025-55182 fixed)

---

## Key Features

### Desktop App (Electron)
- ✅ Real-time blink detection (30 FPS, <100ms latency)
- ✅ Meeting mode (screen capture from Zoom/Teams/Meet)
- ✅ Posture detection (distance, tilt, lean)
- ✅ Yawn & drowsiness detection (MAR + PERCLOS algorithms)
- ✅ Break reminders (20-20-20 rule with countdown timer)
- ✅ Session history (weekly chart, CSV export)
- ✅ Eye exercises (6 exercises with guided timers)
- ✅ Achievements & streaks (9 achievements, 4 streak types)
- ✅ Baseline calibration (auto 2-hour calibration)
- ✅ System tray (5 icon states, dynamic menu)
- ✅ Offline queue (5-minute batch sync)

### Web Dashboard (Next.js)
- ✅ User dashboard (personal wellness stats, trends, insights)
- ✅ Admin overview (team wellness score, department analytics)
- ✅ Employee management (privacy modes, role-based access)
- ✅ Alerts inbox (low blink rate, extended sessions)
- ✅ Team challenges (leaderboard, progress tracking)
- ✅ Analytics (metrics, trend charts, comparisons)
- ✅ Integrations (Calendar, Slack, Teams, HR systems)
- ✅ GDPR compliance (data export, account deletion, 30-day grace period)
- ✅ Authentication (Magic Link + Google OAuth)

### Shared Packages
- ✅ **@lumina/core** - Business logic (detection algorithms, alert engine, baseline calibration)
- ✅ **@lumina/ui** - 24 React components, 7 Zustand stores
- ✅ **@lumina/api** - 107 Supabase functions, GDPR queries

---

## Critical Challenges Solved (6/9 Complete)

| # | Challenge | Solution | Status |
|---|-----------|----------|--------|
| 1 | Glasses (75% users) | MediaPipe confidence filter + single-eye fallback | ✅ Complete |
| 2 | Lighting (100% users) | Adaptive frame processing | ✅ Complete |
| 3 | Alert fatigue | Cooldowns + duration requirements | 🟡 Partial |
| 4 | Privacy perception | 100% on-device CV, visual indicators | ✅ Complete |
| 5 | Baseline calibration | Auto-calibrate 2hr using P25/P50/P75 | ✅ Complete |
| 6 | Flow interruption | Detect via declining blink rate | 🟡 Planned |
| 7 | **Meeting Mode** | **Screen-capture self-view from Zoom/Teams/Meet** | **✅ Complete** |
| 8 | **Posture Detection** | **Face landmarks for distance/tilt/lean** | **✅ Complete** |
| 9 | **Yawn & Drowsiness** | **MAR + PERCLOS algorithms** | **✅ Complete** |

**Progress:** 6/9 complete, 2/9 partial, 1/9 planned (78% coverage)

---

## Business Model

### Cost Analysis

| Users | Storage | Monthly Cost | Per-User |
|-------|---------|--------------|----------|
| 0-250 | 500 MB | $0 (free tier) | $0 |
| 1K | 2 GB | $25 (Pro) | $0.025 |
| 10K | 20 GB | $27 | $0.003 |
| 100K | 200 GB | $60 (self-host) | $0.0006 |

**60x cheaper than typical SaaS** (benchmark: $3.60/user/month)

### Market Opportunity

- **TAM:** 150M knowledge workers (desk-based, computer-heavy)
- **SAM:** 50M enterprise employees (companies 100+ employees)
- **SOM:** 500K users (0.3% market capture, realistic 3-year goal)

**Competitor Analysis:**
- BLiiNK AI - $30/yr consumer, no B2B offering
- No true B2B all-in-one computer vision wellness platform exists

---

## Implementation Status

**ALL Tier 1 (Core) features are ✅ COMPLETE and production-ready.**

- **Desktop app:** Real-time blink detection, meeting mode, gamification, offline-first SQLite
- **Web dashboard:** Admin analytics, user dashboards, GDPR compliance, role-based access
- **Shared packages:** Robust detection algorithms, 24 React components, comprehensive Supabase API
- **Database:** 9 SQLite tables (desktop), 10+ Supabase tables (cloud), verified 99.8% data reduction

See [Current Implementation Status](docs/CURRENT_IMPLEMENTATION_STATUS.md) for complete feature audit.

---

## Getting Started

### Prerequisites

- Node.js 18+ (20+ recommended)
- pnpm 8+
- Supabase account (free tier)
- Webcam for blink detection

### Quick Start (5 minutes)

```bash
# Clone repository
git clone https://github.com/dorddis/wellness-at-work.git
cd wellness-at-work/lumina

# Install dependencies
pnpm install

# Development mode (demo data pre-loaded)
pnpm dev

# Production mode (real Supabase)
# 1. Create Supabase project
# 2. Copy .env.example to .env
# 3. Add Supabase URL and anon key
# 4. Run migrations (lumina/supabase/migrations/*.sql)
pnpm dev
```

**Demo Mode:** Enabled by default (`VITE_DEMO_MODE=true`). Includes 14 days of synthetic data, 4/9 achievements unlocked, pre-calibrated baseline.

**Detailed Setup:** See [Developer Quick Start](docs/01-START-HERE/QUICK_START_DEVELOPER.md)

---

## Project Structure

```
wellness-at-work/
├── README.md                  # You are here
├── docs/                      # Comprehensive documentation
│   ├── INDEX.md               # Master navigation hub
│   ├── FOUNDER_DEMO_PACKAGE.md  # Complete founder pitch deck
│   ├── CURRENT_IMPLEMENTATION_STATUS.md  # Feature audit
│   ├── 01-START-HERE/         # Quick orientation
│   ├── 02-PRODUCT/            # Business & product strategy
│   ├── 03-ARCHITECTURE/       # Technical design
│   ├── 04-IMPLEMENTATION/     # Developer guides
│   ├── 05-FEATURES/           # Feature deep dives
│   ├── 06-BUSINESS/           # Business case materials
│   ├── 07-API-REFERENCE/      # Technical specs
│   └── 08-TESTING/            # QA & verification
├── archive/                   # Historical artifacts
│   └── work-sessions/         # Session logs (24 files)
└── lumina/                    # Monorepo implementation
    ├── apps/
    │   ├── desktop/           # Electron app (Vite + React)
    │   └── web/               # Next.js dashboard
    ├── packages/
    │   ├── core/              # Business logic
    │   ├── ui/                # React components
    │   └── api/               # Supabase integration
    └── supabase/
        └── migrations/        # Database schema
```

---

## Documentation Highlights

**For Founders & Investors:**
- [Founder Demo Package](docs/FOUNDER_DEMO_PACKAGE.md) - 15-min read, 20-min presentation
- [Product Vision](docs/02-PRODUCT/PRODUCT_VISION.md) - Problem, solution, market, positioning
- [Cost Analysis](docs/06-BUSINESS/COST_ANALYSIS.md) - $0-60/month for 0-100K users
- [Development Timeline](docs/06-BUSINESS/DEVELOPMENT_TIMELINE.md) - 12-month journey

**For Developers:**
- [Quick Start Developer](docs/01-START-HERE/QUICK_START_DEVELOPER.md) - 5-min setup
- [Architecture Overview](docs/03-ARCHITECTURE/ARCHITECTURE_OVERVIEW.md) - System design
- [Codebase Tour](docs/04-IMPLEMENTATION/CODEBASE_TOUR.md) - File structure walkthrough
- [Deployment Guide](docs/04-IMPLEMENTATION/DEPLOYMENT.md) - Production deployment

**For Product Managers:**
- [Feature Roadmap](docs/02-PRODUCT/FEATURE_ROADMAP.md) - Tier 1/2/3 features with status
- [Critical Challenges](docs/02-PRODUCT/CRITICAL_CHALLENGES.md) - The 9 make-or-break problems
- [User Research](docs/02-PRODUCT/USER_RESEARCH/) - 6 research documents

**For QA/Testing:**
- [E2E Verification](docs/08-TESTING/E2E_VERIFICATION.md) - 30-min test path
- [Demo Mode Guide](docs/04-IMPLEMENTATION/DEMO_MODE_GUIDE.md) - How to use/reset demo data

---

## Demo Mode

**Environment Variable:** `VITE_DEMO_MODE=true` (default)

**Pre-populated Data:**
- 14 days of daily progress (breaks, blink minutes, posture minutes)
- 7 days of minute rollups (~3,500 records, realistic blink patterns)
- 4/9 achievements unlocked (First Steps, Perfect Day, Blink Master, Early Bird)
- Pre-calibrated baseline (P25=12.5, P50=15.8, P75=19.2)
- Realistic blink patterns (17/min morning → 12/min afternoon)

**Auth Bypass:** `VITE_BYPASS_AUTH=true` skips Supabase authentication (uses mock dev user)

---

## Deployment Readiness

| Component | Status | Evidence |
|-----------|--------|----------|
| **Desktop Packaging** | ✅ Ready | electron-builder configured for Windows (NSIS) + macOS (DMG) |
| **macOS Signing** | ✅ Ready | Notarization config in place |
| **Web Deployment** | ✅ Ready | next.config.ts compatible with Vercel |
| **Environment Variables** | ✅ Ready | VITE_DEMO_MODE, VITE_BYPASS_AUTH for dev |
| **GDPR Compliance** | ✅ Ready | Export, deletion, consent tracking complete |
| **RLS Policies** | ✅ Ready | Multi-tenant data isolation enforced |
| **Security** | ✅ Ready | All packages updated Dec 23, 2025 (no CVEs) |

---

## Testing

### Test Coverage

| Test Suite | Status | Lines | Coverage |
|------------|--------|-------|----------|
| Core detection tests | ✅ Complete | ~24K | Blink, calibration, Kalman, spike detection |
| Sync tests | ✅ Complete | 504 lines | Concurrency, error recovery, offline mode |
| Database tests | ✅ Complete | 200+ lines | Edge cases, cleanup, export |

### E2E Test Path (30 minutes)

```
Web Sign-Up → Desktop Login → Generate Blinks → Sync to Cloud
    → View on Dashboard → GDPR Export/Delete
```

See [E2E Verification Guide](docs/08-TESTING/E2E_VERIFICATION.md) for full checklist.

---

## Contributing

This project is an assignment submission. No contributions are accepted at this time.

---

## License

Proprietary - Assignment submission for Singapore startup evaluation.

---

## Contact

- **Developer:** Siddharth Rodrigues
- **Email:** dorddis@gmail.com
- **Portfolio:** https://dorddis.vercel.app
- **LinkedIn:** https://linkedin.com/in/dorddis
- **GitHub:** https://github.com/dorddis

---

## Acknowledgments

- **MediaPipe Team** - Computer vision foundation
- **Supabase Team** - Backend infrastructure
- **Electron Team** - Cross-platform desktop framework
- **Vercel Team** - Web deployment platform

---

**Last Updated:** December 23, 2025
**Status:** Production-ready MVP, all Tier 1 features complete
