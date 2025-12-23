# WellnessGuard - Revised Architecture (Desktop + Web)

**Goal:** Build once, run everywhere. Shared React components between Electron desktop and Next.js web.

---

## Architecture Insight from Wispr Flow

Wispr Flow (v1.4.138) uses:
- **Electron 38** + **React 18** + **TypeScript**
- **Zustand** for state management
- **Motion** (framer-motion) for animations
- **Supabase** for cloud backend
- **SQLite** (Sequelize) for local storage
- **Multiple windows:** hub, status, contextMenu, aiterminal

**Key pattern:** Minimal HTML shells, React renders everything, shared components across windows.

---

## Our Stack (Matching Wispr's Simplicity)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Desktop Framework | **Electron** | Same as Wispr, proven, good DX |
| Web Framework | **Next.js 14** | SSG for dashboard, shared React |
| UI Library | **React 18** | Shared between desktop + web |
| State | **Zustand** | Simple, works in both environments |
| Animations | **Motion** | Clean, performant |
| Forms | **React Hook Form + Zod** | Type-safe validation |
| Styling | **Tailwind CSS** | Utility-first, easy theming |
| Local DB | **SQLite** (better-sqlite3) | Sync-compatible, Wispr uses it |
| Cloud | **Supabase** | Auth + PostgreSQL + Realtime |
| CV | **MediaPipe** | On-device face mesh |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SHARED PACKAGES                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   @wellness/ui  │  │ @wellness/core  │  │ @wellness/api   │              │
│  │                 │  │                 │  │                 │              │
│  │  React Comps    │  │  Detection      │  │  Supabase       │              │
│  │  - AlertToast   │  │  - BlinkDetect  │  │  - Auth         │              │
│  │  - StatusBar    │  │  - Posture      │  │  - Sync         │              │
│  │  - Dashboard    │  │  - AlertEngine  │  │  - Queries      │              │
│  │  - Settings     │  │  - Baseline     │  │                 │              │
│  │  - Charts       │  │  - Session      │  │                 │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
└───────────┼─────────────────────┼─────────────────────┼──────────────────────┘
            │                     │                     │
            │     ┌───────────────┴───────────────┐     │
            │     │                               │     │
    ┌───────▼─────▼───────┐             ┌─────────▼─────▼─────────┐
    │  DESKTOP (Electron)  │             │     WEB (Next.js)       │
    │                      │             │                         │
    │  apps/desktop/       │             │  apps/web/              │
    │  ├── main/           │             │  ├── app/               │
    │  │   ├── index.ts    │             │  │   ├── page.tsx       │
    │  │   ├── camera.ts   │             │  │   ├── dashboard/     │
    │  │   └── ipc.ts      │             │  │   └── settings/      │
    │  │                   │             │  │                       │
    │  └── renderer/       │             │  └── (uses @wellness/ui) │
    │      ├── hub/        │             │                         │
    │      ├── status/     │             │  NO camera access       │
    │      └── overlay/    │             │  Dashboard only         │
    │                      │             │                         │
    │  HAS camera access   │             │                         │
    │  Local SQLite        │             │                         │
    │  System tray         │             │                         │
    └──────────┬───────────┘             └────────────┬────────────┘
               │                                      │
               │              HTTPS                   │
               └──────────────┬───────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │     SUPABASE      │
                    │                   │
                    │  - Auth           │
                    │  - PostgreSQL     │
                    │  - Realtime       │
                    │  - Edge Functions │
                    └───────────────────┘
```

---

## Monorepo Structure

```
wellness-guard/
├── package.json                    # Workspace root
├── turbo.json                      # Turborepo config
│
├── packages/
│   ├── ui/                         # @wellness/ui - Shared React components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── AlertToast.tsx
│   │   │   │   ├── StatusIndicator.tsx
│   │   │   │   ├── BlinkRateChart.tsx
│   │   │   │   ├── WellnessScore.tsx
│   │   │   │   ├── SettingsPanel.tsx
│   │   │   │   └── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useBlinkRate.ts
│   │   │   │   ├── useSession.ts
│   │   │   │   └── useAlerts.ts
│   │   │   └── stores/
│   │   │       ├── sessionStore.ts     # Zustand store
│   │   │       ├── alertStore.ts
│   │   │       └── settingsStore.ts
│   │   ├── tailwind.config.js
│   │   └── package.json
│   │
│   ├── core/                       # @wellness/core - Detection logic
│   │   ├── src/
│   │   │   ├── detection/
│   │   │   │   ├── blink.ts            # EAR algorithm
│   │   │   │   ├── posture.ts
│   │   │   │   └── mediapipe.ts        # MediaPipe wrapper
│   │   │   ├── alerts/
│   │   │   │   ├── engine.ts           # Alert rules
│   │   │   │   ├── cooldown.ts
│   │   │   │   └── flow-state.ts
│   │   │   ├── baseline/
│   │   │   │   └── calibration.ts
│   │   │   └── session/
│   │   │       └── manager.ts
│   │   └── package.json
│   │
│   └── api/                        # @wellness/api - Supabase client
│       ├── src/
│       │   ├── client.ts               # Supabase init
│       │   ├── auth.ts                 # Auth methods
│       │   ├── sync.ts                 # Data sync
│       │   └── queries.ts              # Database queries
│       └── package.json
│
├── apps/
│   ├── desktop/                    # Electron app
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── index.ts            # Electron main process
│   │   │   │   ├── windows.ts          # Window management
│   │   │   │   ├── camera.ts           # Camera capture
│   │   │   │   ├── tray.ts             # System tray
│   │   │   │   └── ipc.ts              # IPC handlers
│   │   │   ├── renderer/
│   │   │   │   ├── hub/                # Main window
│   │   │   │   │   ├── index.html
│   │   │   │   │   └── App.tsx
│   │   │   │   ├── status/             # Floating status bar
│   │   │   │   │   ├── index.html
│   │   │   │   │   └── App.tsx
│   │   │   │   └── overlay/            # Alert overlay
│   │   │   │       ├── index.html
│   │   │   │       └── App.tsx
│   │   │   └── preload/
│   │   │       └── index.ts            # Preload scripts
│   │   ├── electron-builder.json
│   │   └── package.json
│   │
│   └── web/                        # Next.js dashboard
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx            # Landing
│       │   │   ├── dashboard/
│       │   │   │   └── page.tsx        # Main dashboard
│       │   │   ├── settings/
│       │   │   │   └── page.tsx
│       │   │   └── api/
│       │   │       └── [...]/          # API routes if needed
│       │   └── components/             # Web-only components
│       ├── next.config.js
│       └── package.json
│
└── supabase/
    ├── migrations/                 # Database migrations
    │   └── 001_initial_schema.sql
    └── functions/                  # Edge functions
        └── sync/
            └── index.ts
```

---

## Desktop App Windows (Like Wispr)

### 1. Hub Window (Main)
Full settings, history, analytics. User opens from tray.

```
┌────────────────────────────────────────────────┐
│  WellnessGuard                        [_][□][X]│
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────────┐  ┌────────────────────────┐  │
│  │              │  │    TODAY'S WELLNESS    │  │
│  │   CAMERA     │  │                        │  │
│  │   PREVIEW    │  │         78/100         │  │
│  │              │  │                        │  │
│  │ Blinks: 14   │  │    ████████░░  Good    │  │
│  └──────────────┘  └────────────────────────┘  │
│                                                │
│  ┌────────────────────────────────────────────┐│
│  │  Blink Rate (Last Hour)                    ││
│  │  ╭────────────────────────────────────╮    ││
│  │  │  ●                    ●            │    ││
│  │  │     ●    ●      ●  ●     ●  ●     │    ││
│  │  │        ●     ●              ●      │    ││
│  │  ╰────────────────────────────────────╯    ││
│  └────────────────────────────────────────────┘│
│                                                │
│  [Settings]  [View History]  [Export Data]     │
└────────────────────────────────────────────────┘
```

### 2. Status Window (Floating)
Minimal, always visible, draggable. Like Wispr's status bar.

```
┌─────────────────────────────┐
│  ● 14 blinks/min  │  78/100 │
└─────────────────────────────┘
```

### 3. Alert Overlay
Non-intrusive notification that appears briefly.

```
                    ┌───────────────────────────────┐
                    │  ⚠ Low blink rate detected    │
                    │  Take a 20-second eye break   │
                    │                               │
                    │  [Dismiss]  [Snooze 10 min]   │
                    └───────────────────────────────┘
```

---

## Shared React Components (@wellness/ui)

### StatusIndicator.tsx
```tsx
interface StatusIndicatorProps {
  blinkRate: number;
  wellnessScore: number;
  isCompact?: boolean;  // For floating window
}

export function StatusIndicator({ blinkRate, wellnessScore, isCompact }: StatusIndicatorProps) {
  const status = wellnessScore >= 70 ? 'good' : wellnessScore >= 50 ? 'fair' : 'poor';

  if (isCompact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-white/90 rounded-full shadow-lg">
        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <span className="text-sm font-mono">{blinkRate}/min</span>
        <span className="text-xs text-gray-500">│</span>
        <span className="text-sm font-medium">{wellnessScore}/100</span>
      </div>
    );
  }

  return (
    // Full version for hub window
    <div className="p-4 bg-white rounded-lg shadow">
      {/* ... */}
    </div>
  );
}
```

### AlertToast.tsx
```tsx
interface AlertToastProps {
  type: 'info' | 'warning' | 'critical';
  message: string;
  action?: string;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
}

export function AlertToast({ type, message, action, onDismiss, onSnooze }: AlertToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`p-4 rounded-lg shadow-lg ${alertStyles[type]}`}
    >
      <p className="font-medium">{message}</p>
      {action && <p className="text-sm mt-1">{action}</p>}
      <div className="flex gap-2 mt-3">
        <button onClick={onDismiss} className="btn-secondary">Dismiss</button>
        <button onClick={() => onSnooze(10)} className="btn-primary">Snooze 10 min</button>
      </div>
    </motion.div>
  );
}
```

---

## Zustand Stores (Shared State)

### sessionStore.ts
```typescript
import { create } from 'zustand';

interface SessionState {
  sessionId: string | null;
  startedAt: Date | null;
  blinkCount: number;
  currentBlinkRate: number;
  wellnessScore: number;

  // Actions
  startSession: () => void;
  recordBlink: () => void;
  updateBlinkRate: (rate: number) => void;
  endSession: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionId: null,
  startedAt: null,
  blinkCount: 0,
  currentBlinkRate: 0,
  wellnessScore: 100,

  startSession: () => set({
    sessionId: crypto.randomUUID(),
    startedAt: new Date(),
    blinkCount: 0,
  }),

  recordBlink: () => set(state => ({
    blinkCount: state.blinkCount + 1,
  })),

  updateBlinkRate: (rate) => set({ currentBlinkRate: rate }),

  endSession: () => set({
    sessionId: null,
    startedAt: null,
  }),
}));
```

---

## Desktop-Only: Camera & Detection

Camera access only works in Electron (not web). Detection runs in main process.

### camera.ts (Electron Main)
```typescript
import { BrowserWindow, ipcMain } from 'electron';

class CameraManager {
  private videoCapture: any; // node-opencv or similar
  private mediapipe: any;

  async start() {
    // Initialize camera in main process
    // Send frames to renderer via IPC for preview
    // Run MediaPipe detection
    // Emit blink events
  }

  onBlink(callback: () => void) {
    // Called when blink detected
  }
}
```

### IPC Bridge
```typescript
// Main process
ipcMain.handle('detection:start', async () => {
  await cameraManager.start();
});

ipcMain.on('detection:blink', () => {
  // Forward to renderer
  mainWindow.webContents.send('blink-detected');
});

// Renderer (preload)
contextBridge.exposeInMainWorld('wellness', {
  startDetection: () => ipcRenderer.invoke('detection:start'),
  onBlink: (callback: () => void) => {
    ipcRenderer.on('blink-detected', callback);
  },
});
```

---

## Web Dashboard (Next.js)

No camera access. Displays synced data from Supabase.

### Dashboard Page
```tsx
// apps/web/src/app/dashboard/page.tsx
import { BlinkRateChart, WellnessScore, SessionHistory } from '@wellness/ui';
import { getRecentSessions, getDailyRollups } from '@wellness/api';

export default async function DashboardPage() {
  const sessions = await getRecentSessions();
  const dailyData = await getDailyRollups(30); // Last 30 days

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Your Wellness Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <WellnessScore score={dailyData.averageScore} trend={dailyData.trend} />
        <BlinkRateChart data={dailyData.blinkRates} />
        <SessionHistory sessions={sessions} />
      </div>
    </div>
  );
}
```

---

## Data Flow

### Desktop (Electron)
```
Camera (30 FPS)
    │
    ▼
MediaPipe (main process)
    │
    ▼
Blink Event → IPC → Renderer → Zustand Store
    │
    ▼
SQLite (local) ← Aggregator (every 60s)
    │
    ▼
Sync Worker (every 5 min) → Supabase
```

### Web (Next.js)
```
User Login → Supabase Auth
    │
    ▼
Dashboard → Server Component → Supabase Query
    │
    ▼
Render Charts from Rollup Data
```

---

## Database Schema (Same as Before)

### Local SQLite (Desktop)
```sql
CREATE TABLE blink_events (
    id INTEGER PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    ear_value REAL NOT NULL,
    is_blink BOOLEAN NOT NULL
);

CREATE TABLE minute_rollups (
    id INTEGER PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    blink_count INTEGER NOT NULL,
    avg_ear REAL,
    posture_score INTEGER,
    synced BOOLEAN DEFAULT FALSE
);

CREATE TABLE user_baseline (
    id INTEGER PRIMARY KEY,
    blink_p25 REAL,
    blink_p50 REAL,
    blink_p75 REAL,
    calibrated_at DATETIME,
    samples_count INTEGER
);
```

### Supabase PostgreSQL (Cloud)
```sql
-- Same as FINAL_ARCHITECTURE.md
CREATE TABLE wellness_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    timestamp TIMESTAMPTZ NOT NULL,
    blink_count INTEGER NOT NULL,
    avg_ear REAL,
    posture_score INTEGER,
    session_id UUID
);

CREATE INDEX idx_wellness_user_time ON wellness_data(user_id, timestamp DESC);

-- RLS policies
ALTER TABLE wellness_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own data" ON wellness_data
    FOR ALL USING (auth.uid() = user_id);
```

---

## Design System (Like Wispr - Clean & Simple)

### Color Palette
```css
:root {
  /* Wispr uses clean whites/grays with accent colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;

  /* Status colors */
  --status-good: #22c55e;
  --status-fair: #f59e0b;
  --status-poor: #ef4444;

  /* Accent */
  --accent: #3b82f6;
}
```

### Typography
```css
/* Clean, system fonts like Wispr */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Key Design Principles (from Wispr)
1. **Minimal chrome** - No unnecessary borders or shadows
2. **High contrast** - Black text on white, colored indicators
3. **Compact when needed** - Status window is tiny but informative
4. **Smooth animations** - Motion for state changes
5. **Non-intrusive alerts** - Slide in, easy to dismiss

---

## Implementation Timeline

### Week 1: Monorepo + Shared Packages
- [ ] Set up Turborepo monorepo structure
- [ ] Create @wellness/ui with base components
- [ ] Create @wellness/core with detection logic
- [ ] Create @wellness/api with Supabase client
- [ ] Tailwind + shared config

### Week 2: Desktop App (Electron)
- [ ] Electron setup with Vite
- [ ] Hub window with camera preview
- [ ] Status floating window
- [ ] Alert overlay
- [ ] System tray integration
- [ ] SQLite local storage
- [ ] MediaPipe integration

### Week 3: Web Dashboard + Sync
- [ ] Next.js app with Supabase auth
- [ ] Dashboard page using @wellness/ui
- [ ] Settings page
- [ ] Sync worker in desktop app
- [ ] Supabase schema + migrations

### Week 4: Polish + Packaging
- [ ] Baseline calibration
- [ ] Alert cooldowns + flow detection
- [ ] Electron packaging (Windows + Mac)
- [ ] Vercel deployment for web
- [ ] Testing + bug fixes

---

## Why This Architecture?

**Shared code benefits:**
- Write components once, use in both desktop and web
- Consistent UI/UX across platforms
- Faster development, less duplication

**Electron benefits:**
- Camera access for blink detection
- System tray for background operation
- Native feel on desktop

**Next.js benefits:**
- Fast, SEO-friendly dashboard
- SSG for static pages
- Easy Vercel deployment

**Wispr-inspired benefits:**
- Proven tech stack (they're funded, it works)
- Clean, minimal UI that users love
- Multiple small windows vs one monolith

---

## Cost Comparison

| Users | Desktop Only | Desktop + Web |
|-------|--------------|---------------|
| 0-250 | $0 (free tier) | $0 |
| 1K | $25 (Supabase Pro) | $25 |
| 10K | $27 | $27 |

Web dashboard adds no extra cost - it's static hosting on Vercel free tier.

---

## Sources

- [How to Decompile Electron Apps](https://medium.com/how-to-electron/how-to-get-source-code-of-any-electron-application-cbb5c7726c37)
- [Electron ASAR Archives](https://www.electronjs.org/docs/latest/tutorial/asar-archives)
- [Wispr Flow Tech Stack Analysis](https://kielbasa.dev/blog/building-wisprflow-like-app-twice)
- [Decompiling and Repacking Electron Apps](https://medium.com/@libaration/decompiling-and-repacking-electron-apps-b9bfbc8390d5)
