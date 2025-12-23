# Development Workflow

**Status:** Active | Last Updated: Dec 23, 2025

---

## Daily Development Routine

### 1. Pull Latest Changes

```bash
cd lumina
git pull origin master
pnpm install  # Update dependencies if package.json changed
```

### 2. Start Development Servers

**Option A: Desktop only**
```bash
pnpm dev:desktop
```

**Option B: Both desktop + web**
```bash
# Terminal 1
pnpm dev:desktop

# Terminal 2
pnpm dev:web
```

**Option C: All workspaces (using Turbo)**
```bash
pnpm dev  # Runs dev script in all packages
```

### 3. Make Changes

- Edit files in `apps/` or `packages/`
- Hot reload active (Vite for desktop, Next.js for web)
- TypeScript errors shown in real-time

### 4. Test Changes

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Manual testing in running app
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat: add feature description"
git push origin feature-branch
```

---

## Git Workflow

### Branch Strategy

**Main branches:**
- `master` - Production-ready code
- `develop` - Integration branch (if using Gitflow)

**Feature branches:**
```bash
# Create feature branch
git checkout -b feature/meeting-mode-calibration

# Work on feature
# ...

# Push to remote
git push origin feature/meeting-mode-calibration

# Create PR on GitHub
```

**Naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation only
- `refactor/` - Code refactoring
- `test/` - Test additions

### Commit Message Format

**Follow Conventional Commits:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting (no code change)
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `chore:` - Build/tooling changes

**Examples:**
```bash
feat(desktop): add meeting mode calibration UI

- Add drag-to-select region overlay
- Save calibration to meetingModeStore
- Auto-start screen capture after calibration

Closes #42
```

```bash
fix(core): correct EAR threshold for glasses users

Increased threshold from 0.18 to 0.20 to reduce false positives
for users wearing glasses. Tested with 10 users.

Fixes #38
```

### Pull Request Process

1. **Create PR on GitHub**
   - Title: Same as commit message
   - Description: What, why, how
   - Link to issue: `Closes #123`

2. **Request review**
   - Tag reviewers
   - Assign yourself

3. **CI checks** (when set up)
   - TypeScript type check
   - ESLint
   - Tests (when implemented)

4. **Address feedback**
   - Make changes
   - Push to same branch (PR updates automatically)

5. **Merge**
   - Squash merge (clean history)
   - Delete branch after merge

---

## Code Style Guidelines

### TypeScript

**Prefer explicit types:**
```typescript
// ✅ Good
function calculateEAR(landmarks: NormalizedLandmark[], indices: number[]): number {
  // ...
}

// ❌ Avoid
function calculateEAR(landmarks, indices) {
  // ...
}
```

**Use interfaces for objects:**
```typescript
// ✅ Good
interface BlinkEvent {
  timestamp: number
  earLeft: number
  earRight: number
  earAvg: number
  isBlink: boolean
}

// ❌ Avoid
type BlinkEvent = {
  timestamp: number
  // ... (use type for unions, not objects)
}
```

**Avoid `any`:**
```typescript
// ✅ Good
const results: FaceLandmarkerResult = await faceLandmarker.detectForVideo(video, timestamp)

// ❌ Avoid
const results: any = await faceLandmarker.detectForVideo(video, timestamp)
```

### React

**Functional components:**
```typescript
// ✅ Good
export function StatusIndicator({ status }: { status: string }) {
  return <div>{status}</div>
}

// ❌ Avoid (no class components)
export class StatusIndicator extends React.Component {
  // ...
}
```

**Use hooks:**
```typescript
// ✅ Good
const [blinkCount, setBlinkCount] = useState(0)

useEffect(() => {
  // Side effect
}, [dependency])

// ❌ Avoid (lifecycle methods)
componentDidMount() {
  // ...
}
```

**Prefer named exports:**
```typescript
// ✅ Good
export function StatusIndicator() { }
export function WellnessScore() { }

// ❌ Avoid (default exports make refactoring harder)
export default StatusIndicator
```

### File Organization

**Co-locate related files:**
```
components/
├── StatusIndicator/
│   ├── StatusIndicator.tsx
│   ├── StatusIndicator.test.tsx
│   └── StatusIndicator.module.css
```

**Group by feature, not type:**
```
// ✅ Good
features/
├── blink-detection/
│   ├── BlinkDetector.ts
│   ├── EARCalculator.ts
│   └── types.ts

// ❌ Avoid
utils/
├── BlinkDetector.ts
├── EARCalculator.ts
types/
├── blink.ts
```

---

## Testing Workflow

### Manual Testing

**Before every commit:**
1. Run app locally (`pnpm dev:desktop`)
2. Test changed functionality
3. Check for console errors
4. Verify no TypeScript errors (`pnpm typecheck`)

**Test checklist:**
- ✅ Camera permission works
- ✅ Blink detection updates counter
- ✅ Meeting mode detects Zoom/Teams
- ✅ Settings persist (localStorage)
- ✅ Cloud sync works (if online)

### Automated Testing (Planned)

**Unit tests:**
```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

**E2E tests:**
```bash
# Desktop E2E
cd apps/desktop
pnpm test:e2e

# Web E2E
cd apps/web
pnpm test:e2e
```

---

## Debugging

### Desktop App (Electron)

**Open DevTools:**
- Main window: View → Toggle Developer Tools
- Or: `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (macOS)

**Debug main process:**
```bash
# Run with Node debugger
pnpm dev:desktop --inspect

# Open chrome://inspect in Chrome
# Click "inspect" under Remote Target
```

**Logs:**
- Main process: `apps/desktop/logs/main.log`
- Renderer: DevTools console

**Common breakpoints:**
```typescript
// In renderer (DevTools)
debugger;

// In main process (Node debugger)
debugger;
```

### Web Dashboard (Next.js)

**Open DevTools:**
- `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (macOS)

**Server logs:**
```bash
# Terminal where `pnpm dev:web` is running
# Shows API routes, middleware logs
```

**Debug React components:**
- React DevTools browser extension
- Inspect component props/state
- Profile renders

### MediaPipe Debugging

**Visualize landmarks:**
```typescript
// In App.tsx detection loop
const canvas = canvasRef.current
const ctx = canvas.getContext('2d')

// Draw landmarks
results.faceLandmarks[0].forEach((landmark, i) => {
  const x = landmark.x * canvas.width
  const y = landmark.y * canvas.height

  ctx.fillStyle = 'red'
  ctx.beginPath()
  ctx.arc(x, y, 2, 0, 2 * Math.PI)
  ctx.fill()

  // Draw index
  ctx.fillText(i.toString(), x + 5, y)
})
```

**Log EAR values:**
```typescript
console.log('EAR:', {
  left: leftEAR.toFixed(3),
  right: rightEAR.toFixed(3),
  avg: avgEAR.toFixed(3),
  threshold: EAR_THRESHOLD,
  isBlink: avgEAR < EAR_THRESHOLD
})
```

---

## Performance Profiling

### Monitor FPS

**Add FPS counter:**
```typescript
let frameCount = 0
let lastTime = performance.now()

function detect() {
  frameCount++

  const now = performance.now()
  if (now - lastTime >= 1000) {
    const fps = frameCount
    console.log(`FPS: ${fps}`)
    frameCount = 0
    lastTime = now
  }

  // ... detection logic
}
```

**Target:** 30 FPS (stable)

### Profile MediaPipe

**Measure inference time:**
```typescript
const startTime = performance.now()
const results = await faceLandmarker.detectForVideo(video, timestamp)
const inferenceTime = performance.now() - startTime

console.log(`Inference: ${inferenceTime.toFixed(1)}ms`)
```

**Target:** <15ms (allows 18ms for JS processing at 30 FPS)

### SQLite Performance

**Enable query logging:**
```typescript
db.pragma('stats = ON')

db.prepare('INSERT INTO blink_events ...').run()

// Check stats
const stats = db.pragma('stats')
console.log(stats)
```

**Optimize slow queries:**
```sql
EXPLAIN QUERY PLAN
SELECT * FROM minute_rollups WHERE minute_start >= ?;
```

---

## Common Development Tasks

### Add New Component (UI Package)

```bash
cd packages/ui

# Create component file
touch src/components/NewComponent.tsx

# Add to index.ts
echo "export { NewComponent } from './components/NewComponent'" >> src/index.ts
```

**Component template:**
```typescript
// packages/ui/src/components/NewComponent.tsx
export interface NewComponentProps {
  value: string
}

export function NewComponent({ value }: NewComponentProps) {
  return <div>{value}</div>
}
```

**Use in desktop app:**
```typescript
// apps/desktop/src/renderer/hub/App.tsx
import { NewComponent } from '@lumina/ui'

function App() {
  return <NewComponent value="Hello" />
}
```

### Add New Detection Algorithm (Core Package)

```bash
cd packages/core

# Create algorithm file
touch src/detection/newAlgorithm.ts

# Add to index.ts
echo "export * from './detection/newAlgorithm'" >> src/index.ts
```

**Algorithm template:**
```typescript
// packages/core/src/detection/newAlgorithm.ts
import { NormalizedLandmark } from '@mediapipe/tasks-vision'

export function calculateMetric(landmarks: NormalizedLandmark[]): number {
  // Algorithm logic
  return 0
}

export class NewDetector {
  private state: number = 0

  update(metric: number): boolean {
    // Detection logic
    return metric > 0.5
  }
}
```

### Add New Database Table

**1. Update schema:**
```typescript
// apps/desktop/src/main/database.ts
export function initDatabase() {
  // ... existing tables

  db.exec(`
    CREATE TABLE IF NOT EXISTS new_table (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      data TEXT
    );

    CREATE INDEX idx_new_table_timestamp ON new_table(timestamp);
  `)
}
```

**2. Add IPC handler:**
```typescript
// apps/desktop/src/main/index.ts
ipcMain.handle('save-new-data', async (event, data) => {
  db.prepare(`
    INSERT INTO new_table (timestamp, data)
    VALUES (?, ?)
  `).run(Date.now(), JSON.stringify(data))
})
```

**3. Expose in preload:**
```typescript
// apps/desktop/src/preload/index.ts
contextBridge.exposeInMainWorld('electron', {
  saveNewData: (data) => ipcRenderer.invoke('save-new-data', data)
})
```

**4. Use in renderer:**
```typescript
// apps/desktop/src/renderer/hub/App.tsx
await window.electron.saveNewData({ key: 'value' })
```

---

## Deployment Workflow

### Desktop App Build

```bash
cd apps/desktop

# Development build (fast, no installer)
pnpm build

# Production build (with installer)
pnpm package

# Output: release/Lumina Setup 0.1.5.exe (Windows)
#         release/Lumina-0.1.5.dmg (macOS)
```

**Code signing:** See [Deployment Guide](DEPLOYMENT.md#code-signing)

### Web Dashboard Deploy

**Vercel (recommended):**
```bash
cd apps/web

# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**Manual build:**
```bash
pnpm build  # Output: .next/

# Upload .next/ to hosting provider
```

---

## Troubleshooting Development Issues

### "Module not found" errors

**Cause:** Workspace package not linked

**Fix:**
```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install
```

### Hot reload not working

**Cause:** Vite dev server issue

**Fix:**
```bash
# Kill process
pkill -f vite

# Restart
pnpm dev:desktop
```

### TypeScript errors in IDE

**Cause:** tsserver cache stale

**Fix (VS Code):**
1. `Cmd+Shift+P` → "TypeScript: Restart TS Server"
2. Or restart VS Code

### SQLite "database locked" error

**Cause:** Multiple processes accessing same DB

**Fix:**
1. Close all Electron windows
2. Delete `lumina.db-shm` and `lumina.db-wal` files
3. Restart app

---

## Related Documentation

- **Getting Started:** [Setup guide](GETTING_STARTED.md)
- **Codebase Tour:** [File structure](CODEBASE_TOUR.md)
- **Deployment:** [Production builds](DEPLOYMENT.md)
- **Testing:** [Test strategy](../08-TESTING/TEST_STRATEGY.md)

---

**Questions?** See [Documentation Index](../INDEX.md) or file an issue.
