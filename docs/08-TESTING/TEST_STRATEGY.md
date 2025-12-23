# Test Strategy

**Status:** Active | Last Updated: Dec 23, 2025

---

## Testing Philosophy

**Quality > Speed:** Comprehensive testing prevents production issues

**Test pyramid:**
```
         /\
        /E2E\       10% - End-to-end (critical user flows)
       /------\
      /  API   \    20% - Integration (database, sync, auth)
     /----------\
    /   Unit     \  70% - Unit tests (detection algorithms, utils)
   /--------------\
```

---

## Unit Tests (70% Coverage Target)

### Core Detection Algorithms

**Priority:** HIGH (these are mission-critical)

**Files to test:**
- `packages/core/src/detection/blink.ts`
- `packages/core/src/detection/posture.ts`
- `packages/core/src/detection/yawn.ts`
- `packages/core/src/detection/drowsiness.ts`

**Test cases:**

```typescript
// packages/core/src/detection/blink.test.ts
import { calculateEAR, BlinkDetector } from './blink'

describe('calculateEAR', () => {
  it('calculates correct EAR for open eyes', () => {
    const landmarks = mockLandmarks({ eyeOpenness: 'open' })
    const ear = calculateEAR(landmarks, LEFT_EYE_INDICES)
    expect(ear).toBeGreaterThan(0.2)
  })

  it('calculates correct EAR for closed eyes', () => {
    const landmarks = mockLandmarks({ eyeOpenness: 'closed' })
    const ear = calculateEAR(landmarks, LEFT_EYE_INDICES)
    expect(ear).toBeLessThan(0.18)
  })

  it('handles missing landmarks gracefully', () => {
    const landmarks = []
    const ear = calculateEAR(landmarks, LEFT_EYE_INDICES)
    expect(ear).toBe(0)
  })
})

describe('BlinkDetector', () => {
  let detector: BlinkDetector

  beforeEach(() => {
    detector = new BlinkDetector()
  })

  it('detects blink after 2 consecutive frames below threshold', () => {
    expect(detector.update(0.17)).toBe(false) // Frame 1
    expect(detector.update(0.17)).toBe(true)  // Frame 2 - blink!
  })

  it('does not detect blink from single frame', () => {
    expect(detector.update(0.17)).toBe(false) // Frame 1
    expect(detector.update(0.22)).toBe(false) // Eyes opened
  })

  it('resets counter when eyes open', () => {
    detector.update(0.17) // Frame 1
    detector.update(0.22) // Eyes opened - reset
    expect(detector.update(0.17)).toBe(false) // Back to Frame 1
  })
})
```

---

## Integration Tests (20% Coverage Target)

### Database Operations

**Files to test:**
- `apps/desktop/src/main/database.ts`
- `packages/api/src/sync.ts`

**Test cases:**

```typescript
// apps/desktop/src/main/database.test.ts
import { initDatabase, saveBlinkEvent, getMinuteRollups } from './database'

describe('SQLite Database', () => {
  let db

  beforeEach(() => {
    db = initDatabase(':memory:') // In-memory DB for tests
  })

  afterEach(() => {
    db.close()
  })

  it('creates tables on initialization', () => {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table'
    `).all()

    expect(tables).toContainEqual({ name: 'blink_events' })
    expect(tables).toContainEqual({ name: 'minute_rollups' })
  })

  it('saves blink event correctly', () => {
    saveBlinkEvent(db, {
      timestamp: Date.now(),
      earLeft: 0.22,
      earRight: 0.23,
      earAvg: 0.225,
      isBlink: false
    })

    const events = db.prepare('SELECT * FROM blink_events').all()
    expect(events).toHaveLength(1)
    expect(events[0].ear_avg).toBe(0.225)
  })

  it('creates minute rollup from blink events', () => {
    const minuteStart = Date.now()

    // Insert 60 seconds of blink events
    for (let i = 0; i < 60; i++) {
      saveBlinkEvent(db, {
        timestamp: minuteStart + i * 1000,
        earLeft: 0.22,
        earRight: 0.23,
        earAvg: 0.225,
        isBlink: i % 5 === 0 // Every 5th frame is a blink
      })
    }

    createMinuteRollup(db, minuteStart)

    const rollups = getMinuteRollups(db, minuteStart, minuteStart + 60000)
    expect(rollups).toHaveLength(1)
    expect(rollups[0].blink_count).toBe(12) // 60 frames / 5 = 12 blinks
  })

  it('auto-deletes old blink events', () => {
    const oneDayAgo = Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago

    saveBlinkEvent(db, { timestamp: oneDayAgo, ... })
    saveBlinkEvent(db, { timestamp: Date.now(), ... })

    cleanupOldEvents(db)

    const events = db.prepare('SELECT * FROM blink_events').all()
    expect(events).toHaveLength(1) // Only recent event remains
  })
})
```

### Supabase Sync

```typescript
// packages/api/src/sync.test.ts
import { syncWellnessData } from './sync'
import { createClient } from '@supabase/supabase-js'

describe('Cloud Sync', () => {
  let supabase
  let db

  beforeAll(() => {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
    db = initDatabase(':memory:')
  })

  it('syncs unsynced rollups to Supabase', async () => {
    // Insert unsynced rollups
    db.prepare(`
      INSERT INTO minute_rollups (minute_start, blink_count, avg_ear, wellness_score, synced)
      VALUES (?, 15, 0.22, 85, 0)
    `).run(Date.now())

    const result = await syncWellnessData(db, supabase)

    expect(result.synced).toBe(1)
    expect(result.error).toBeNull()

    // Verify marked as synced
    const rollups = db.prepare('SELECT * FROM minute_rollups WHERE synced = 0').all()
    expect(rollups).toHaveLength(0)
  })

  it('handles sync errors gracefully', async () => {
    // Simulate network error by using invalid Supabase URL
    const badSupabase = createClient('https://invalid.supabase.co', 'bad-key')

    const result = await syncWellnessData(db, badSupabase)

    expect(result.synced).toBe(0)
    expect(result.error).toBeDefined()

    // Rollups should still be unsynced (for retry)
    const rollups = db.prepare('SELECT * FROM minute_rollups WHERE synced = 0').all()
    expect(rollups.length).toBeGreaterThan(0)
  })
})
```

---

## E2E Tests (10% Coverage Target)

### Desktop App (Playwright)

**Critical flows:**
1. Onboarding (6 steps)
2. Real-time blink detection
3. Meeting mode calibration
4. Settings persistence

**Test example:**

```typescript
// apps/desktop/e2e/onboarding.spec.ts
import { test, expect, _electron as electron } from '@playwright/test'

test.describe('Onboarding Flow', () => {
  let electronApp
  let window

  test.beforeEach(async () => {
    electronApp = await electron.launch({ args: ['.'] })
    window = await electronApp.firstWindow()
  })

  test.afterEach(async () => {
    await electronApp.close()
  })

  test('completes 6-step onboarding', async () => {
    // Step 1: Welcome
    await expect(window.locator('text=Welcome to Lumina')).toBeVisible()
    await window.click('button:has-text("Get Started")')

    // Step 2: Privacy
    await expect(window.locator('text=Your Privacy Matters')).toBeVisible()
    await window.click('button:has-text("I Understand")')

    // Step 3: Camera Permission
    await expect(window.locator('text=Camera Access')).toBeVisible()
    await window.click('button:has-text("Allow Camera")')
    // Note: Actual camera permission requires manual interaction

    // Step 4: Calibration
    await window.waitForTimeout(2000) // Wait for calibration
    await window.click('button:has-text("Continue")')

    // Step 5: Goals
    await window.click('input[value="85"]') // Set wellness goal
    await window.click('button:has-text("Save Goals")')

    // Step 6: Complete
    await expect(window.locator('text=All Set!')).toBeVisible()
    await window.click('button:has-text("Start Tracking")')

    // Verify onboarding complete
    await expect(window.locator('text=Real-Time Blink Counter')).toBeVisible()
  })
})
```

### Web Dashboard (Playwright)

**Critical flows:**
1. Login (magic link + Google OAuth)
2. Admin dashboard loading
3. Data export (GDPR)

```typescript
// apps/web/e2e/admin-dashboard.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth session
    await page.goto('http://localhost:3000/login')
    // ... login flow
  })

  test('displays team wellness score', async ({ page }) => {
    await page.goto('http://localhost:3000/admin')

    await expect(page.locator('text=Team Wellness Score')).toBeVisible()
    await expect(page.locator('[data-testid="wellness-score"]')).toHaveText(/\d{1,3}/)
  })

  test('exports user data (GDPR)', async ({ page }) => {
    await page.goto('http://localhost:3000/settings')

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export My Data")')
    ])

    expect(download.suggestedFilename()).toBe('lumina-data-export.json')
  })
})
```

---

## Manual Testing Checklist

### Before Every Release

**Desktop App:**
- [ ] Camera detection works (macOS + Windows)
- [ ] Blink counter increments correctly
- [ ] Meeting mode detects Zoom/Teams/Meet
- [ ] Calibration UI responsive
- [ ] Settings persist after restart
- [ ] System tray icon updates (5 states)
- [ ] Cloud sync works (online + offline)

**Web Dashboard:**
- [ ] Login works (magic link + Google)
- [ ] User dashboard shows data
- [ ] Admin dashboard (role-based access)
- [ ] Charts render correctly
- [ ] Data export (JSON + CSV)
- [ ] Account deletion (30-day grace)

---

## Performance Testing

### Load Testing (Supabase)

**Tool:** `k6` or `artillery`

**Test scenario:**
```javascript
// load-test.js (k6)
import http from 'k6/http'
import { check, sleep } from 'k6'

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 }     // Ramp down
  ]
}

export default function () {
  // Simulate sync request
  const payload = JSON.stringify({
    user_id: 'test-user',
    organization_id: 'test-org',
    timestamp: new Date().toISOString(),
    blink_count: 15,
    avg_ear: 0.22,
    wellness_score: 85
  })

  const res = http.post('https://your-project.supabase.co/rest/v1/wellness_data', payload, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_ANON_KEY
    }
  })

  check(res, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500
  })

  sleep(1)
}
```

**Run:**
```bash
k6 run --env SUPABASE_ANON_KEY=your-key load-test.js
```

**Success criteria:**
- P95 response time < 500ms
- 0% error rate
- Throughput > 100 req/sec

---

## CI/CD Pipeline (Future)

**GitHub Actions workflow:**

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Related Documentation

- **E2E Verification:** [Pre-submission checklist](E2E_VERIFICATION.md)
- **Known Issues:** [Bug tracker](KNOWN_ISSUES.md)
- **Development Workflow:** [Testing in dev](../04-IMPLEMENTATION/DEVELOPMENT_WORKFLOW.md)

---

**Questions?** See [Documentation Index](../INDEX.md).
