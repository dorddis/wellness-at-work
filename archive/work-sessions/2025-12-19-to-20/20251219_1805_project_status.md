# Lumina Project Status - December 19, 2025

## What's Working

### Desktop App (Electron)
- **Real-time blink detection** using MediaPipe FaceLandmarker
- **Camera feed** with face detection indicator
- **Blink counter** with live count display
- **Blink rate** calculated in real-time (updates every 5 seconds)
- **Wellness score** based on blink rate (15-20/min = healthy)
- **System tray** integration ready

**To run:**
```bash
cd lumina/apps/desktop
npm run electron:dev
```

### Admin Dashboard (Next.js)
- **Complete UI** with sidebar navigation
- **Team Overview** page with stats cards, department breakdown, alerts
- **Employees** page with list view
- **Alerts** page
- **Settings** page
- Currently shows mock data (infrastructure for real data ready)

**To run:**
```bash
cd lumina/apps/web
npm run dev
# Visit http://localhost:3001
```

### Database (Supabase)
- **Schema deployed**: organizations, org_members, wellness_data, org_alerts
- **RLS policies** configured with SECURITY DEFINER functions
- **Sync infrastructure** ready (SyncQueue, batch upload)
- **Query functions** for employee and admin data

## Architecture

```
lumina/
├── apps/
│   ├── desktop/          # Electron app with Vite + React
│   │   ├── src/main/     # Electron main process
│   │   ├── src/preload/  # Bridge between main and renderer
│   │   └── src/renderer/ # React UI (hub, status, overlay windows)
│   └── web/              # Next.js admin dashboard
├── packages/
│   ├── core/             # Shared detection logic (MediaPipe, BlinkDetector)
│   ├── ui/               # Shared React components
│   └── api/              # Supabase client, queries, sync
└── package.json          # Turborepo config
```

## Key Technical Decisions

1. **MediaPipe FaceLandmarker** over Face Mesh - newer API, better performance
2. **EAR Algorithm** for blink detection (threshold: 0.21)
3. **CSP configured** for WebAssembly (wasm-unsafe-eval)
4. **Zustand** for state management (lightweight, works in Electron)
5. **Turborepo** for monorepo (shared packages between desktop and web)

## Blink Detection Algorithm

```typescript
// Eye Aspect Ratio (EAR) calculation
EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)

// Landmarks used
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]

// Detection threshold
EAR_THRESHOLD = 0.21  // Below = eyes closed
CONSEC_FRAMES = 2     // Frames to confirm blink
```

## Wellness Score Logic

| Blink Rate | Score | Status |
|------------|-------|--------|
| < 5/min | 30 | Poor (eye strain risk) |
| 5-10/min | 50 | Fair |
| 10-15/min | 70 | Good |
| 15-20/min | 90 | Great |
| > 20/min | 100 | Excellent |

## What's Left for Production

1. **Auth flow** - Connect Supabase auth to dashboard
2. **Real data sync** - Desktop -> Supabase pipeline
3. **Dashboard queries** - Replace mock data with real queries
4. **Alerts system** - Low blink rate notifications
5. **Packaging** - electron-builder for distribution
6. **Testing** - Unit tests, E2E tests

## Commands

```bash
# Development
pnpm dev              # Run all apps
pnpm dev:desktop      # Electron only
pnpm dev:web          # Dashboard only

# Build
pnpm build
pnpm build:desktop    # Package Electron app

# Type check
pnpm typecheck
```

## Files Modified Today

- `apps/desktop/src/renderer/hub/index.html` - CSP for WebAssembly
- `apps/desktop/src/renderer/hub/App.tsx` - Real-time blink rate calculation
- `apps/desktop/src/main/windows.ts` - CSP headers for MediaPipe
