# Architecture Overview - Lumina

**Status:** ✅ Production Implementation
**Last Updated:** December 23, 2025
**Tech Stack:** Electron 33 + Next.js 15 + MediaPipe + Supabase

---

## Executive Summary

Lumina is a **B2B AI wellness platform** built as a monorepo with:
- **Desktop app** (Electron 33) for real-time blink/posture detection
- **Web dashboard** (Next.js 15) for admin analytics and user insights
- **Shared packages** (@lumina/core, @lumina/ui, @lumina/api) for code reuse
- **Offline-first architecture** with SQLite → Supabase sync
- **99.8% data reduction** via minute-level aggregation

**Key Decision:** Chose Electron + TypeScript over PyQt6 for:
- Cross-platform UI consistency (React everywhere)
- Shared code between desktop and web (24 components, 7 stores)
- Modern DX (TypeScript, hot reload, Chrome DevTools)
- Meeting mode support (Electron desktopCapturer API)

---

## System Architecture

```
                            YOUR COMPUTER (DESKTOP APP)
    ┌──────────────────────────────────────────────────────────────┐
    │                                                              │
    │  ┌──────────────┐         ┌────────────────────────┐        │
    │  │   CAMERA     │  30 FPS │   MediaPipe            │        │
    │  │ (or Meeting  │────────>│   FaceLandmarker       │        │
    │  │  Screen Cap) │         │   (478 landmarks)      │        │
    │  └──────────────┘         └───────────┬────────────┘        │
    │                                       │                     │
    │                          ┌────────────▼────────────┐        │
    │                          │  @lumina/core           │        │
    │                          │  - Blink (EAR)          │        │
    │                          │  - Posture, Yawn        │        │
    │                          │  - Drowsiness (PERCLOS) │        │
    │                          │  - Alert Engine         │        │
    │                          └────────────┬────────────┘        │
    │                                       │                     │
    │  ┌────────────────┐      ┌───────────▼──────────┐          │
    │  │  @lumina/ui    │<─────│   SQLite (WAL)       │          │
    │  │  - 24 Comps    │      │   - 9 tables         │          │
    │  │  - 7 Stores    │      │   - Minute rollups   │          │
    │  │  - Zustand     │      │   - Demo data        │          │
    │  └────────┬───────┘      └───────────┬──────────┘          │
    │           │                          │                     │
    │           │                          │ Sync every 5 min    │
    │           v                          v                     │
    │    [React UI with Achievements, Streaks, Onboarding]       │
    └──────────────────────────────────────┬──────────────────────┘
                                          │
                                     HTTPS (batch)
                                          │
                                          v
                            ┌──────────────────────────┐
                            │      SUPABASE            │
                            │  - Auth (Magic Link +    │
                            │    Google OAuth)         │
                            │  - PostgreSQL (10 tables)│
                            │  - RLS Policies          │
                            │  - Realtime              │
                            └────────────┬─────────────┘
                                         │
                                         v
                            ┌──────────────────────────┐
                            │   NEXT.JS 15 DASHBOARD   │
                            │   - Admin Analytics      │
                            │   - User Insights        │
                            │   - GDPR Compliance      │
                            │   - Role-Based Access    │
                            └──────────────────────────┘
```

---

## Tech Stack (Verified Implementation)

| Component | Technology | Version | Why Chosen |
|-----------|------------|---------|------------|
| **Desktop Framework** | Electron | 33.2.0 | Cross-platform, native APIs, Chrome DevTools |
| **Web Framework** | Next.js | 15.1.0 | App Router, SSR, shared React with desktop |
| **UI Library** | React | 18.3.1 | Component reuse across desktop + web |
| **State Management** | Zustand | 5.0.0 | Simple, localStorage persistence |
| **Styling** | Tailwind CSS | Latest | Utility-first, easy theming |
| **Computer Vision** | MediaPipe FaceLandmarker | 0.10.21 | 478 landmarks, 30 FPS, works with glasses |
| **Local Database** | better-sqlite3 | Latest | WAL mode, offline-first |
| **Cloud Backend** | Supabase | Latest | Auth + PostgreSQL + RLS + Realtime |
| **Charts** | Recharts | 2.15.0 | Simple, React-based |
| **Forms** | React Hook Form + Zod | Latest | Type-safe validation |
| **Animations** | Motion (Framer Motion) | Latest | Smooth UI transitions |
| **Monorepo** | Turborepo + pnpm | Latest | Fast builds, shared dependencies |
| **Packaging** | electron-builder | Latest | Windows (NSIS) + macOS (DMG with notarization) |

---

## Architecture Decisions

### 1. Why Electron + TypeScript over PyQt6?

| Factor | Electron + TS | PyQt6 + Python | Winner |
|--------|---------------|----------------|--------|
| **Code Reuse** | 100% (React everywhere) | 0% (Qt desktop, React web) | Electron |
| **DX (Developer Experience)** | Hot reload, Chrome DevTools | Slower iteration, limited debugging | Electron |
| **Meeting Mode Support** | Native `desktopCapturer` API | Requires platform-specific screen capture | Electron |
| **Memory Usage** | ~200 MB | ~100 MB | PyQt6 |
| **Package Size** | 200+ MB | 50-100 MB | PyQt6 |
| **Cross-Platform UI** | Perfect consistency | Qt widgets look different per OS | Electron |
| **Shared Components** | 24 components, 7 stores | None | Electron |
| **TypeScript Support** | Native | Via type stubs | Electron |

**Decision:** Electron wins on **code reuse**, **DX**, and **meeting mode** (critical for B2B).
PyQt6 wins on **memory** and **size**, but not enough to offset Electron's advantages.

**See:** [archive/superseded-architecture/ARCHITECTURE_PROPOSAL.md](../../archive/superseded-architecture/ARCHITECTURE_PROPOSAL.md) for PyQt6 approach

---

### 2. Why Supabase TimescaleDB over Event-Driven (Redis Streams)?

| Factor | TimescaleDB | Event-Driven (Redis) | Winner |
|--------|-------------|----------------------|--------|
| **Development Speed** | 4 weeks to MVP | 6-8 weeks | TimescaleDB |
| **Operational Complexity** | Single managed service | Redis + workers + Supabase | TimescaleDB |
| **Cost (10K users)** | $488/month | $140/month (71% cheaper) | Event-Driven |
| **Query Performance** | 20ms (instant) | 15ms (15s stale) | TimescaleDB |
| **Scalability** | 100K+ users proven | Linear scaling | Tie |
| **Future Extensibility** | Good for analytics | Better for ML, multi-region | Event-Driven |
| **Team Learning Curve** | SQL (universal) | Event sourcing (niche) | TimescaleDB |

**Decision:** TimescaleDB for **MVP speed** and **simplicity**.
Plan migration to event-driven at 10K+ users when **$348/month savings** justify complexity.

**See:** [ARCHITECTURE_DECISION.md](ARCHITECTURE_DECISION.md) for full decision matrix

---

### 3. Why Offline-First with SQLite?

**Problem:** Enterprise users work on trains, planes, cafes with spotty WiFi.

**Solution:**
- **100% local processing** → No network required for blink detection
- **SQLite with WAL mode** → Concurrent reads during sync
- **5-minute batch sync** → Balances freshness with bandwidth
- **Offline queue** → Retry failed syncs on reconnect

**Data Flow:**
```
Camera (30 FPS) → MediaPipe → EAR Calculation → Blink Event
                                                      ↓
                                          SQLite (blink_events)
                                                      ↓
                                    Every 60s: Aggregate → minute_rollups
                                                      ↓
                                    Every 5min: Batch → Supabase (wellness_data)
```

**99.8% Data Reduction:**
- Raw: 30 FPS × 60s × 60min × 8hr = 2,592,000 frames/day
- Stored: 1 rollup/min × 60min × 8hr = 480 records/day
- Reduction: 2.6M → 480 = **99.98%**

---

## Monorepo Structure

```
lumina/
├── packages/
│   ├── ui/                    # @lumina/ui
│   │   ├── src/
│   │   │   ├── components/    # 24 React components
│   │   │   │   ├── StatusIndicator.tsx
│   │   │   │   ├── AlertToast.tsx
│   │   │   │   ├── BlinkRateChart.tsx
│   │   │   │   ├── AchievementBadge.tsx
│   │   │   │   └── onboarding/   # 7 onboarding components
│   │   │   └── stores/        # 7 Zustand stores
│   │   │       ├── sessionStore.ts
│   │   │       ├── alertStore.ts
│   │   │       ├── settingsStore.ts
│   │   │       ├── streakStore.ts
│   │   │       ├── achievementStore.ts
│   │   │       └── meetingModeStore.ts
│   │   └── package.json
│   │
│   ├── core/                  # @lumina/core
│   │   ├── src/
│   │   │   ├── detection/     # CV algorithms
│   │   │   │   ├── blink.ts            # EAR algorithm
│   │   │   │   ├── posture.ts          # Distance, tilt, lean
│   │   │   │   ├── yawn.ts             # MAR algorithm
│   │   │   │   ├── drowsiness.ts       # PERCLOS
│   │   │   │   └── robust-blink-detector.ts
│   │   │   ├── alert/
│   │   │   │   └── engine.ts           # Alert rules + cooldowns
│   │   │   ├── session/
│   │   │   │   └── manager.ts          # Lifecycle + rollups
│   │   │   └── baseline/
│   │   │       └── calibration.ts      # Auto-calibration (2hr)
│   │   └── package.json
│   │
│   └── api/                   # @lumina/api
│       ├── src/
│       │   ├── auth.ts        # Supabase auth helpers
│       │   ├── sync.ts        # Batch sync logic
│       │   ├── queries.ts     # 107 exported functions
│       │   └── client.ts      # Singleton client
│       └── package.json
│
├── apps/
│   ├── desktop/               # Electron app
│   │   ├── src/
│   │   │   ├── main/          # Electron main process
│   │   │   │   ├── index.ts         # Entry point
│   │   │   │   ├── database.ts      # SQLite operations (9 tables)
│   │   │   │   ├── sync.ts          # 5-min sync worker
│   │   │   │   ├── tray.ts          # System tray icon
│   │   │   │   ├── meetingMode.ts   # PowerShell detection
│   │   │   │   └── ipc.ts           # IPC handlers
│   │   │   └── renderer/      # React app
│   │   │       └── hub/
│   │   │           ├── App.tsx      # Main UI (detection loop at 30 FPS)
│   │   │           └── hooks/
│   │   │               └── useMeetingModeCapture.ts
│   │   ├── electron.vite.config.ts
│   │   └── package.json
│   │
│   └── web/                   # Next.js dashboard
│       ├── src/
│       │   ├── app/
│       │   │   ├── (dashboard)/
│       │   │   │   ├── admin/       # Admin analytics
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   ├── analytics/
│       │   │   │   │   ├── employees/
│       │   │   │   │   └── settings/
│       │   │   │   └── dashboard/   # User insights
│       │   │   │       ├── page.tsx
│       │   │   │       ├── my-wellness/
│       │   │   │       └── settings/  # GDPR features
│       │   │   ├── login/
│       │   │   ├── onboarding/
│       │   │   ├── privacy/
│       │   │   └── middleware.ts    # Route protection
│       │   ├── components/
│       │   │   └── charts/          # Recharts wrappers
│       │   └── lib/
│       │       └── supabase/
│       ├── next.config.ts
│       └── package.json
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql   # Organizations, wellness_data, RLS
│       └── 002_new_features.sql     # Breaks, exercises, challenges
│
├── turbo.json                 # Turborepo config
├── pnpm-workspace.yaml        # Workspace definition
└── package.json               # Root package
```

---

## Key Implementation Details

### 1. Desktop Detection Loop (30 FPS)

**File:** `apps/desktop/src/renderer/hub/App.tsx` (lines 757-916)

```typescript
// Detection runs at 30 FPS for both webcam and meeting mode
setInterval(() => {
  // Use meeting video when in meeting mode
  const video = meetingModeActive ? meetingVideoRef.current : videoRef.current;

  // For meeting mode: crop to calibrated region
  if (meetingModeActive && meetingCanvasRef.current) {
    const calibration = getCalibration(detectedApp);
    canvas.drawImage(
      video,
      calibration.region.x,      // Crop self-view region
      calibration.region.y,
      calibration.region.width,
      calibration.region.height,
      0, 0, width, height
    );
    frameSource = canvas;
  }

  // Process with MediaPipe (same for camera and screen capture)
  const result = landmarkerManager.processVideoFrame(frameSource);

  // EAR calculation and blink detection
  const { ear, isBlink } = blinkDetector.processFrame(result.faceLandmarks);

  // Update UI and stores
  updateBlinkCount(isBlink);
}, 33); // ~30fps
```

---

### 2. Meeting Mode Architecture

**Problem:** 30-50% of workday in Zoom/Teams/Meet → camera owned by meeting app

**Solution:** Screen capture the self-view preview

**Implementation:**
1. **Detection** (PowerShell): Detect Zoom, Teams, Meet, Webex, Slack processes
2. **Calibration UI**: User drag-selects self-view region (one-time per app)
3. **Screen Capture**: Electron `desktopCapturer` captures entire screen at 30 FPS
4. **Frame Cropping**: Canvas `drawImage()` with calibrated region coordinates
5. **MediaPipe Processing**: Same pipeline as webcam (no code changes)

**State Management:** `meetingModeStore.ts` persists calibrations to localStorage

**See:** [../05-FEATURES/MEETING_MODE.md](../05-FEATURES/MEETING_MODE.md) for full implementation

---

### 3. Sync Strategy

**File:** `apps/desktop/src/main/sync.ts`

```typescript
class SyncService {
  async syncPending() {
    // Fetch unsynchronized rollups (synced=0)
    const rollups = await database.getUnsyncedRollups(500);

    // Convert format: Unix ms → ISO 8601, add org_id/user_id
    const batch = rollups.map(r => ({
      user_id: this.userId,
      org_id: this.orgId,
      timestamp: new Date(r.timestamp).toISOString(),
      blink_count: r.blink_count,
      avg_ear: r.avg_ear,
      // ... other fields
    }));

    // Batch insert to Supabase
    await supabase.from('wellness_data').insert(batch);

    // Mark as synced
    await database.markRollupsSynced(rollups.map(r => r.id));
  }
}

// Auto-sync every 5 minutes
setInterval(() => syncService.syncPending(), 5 * 60 * 1000);
```

**Retry Logic:** Failed records stay `synced=0`, retry on next cycle

---

### 4. GDPR Implementation

**Data Export** (`apps/web/src/app/(dashboard)/dashboard/settings/page.tsx`):
```typescript
async function handleExport(format: 'json' | 'csv') {
  const data = await exportUserData(user.id);

  if (format === 'json') {
    downloadJSON(data, `lumina-export-${timestamp}.json`);
  } else {
    // CSV: Multiple files for different data types
    downloadCSV(data.wellness_data, 'wellness-data.csv');
    downloadCSV(data.break_events, 'break-events.csv');
    downloadCSV(data.alerts, 'alerts.csv');
  }
}
```

**Account Deletion:**
```typescript
async function handleDelete() {
  // 30-day grace period before permanent deletion
  await requestAccountDeletion(user.id);

  // Cascade: wellness_data, alerts, sessions, achievements, streaks
  // RLS filters deleted_at IS NULL in all queries
}
```

---

## Database Schema

### SQLite (Desktop - 9 Tables)

| Table | Purpose | Retention |
|-------|---------|-----------|
| blink_events | Raw frame data (30 FPS) | 24 hours |
| minute_rollups | Aggregated metrics (SYNC SOURCE) | Indefinite (synced flag) |
| user_baseline | Blink calibration (P25/P50/P75) | Persistent |
| wellness_events | Posture/yawn/drowsiness | 7 days |
| daily_progress | Breaks, blink minutes, posture minutes | Indefinite |
| user_streaks | Gamification (4 types) | Persistent |
| user_achievements | Badge system (9 achievements) | Persistent |
| user_settings | Configuration (theme, onboarding, etc.) | Persistent |
| exercise_sessions | Eye exercise history | Indefinite |

### Supabase (Cloud - 10+ Tables)

| Table | Purpose | Features |
|-------|---------|----------|
| organizations | Multi-tenant isolation | RLS per org |
| org_members | RBAC (admin/manager/employee) | Role-based RLS |
| wellness_data | Time-series minute rollups | 3 composite indexes |
| org_alerts | Admin visibility into user alerts | Manager/admin RLS |
| break_events | Break tracking | User RLS |
| exercise_sessions | Eye exercises | User RLS |
| team_challenges | Gamification (team competitions) | Org RLS |
| integrations | 3rd-party integrations (Slack, etc.) | Org admin RLS |
| data_access_requests | GDPR compliance tracking | User RLS |
| user_consents | Privacy consent logs | User RLS |

**RLS Policies:** Users only see their own data, admins/managers see org-wide data

---

## Critical Features Status

| Feature | Status | File Location |
|---------|--------|---------------|
| **Blink Detection (EAR)** | ✅ Complete | `packages/core/src/detection/blink.ts` |
| **Posture Detection** | ✅ Complete | `packages/core/src/detection/posture.ts` |
| **Yawn Detection** | ✅ Complete | `packages/core/src/detection/yawn.ts` |
| **Drowsiness (PERCLOS)** | ✅ Complete | `packages/core/src/detection/drowsiness.ts` |
| **Meeting Mode** | ✅ Complete | `apps/desktop/src/main/meetingMode.ts` |
| **Onboarding (6-step)** | ✅ Complete | `packages/ui/src/components/onboarding/` |
| **Achievements (9 total)** | ✅ Complete | `packages/ui/src/stores/achievementStore.ts` |
| **Streaks (4 types)** | ✅ Complete | `packages/ui/src/stores/streakStore.ts` |
| **Baseline Calibration** | ✅ Complete | `packages/core/src/baseline/calibration.ts` |
| **GDPR Compliance** | ✅ Complete | `apps/web/src/app/(dashboard)/dashboard/settings/` |
| **Admin Dashboard** | ✅ Complete | `apps/web/src/app/(dashboard)/admin/` |
| **User Dashboard** | ✅ Complete | `apps/web/src/app/(dashboard)/dashboard/` |
| **5-Minute Sync** | ✅ Complete | `apps/desktop/src/main/sync.ts` |
| **SQLite Offline Queue** | ✅ Complete | `apps/desktop/src/main/database.ts` |
| **Supabase Auth** | ✅ Complete | `packages/api/src/auth.ts` |

**See:** [CURRENT_IMPLEMENTATION_STATUS.md](../CURRENT_IMPLEMENTATION_STATUS.md) for full audit

---

## Performance Targets & Actuals

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Blink Detection Latency | <100ms | ~33ms (30 FPS) | ✅ |
| FPS (Webcam + Meeting Mode) | >25 | 30 FPS | ✅ |
| Memory Usage | <200 MB | ~150-200 MB | ✅ |
| CPU Usage | <40% | ~25-35% | ✅ |
| Sync Time (500 records) | <5s | ~2-3s | ✅ |
| Dashboard Load | <1s | <500ms | ✅ |
| Data Export (1000 records) | <10s | <5s | ✅ |

---

## Deployment

### Desktop Packaging

**electron-builder configuration:**
```json
{
  "win": {
    "target": "nsis",
    "icon": "build/icon.ico"
  },
  "mac": {
    "target": "dmg",
    "category": "public.app-category.healthcare-fitness",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist"
  }
}
```

**macOS Signing:** Configured for notarization (Apple ID + app-specific password)

### Web Deployment

**Vercel configuration:** `next.config.ts` exports static site with App Router

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Cost Projections (Verified)

| Users | Supabase Storage | Monthly Cost | Per-User |
|-------|------------------|--------------|----------|
| 0-250 | 500 MB | $0 (free tier) | $0 |
| 1K | 2 GB | $25 (Pro tier) | $0.025 |
| 10K | 20 GB | $27 (Pro + overage) | $0.003 |
| 100K | 200 GB | $60 (self-host DigitalOcean) | $0.0006 |

**Why so cheap?**
- 99.8% data reduction via minute rollups
- Static web dashboard (free Vercel hosting)
- Supabase auto-generates API (no custom backend)

---

## Related Documentation

### Core Architecture
- [ARCHITECTURE_DECISION.md](ARCHITECTURE_DECISION.md) - TimescaleDB vs Event-Driven decision matrix
- [DATA_FLOW.md](DATA_FLOW.md) - Visual data flow diagrams
- [OFFLINE_FIRST_DESIGN.md](OFFLINE_FIRST_DESIGN.md) - Sync strategy deep-dive
- [SCALING_STRATEGY.md](SCALING_STRATEGY.md) - 10K → 100K users plan

### Superseded Approaches
- [../../archive/superseded-architecture/ARCHITECTURE_PROPOSAL.md](../../archive/superseded-architecture/ARCHITECTURE_PROPOSAL.md) - PyQt6 approach (not implemented)
- [../../archive/superseded-architecture/REVISED_ARCHITECTURE.md](../../archive/superseded-architecture/REVISED_ARCHITECTURE.md) - Early Electron approach (evolved into lumina/)
- [ALTERNATIVES_ARCHIVE/EVENT_DRIVEN_ARCHITECTURE.md](ALTERNATIVES_ARCHIVE/EVENT_DRIVEN_ARCHITECTURE.md) - Redis Streams approach (deferred)

### Implementation Guides
- [../04-IMPLEMENTATION/GETTING_STARTED.md](../04-IMPLEMENTATION/GETTING_STARTED.md) - Setup instructions
- [../04-IMPLEMENTATION/CODEBASE_TOUR.md](../04-IMPLEMENTATION/CODEBASE_TOUR.md) - File structure walkthrough
- [../04-IMPLEMENTATION/DEPLOYMENT.md](../04-IMPLEMENTATION/DEPLOYMENT.md) - Build & release guide

### Features
- [../05-FEATURES/MEETING_MODE.md](../05-FEATURES/MEETING_MODE.md) - Screen capture implementation
- [../05-FEATURES/BLINK_DETECTION.md](../05-FEATURES/BLINK_DETECTION.md) - EAR algorithm details
- [../05-FEATURES/POSTURE_YAWN_DETECTION.md](../05-FEATURES/POSTURE_YAWN_DETECTION.md) - MAR + PERCLOS algorithms

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 18, 2024 | PyQt6 proposal (NOT implemented) |
| 2.0 | Dec 19, 2024 | Electron + Next.js pivot |
| 3.0 | Dec 23, 2025 | Production architecture audit (THIS DOCUMENT) |

---

**Status Legend:**
- ✅ Complete - Shipped in production
- 🟡 Partial - Core exists, UI/integration incomplete
- 🔵 Planned - Documented, not yet implemented
- ❌ Excluded - Explicitly rejected (e.g., PyQt6, Event-Driven for MVP)
