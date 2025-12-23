# End-to-End Verification Guide - Lumina

**Status:** Active Testing Reference
**Last Updated:** December 2025
**Tech Stack:** Electron + Next.js + Supabase

---

## Quick Test Summary

**Total test time:** ~30 minutes for full E2E flow
**Prerequisites:** Supabase project running, both desktop and web apps built

**Test Path:**
```
Web Sign-Up → Desktop Login → Generate Blinks → Sync to Cloud → View on Dashboard → GDPR Export/Delete
```

---

## Prerequisites

### 1. Supabase Project Setup

**Required tables:**
- `organizations` - Company/team entities
- `org_members` - User-organization relationships
- `wellness_data` - Time-series blink data (hypertable)
- `org_alerts` - Team-level alerts
- `daily_progress` - Streaks and achievements
- `baselines` - Calibrated blink rate thresholds

**Create test organization:**
```sql
INSERT INTO organizations (id, name, slug, privacy_mode, subscription_tier)
VALUES (
  gen_random_uuid(),
  'Test Company',
  'test-company',
  'named',
  'trial'
);
```

**Verify RLS policies are enabled:**
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

---

### 2. Environment Configuration

**Web app** (`.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Desktop app** (`.env`):
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DEMO_MODE=false  # Important: Use real data
VITE_BYPASS_AUTH=false  # Important: Real auth flow
```

---

### 3. Build & Run

```bash
# Terminal 1: Desktop app
cd lumina/apps/desktop
pnpm dev

# Terminal 2: Web dashboard
cd lumina/apps/web
pnpm dev
```

---

## Test Flow

### Step 1: Web App - Create Account & Join Organization

**Time:** 3 minutes

1. **Navigate:** http://localhost:3000/login
2. **Enter email:** your-test-email@example.com
3. **Check email:** Click magic link (Supabase sends OTP)
4. **Onboarding:**
   - Redirects to /onboarding
   - Enter invite code: `test-company`
   - Click "Join Organization"
5. **Verify:** Redirects to /dashboard (shows "Welcome to Lumina" if no data yet)

**Expected behavior:**
- Magic link arrives within 30 seconds
- Onboarding shows organization name after invite code entry
- Dashboard loads without errors

**Troubleshooting:**
- **No magic link:** Check Supabase Auth dashboard for user creation
- **Invalid invite code:** Verify organization slug in database matches `test-company`
- **Redirect loop:** Clear browser cookies and localStorage

---

### Step 2: Desktop App - Login & Complete Onboarding

**Time:** 5 minutes

1. **Launch desktop app** (should show login screen)
2. **Enter same email:** your-test-email@example.com
3. **Check email for OTP:** 6-digit code (different from magic link)
4. **Enter OTP code** in desktop app
5. **Enter invite code:** `test-company`
6. **Onboarding flow:**
   - **Welcome screen:** Click "Get Started"
   - **Camera permissions:** Click "Enable Camera" (allow browser permissions)
   - **Set goals:** Adjust daily/weekly goals or use defaults, click "Continue"
   - **Calibration:** Click "Start Calibration" (runs for 30 seconds)
7. **Verify:** Dashboard appears with:
   - Today's Wellness: 0/100 (no data yet)
   - Live Monitor button
   - Settings accessible

**Expected behavior:**
- OTP code arrives within 30 seconds
- Camera preview shows during calibration
- Calibration completes and saves baseline
- Dashboard loads with empty state messages

**Troubleshooting:**
- **Camera not found:** Check browser permissions, restart app
- **OTP invalid:** Request new code (60s cooldown)
- **Calibration stuck:** Check console for MediaPipe errors
- **Baseline not saved:** Check `Settings > Baseline` - should show P25/P50/P75 values

---

### Step 3: Desktop App - Generate Blink Data

**Time:** 5 minutes (1 min minimum for rollup)

1. **Click "Live Monitor"** in sidebar
2. **Click "Start Session"**
3. **Face camera:** You should see:
   - Green "Face Detected" indicator
   - FPS counter (should be ~30 FPS)
   - Blink count increasing as you blink
   - EAR value fluctuating (0.25-0.35 normal, <0.2 blink detected)
   - Blink rate updating every 5 seconds

4. **Test blink detection:**
   - Blink normally 10 times → Count should increment by 10
   - Look away from camera → "No face detected" message
   - Look back → Detection resumes

5. **Let run for at least 1 minute** (generates minute rollup)

6. **Check local storage:**
   - Go to Settings page
   - "Local Records: 1+" (minute rollups)
   - "Pending Sync: 1+" (unsynced records)

**Expected behavior:**
- Blink detection <100ms latency (feels instant)
- FPS stable at 28-30 (acceptable: >25)
- Blink rate converges to 12-18/min (normal)
- No crashes or freezing

**Troubleshooting:**
- **0 FPS:** Camera initialization failed, restart app
- **Blinks not counted:** EAR threshold too low, adjust in Settings
- **False positives:** EAR threshold too high, adjust sensitivity
- **High CPU usage (>60%):** MediaPipe issue, check GPU acceleration

---

### Step 4: Trigger Cloud Sync

**Time:** 2 minutes

**Option A: Wait 5 minutes** (auto-sync interval)
- Sync runs in background
- Check console for "Sync completed: X records"

**Option B: Manual sync (recommended for testing)**
1. Go to Settings page
2. Scroll to "Cloud Sync" section
3. Click "Sync Now" button
4. Watch for:
   - "Syncing X records..." message
   - Progress indicator
   - "Sync completed successfully" toast
5. Verify: "Pending Sync: 0" after completion

**Expected behavior:**
- Sync completes in <5 seconds for 10 records
- No errors in console
- Pending records count drops to 0
- "Last Sync" timestamp updates

**Troubleshooting:**
- **"Not configured, skipping":** User didn't complete auth, sign out and back in
- **HTTP 401:** Session expired, refresh auth token
- **HTTP 403:** RLS policy blocking insert, check org_members table
- **Timeout:** Supabase slow, check network tab for API calls

---

### Step 5: Verify Data in Supabase

**Time:** 2 minutes

**Using Supabase Dashboard:**
1. Open Supabase project → Table Editor
2. Select `wellness_data` table
3. Filter by your user_id (copy from Settings page)
4. Order by `timestamp DESC`

**Using SQL:**
```sql
SELECT
  timestamp,
  blink_count,
  avg_ear,
  avg_blink_rate,
  org_id
FROM wellness_data
WHERE user_id = 'YOUR_USER_ID'
ORDER BY timestamp DESC
LIMIT 10;
```

**Expected data:**
- ✅ At least 1 row (from 1 minute of monitoring)
- ✅ `blink_count` > 0 (unless you didn't blink)
- ✅ `avg_ear` between 0.15-0.35 (typical range)
- ✅ `avg_blink_rate` between 5-25 (normal range)
- ✅ `org_id` matches your organization
- ✅ `timestamp` within last 10 minutes

**Troubleshooting:**
- **No rows:** Sync didn't actually complete, check desktop app logs
- **org_id is NULL:** Org membership not set up correctly
- **timestamp is old:** Desktop app clock is off, sync system time

---

### Step 6: Verify Web Dashboard (Admin View)

**Time:** 3 minutes

1. **Open:** http://localhost:3000/admin (admin dashboard)
2. **Verify metrics:**
   - **Team Wellness Score:** >0 (calculated from blink rate)
   - **Avg Blink Rate:** Matches your desktop app average
   - **Active Today:** 1 (your account)
   - **Total Members:** 1

3. **Check charts:**
   - **Blink Rate Over Time:** Should show data point for your session
   - **Activity Heatmap:** Should show green for current hour
   - **Top Contributors:** Your name appears

4. **Check user dashboard:** http://localhost:3000/dashboard
   - **Today's Wellness:** Shows calculated score
   - **Daily Progress:** Shows blink minutes
   - **Session History:** Shows your recent session
   - **Achievements:** May unlock "First Steps" badge

**Expected behavior:**
- Data appears within 10 seconds of page load
- Charts render correctly (no empty states)
- Real-time data matches desktop app

**Troubleshooting:**
- **Empty state:** No data in Supabase, go back to Step 5
- **Loading forever:** API error, check browser console
- **Wrong data:** RLS filtering wrong user, check org_members
- **Chart errors:** Date parsing issue, check timestamp format

---

### Step 7: Test GDPR Compliance

**Time:** 5 minutes

#### 7.1 Data Export

1. **Go to:** Settings page (desktop or web)
2. **Click "Export My Data"**
3. **Choose format:** CSV or JSON
4. **Download starts** automatically
5. **Verify file contents:**
   - CSV: Columns = timestamp, blink_count, avg_ear, etc.
   - JSON: Array of wellness_data objects
   - Contains all your synced data

**Expected behavior:**
- Export completes in <10 seconds
- File size reasonable (~1KB per minute of data)
- Data is complete (matches Supabase row count)

**Troubleshooting:**
- **No data in export:** Query failed, check RLS policies
- **Partial data:** Export limit reached, increase max rows
- **Malformed JSON:** Serialization error, check payload structure

---

#### 7.2 Account Deletion

**⚠️ WARNING: This deletes ALL data permanently**

1. **Go to:** Settings page
2. **Scroll to "Danger Zone"**
3. **Click "Delete Account"**
4. **Confirmation dialog:**
   - Type "DELETE" to confirm
   - Shows warning about data loss
5. **Click "Confirm Deletion"**
6. **Verify:**
   - Desktop app logs out immediately
   - Redirects to login screen
   - Web app logs out

7. **Check Supabase:**
```sql
-- User should be soft-deleted
SELECT deleted_at FROM auth.users WHERE email = 'your-test-email@example.com';

-- wellness_data should be gone (RLS filters deleted users)
SELECT COUNT(*) FROM wellness_data WHERE user_id = 'YOUR_USER_ID';
-- Should return 0
```

**Expected behavior:**
- Deletion completes in <5 seconds
- All user data removed from database
- Local SQLite database wiped
- Cannot log back in with same email (account deleted)

**Troubleshooting:**
- **Deletion hangs:** Cascade delete slow, check foreign keys
- **Data still visible:** RLS not filtering deleted_at, fix policy
- **Can still log in:** Soft delete only, need hard delete cron job

---

## Success Criteria Checklist

### Desktop App

- [ ] Camera initializes within 2 seconds
- [ ] Face detection works at 25+ FPS
- [ ] Blink detection accuracy >90% (manually count 10 blinks, verify count)
- [ ] EAR values make sense (0.25-0.35 open, <0.2 blink)
- [ ] Minute rollups generated every 60 seconds
- [ ] Local SQLite stores events correctly
- [ ] Baseline calibrates after 2 hours (or 30s in demo mode)
- [ ] Settings persist across app restarts
- [ ] Sync completes successfully (0 pending records)
- [ ] Auth flow works (OTP + invite code)
- [ ] System tray icon shows stats
- [ ] Memory usage <200MB during active monitoring

### Web Dashboard

- [ ] Magic link login works
- [ ] Dashboard loads in <1 second
- [ ] Real-time data appears within 10 seconds of sync
- [ ] Charts render correctly
- [ ] Admin view shows team metrics
- [ ] User view shows personal stats
- [ ] GDPR export downloads valid file
- [ ] Account deletion works and cascades

### Cloud Sync

- [ ] Data appears in Supabase after sync
- [ ] RLS policies enforce user isolation
- [ ] Minute rollups preserve accuracy
- [ ] No duplicate records (idempotency works)
- [ ] Offline queue works (disconnect WiFi, use app, reconnect)
- [ ] Sync resumes after network failure

### GDPR

- [ ] Export includes all user data
- [ ] Export format is valid (CSV/JSON)
- [ ] Deletion removes all traces
- [ ] Consent tracking works
- [ ] Privacy policy accessible

---

## Performance Benchmarks

| Metric | Target | Actual | Test Method |
|--------|--------|--------|-------------|
| **Camera init** | <2s | ___ | Time from "Start Session" to first frame |
| **Blink latency** | <100ms | ___ | Blink → count increment |
| **FPS** | >25 | ___ | Check FPS counter |
| **Memory usage** | <200MB | ___ | Task Manager during active session |
| **CPU usage** | <40% | ___ | Task Manager during active session |
| **Sync time (10 records)** | <5s | ___ | Manual sync, check console |
| **Dashboard load** | <1s | ___ | Network tab First Contentful Paint |
| **Query time (7 days)** | <100ms | ___ | Network tab API response time |
| **Export time (1000 records)** | <10s | ___ | Click export → download starts |
| **Deletion time** | <5s | ___ | Confirm delete → logged out |

---

## Regression Testing

### After Each Code Change

1. **Build both apps:**
   ```bash
   cd lumina
   pnpm build
   ```

2. **Run quick smoke test (5 min):**
   - Launch desktop app → Login → Start session → Verify blinks counted
   - Open web dashboard → Verify data loads
   - Sync → Verify data appears

3. **Run full E2E (30 min):**
   - Follow complete test flow above
   - Check all success criteria

---

## Common Issues & Solutions

### Issue: "Camera not found"
**Solution:**
- Grant camera permissions in OS settings
- Restart app after granting permissions
- Check other apps aren't using camera (Zoom, Teams, etc.)

### Issue: Blinks not detected
**Solution:**
- Face camera directly (MediaPipe needs frontal view)
- Ensure good lighting (not backlit)
- Adjust EAR threshold in Settings (default: 0.21)
- Check FPS >20 (low FPS = missed frames = missed blinks)

### Issue: Sync fails with HTTP 403
**Solution:**
- Check org_members table: `SELECT * FROM org_members WHERE user_id = 'YOUR_ID';`
- If missing, re-join organization via invite code
- Check RLS policy on wellness_data table

### Issue: Dashboard shows old data
**Solution:**
- Hard refresh browser (Ctrl+Shift+R)
- Check Supabase for recent rows
- Verify sync actually completed on desktop
- Check browser cache settings

### Issue: Export is empty
**Solution:**
- Verify data exists in Supabase
- Check RLS policy allows SELECT for your user
- Try JSON format instead of CSV
- Check browser console for API errors

### Issue: Deletion doesn't work
**Solution:**
- Check database logs for cascade delete errors
- Verify foreign keys have ON DELETE CASCADE
- Try soft delete first (deleted_at), hard delete later
- Check auth.users table permissions

---

## Automated Testing (Future)

### Unit Tests (Planned)
- Blink detection algorithm accuracy
- EAR calculation correctness
- Sync batching logic
- Baseline calibration algorithm

### Integration Tests (Planned)
- Camera → MediaPipe → SQLite flow
- SQLite → Sync → Supabase flow
- Desktop auth → Web dashboard consistency

### E2E Tests (Planned - Playwright)
```typescript
test('full user flow', async ({ page }) => {
  // 1. Web sign-up
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.click('button:has-text("Send Magic Link")');

  // 2. Desktop login (Electron automation)
  // 3. Generate blinks (mock MediaPipe)
  // 4. Verify sync
  // 5. Verify dashboard
});
```

---

## Load Testing (Future)

### Simulate 1,000 Users

```bash
# Artillery config
scenarios:
  - name: "Concurrent sync"
    flow:
      - post:
          url: "/api/sync"
          json:
            user_id: "{{ $randomUUID }}"
            records: "{{ generateMinuteRollups(10) }}"
```

**Expected results:**
- Supabase handles 1,000 concurrent syncs
- API latency <500ms at p95
- No connection pool exhaustion

---

## Security Testing (Future)

### Penetration Tests

1. **RLS bypass attempt:** Try accessing other users' data
2. **SQL injection:** Test input validation on custom queries
3. **XSS:** Test alert message rendering
4. **CSRF:** Test auth token handling

**Expected:** All attacks should fail gracefully

---

## Related Documentation

- **Architecture:** [../03-ARCHITECTURE/FINAL_ARCHITECTURE.md](../03-ARCHITECTURE/FINAL_ARCHITECTURE.md) - Data flow diagrams
- **API Reference:** [../07-API-REFERENCE/DATABASE_SCHEMA.md](../07-API-REFERENCE/DATABASE_SCHEMA.md) - Schema details
- **GDPR:** [../04-IMPLEMENTATION/GDPR_COMPLIANCE.md](../04-IMPLEMENTATION/GDPR_COMPLIANCE.md) - Compliance implementation

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 18, 2024 | Initial checklist (PyQt6 approach) |
| 2.0 | Dec 19, 2024 | E2E guide for actual implementation |
| 3.0 | Dec 23, 2025 | Consolidated comprehensive guide |
