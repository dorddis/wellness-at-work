# Remaining Gaps - Lumina Project

## Status: MOSTLY COMPLETE - Real Data Connected

**Updated:** December 20, 2025

---

## COMPLETED

- [x] Desktop app authentication (OTP flow working)
- [x] Auth screen UI
- [x] Supabase connection fixed
- [x] Charts components created (BlinkRateTrendChart, WellnessScoreChart, DepartmentComparisonChart)
- [x] GDPR export/delete buttons added to my-wellness page
- [x] **Dashboard page connected to real data** (getMyWellnessData, getMyDailyStats)
- [x] **My Wellness page connected to real data** (weekly/monthly trends, baseline)
- [x] **Admin Alerts page connected to real data** (org_alerts table, acknowledge flow)
- [x] **Employee detail page connected to real data** (wellness stats, alerts, trend chart)
- [x] **Chart placeholder replaced** - Now using real BlinkRateTrendChart

---

## REMAINING GAPS (Lower Priority)

### 1. Join Page TODOs

**File:** `apps/web/src/app/join/page.tsx`
```typescript
// TODO: Verify invite code via Supabase (line 23)
// TODO: Join organization via Supabase (line 46)
```

**Fix needed:** Implement actual Supabase calls for org joining flow.

---

### 2. End-to-End Data Flow Not Verified

**Question:** Does data actually flow from Desktop -> Supabase -> Web Dashboard?

Need to verify:
- [ ] Desktop syncs blink data to `wellness_data` table
- [ ] Web dashboard queries real data from `wellness_data`
- [ ] Admin page shows aggregated team stats from real data

---

### 3. Settings Don't Persist

**Desktop:**
- EAR threshold, consecutive frames changes not saved to electron-store

**Web Admin:**
- Privacy mode, alert thresholds changes not saved to Supabase

---

### 4. Alert Engine Not Implemented

The alert UI exists but no automatic alerts fire. Need:
- Alert rules engine in desktop app
- Rules: Low blink rate (<10/min for 5+ min), Extended session (>2hr)
- Sync alerts to Supabase `org_alerts` table

---

### 5. Break Reminder Not Working

"Take a Break" button exists but doesn't trigger reminders.

---

### 6. Inline Employee List Stats

Employee list page shows "--" for scores/rates. The detail page has real data, but the list view doesn't fetch per-employee stats.

---

## Priority Order for Remaining Work

1. **Verify end-to-end sync** - Test desktop -> Supabase -> web flow
2. **Settings persistence** - Save settings to electron-store and Supabase
3. **Alert engine** - Implement automatic alert rules
4. **Break reminders** - 20-20-20 rule implementation
5. **Join page** - Implement invite code verification

---

## Test Data Seeded

For testing, the following data was seeded:

- **wellness_data:** 5000 rows covering 30 days of work hours (9am-6pm)
- **org_alerts:** 8 alerts with various severities (3 unacknowledged)

This allows all dashboard pages to display realistic data.
