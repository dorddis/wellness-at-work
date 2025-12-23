# End-to-End Data Flow Verification Guide

**Date:** December 19, 2025

## Prerequisites

1. **Supabase project** running with tables:
   - organizations
   - org_members
   - wellness_data
   - org_alerts

2. **Create a test organization** in Supabase:
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
Note the slug - you'll use `test-company` as the invite code.

## Testing Steps

### Step 1: Web App - Create Account & Org

1. Open http://localhost:3000/login
2. Enter your email
3. Check email for magic link, click it
4. On /onboarding page, enter the invite code: `test-company`
5. You should be redirected to /dashboard

### Step 2: Desktop App - Login & Start Session

1. Open the desktop app (electron)
2. Enter the same email you used on web
3. Check email for OTP code (6 digits)
4. Enter OTP code
5. Enter invite code: `test-company`
6. Dashboard should appear

### Step 3: Desktop App - Generate Blink Data

1. Click "Live Monitor" in sidebar
2. Click "Start Session"
3. Allow camera access
4. Face the camera - you should see:
   - Face detected indicator
   - Blink count increasing as you blink
   - Blink rate updating every 5 seconds

5. Let it run for at least 1 minute (to generate a rollup)
6. Check "Settings" page - should show "Connected to cloud"

### Step 4: Trigger Sync

**Option A: Wait 5 minutes** (auto-sync interval)

**Option B: Manual sync**
1. Go to Settings
2. Click "Sync Now"
3. Check console for "Sync completed"

### Step 5: Verify Data in Supabase

In Supabase dashboard or via SQL:
```sql
SELECT * FROM wellness_data
WHERE user_id = 'YOUR_USER_ID'
ORDER BY timestamp DESC
LIMIT 10;
```

You should see rows with:
- org_id (matching your organization)
- user_id (your user)
- timestamp
- blink_count
- avg_ear

### Step 6: Verify Web Dashboard

1. Go to http://localhost:3000/admin
2. You should see:
   - Team Wellness Score (calculated from blink rate)
   - Avg Blink Rate (from synced data)
   - Active Today = 1 (your account)

## Troubleshooting

### "Sync: Not configured, skipping"
- User didn't complete auth flow
- Check Settings > Cloud Sync status
- Try signing out and back in

### No data appearing on web
- Check if desktop actually synced (Settings > Pending Records should be 0)
- Check Supabase for wellness_data rows
- Check browser console for API errors

### Auth errors
- Check Supabase Auth dashboard for user
- Verify org_members table has your user

## Data Flow Diagram

```
Desktop App
    |
    +-- Camera (30 FPS)
    |       |
    |       v
    +-- MediaPipe Face Detection
    |       |
    |       v
    +-- Blink Detection (EAR algorithm)
    |       |
    |       v
    +-- blink_events table (SQLite)
    |       |
    |       v (every 1 min)
    +-- minute_rollups table (SQLite)
    |       |
    |       v (every 5 min)
    +-- Sync Service
            |
            v
        Supabase wellness_data
            |
            v
        Web Dashboard queries
            |
            v
        Admin Dashboard displays stats
```

## Success Criteria

- [ ] Desktop app shows login screen
- [ ] Can complete OTP verification
- [ ] Can join organization with invite code
- [ ] Camera initializes and detects face
- [ ] Blink count increases when blinking
- [ ] Settings shows "Connected to cloud"
- [ ] Manual sync completes successfully
- [ ] Data appears in Supabase wellness_data table
- [ ] Web admin dashboard shows real blink rate
