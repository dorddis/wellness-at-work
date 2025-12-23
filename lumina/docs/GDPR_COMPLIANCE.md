# GDPR Compliance Implementation

This document describes the GDPR (General Data Protection Regulation) compliance features implemented in the Lumina wellness platform.

## Overview

Lumina implements privacy-by-design principles with the following GDPR rights:

| GDPR Right | Implementation | Status |
|------------|----------------|--------|
| Right to Access | Data export (JSON/CSV) | Implemented |
| Right to Erasure | Account deletion with 30-day grace | Implemented |
| Right to Data Portability | Multi-format export | Implemented |
| Right to Rectification | Data access request form | Implemented |
| Right to Restrict Processing | Local-only mode toggle | Implemented |
| Consent Tracking | Privacy policy version tracking | Implemented |

## Architecture

```
User Request
     |
     v
+--------------------+     +----------------------+
| Desktop/Web App    |---->| Supabase Database    |
| - Local SQLite     |     | - privacy_consents   |
| - Settings Store   |     | - data_access_requests|
+--------------------+     | - org_members        |
                           +----------------------+
                                    |
                                    v
                           +----------------------+
                           | Edge Functions       |
                           | - process-account-   |
                           |   deletions (daily)  |
                           +----------------------+
```

## Features

### 1. Local-Only Mode (Right to Restrict Processing)

Users can disable cloud sync to keep all wellness data on their local device only.

**Location:** Desktop App > Settings > Privacy & Cloud Sync

**Implementation:**
- `packages/ui/src/stores/settingsStore.ts` - Added `cloudSyncEnabled` boolean
- `apps/desktop/src/renderer/hub/App.tsx` - Toggle UI and sync control

**How it works:**
```typescript
// When disabled, sync never starts
if (cloudSyncEnabled) {
  window.lumina?.sync.startAuto();
} else {
  window.lumina?.sync.stopAuto();
}
```

**User Experience:**
- Toggle shows current sync status with explanation
- Blue info banner appears when local-only mode is active
- Data remains in local SQLite, never transmitted to cloud

---

### 2. Account Deletion (Right to Erasure)

Users can request permanent deletion of their account and all associated data.

**Location:** Web Dashboard > Settings > Danger Zone > Delete Account

**Implementation:**
- `packages/api/src/queries.ts` - `requestAccountDeletion()`, `cancelAccountDeletion()`
- `supabase/functions/process-account-deletions/index.ts` - Edge Function
- Database: `org_members.deletion_requested_at` column

**Deletion Flow:**
```
1. User clicks "Delete Account" and types DELETE to confirm
2. `deletion_requested_at` is set to current timestamp
3. User sees scheduled deletion date (30 days out)
4. Daily cron job (3 AM UTC) checks for users past grace period
5. Edge Function permanently deletes all user data
6. User can cancel within 30 days via support
```

**Data Deleted:**
- `wellness_data` - All blink/posture records
- `break_events` - Break history
- `exercise_sessions` - Eye exercise history
- `challenge_participants` - Team challenge participation
- `org_alerts` - Personal alerts
- `org_members` - Organization membership
- `auth.users` - Supabase auth record

**Edge Function Schedule:**
```sql
-- Runs daily at 3 AM UTC
SELECT cron.schedule(
  'process-account-deletions',
  '0 3 * * *',
  $$SELECT net.http_post(...)$$
);
```

---

### 3. Data Export (Right to Access & Portability)

Users can download all their personal data in JSON or CSV format.

**Location:** Web Dashboard > Settings > Data & Privacy > Export My Data

**Implementation:**
- `packages/api/src/queries.ts` - `exportUserData(userId, format)`
- `apps/web/src/app/(dashboard)/dashboard/settings/page.tsx` - UI with format selector

**Exported Data:**
| Category | Fields |
|----------|--------|
| Profile | id, email, createdAt |
| Wellness Data | timestamp, blink_count, avg_ear, session_id |
| Break Events | scheduled_at, started_at, completed_at, status, break_type |
| Exercise Sessions | exercise_name, started_at, completed_at, status |
| Challenge Participations | challenge_name, joined_at, current_progress |
| Alerts | alert_type, severity, message, acknowledged, created_at |
| Privacy Consents | policy_version, consented_at |
| Membership | organization, role, department, joined_at |

**Export Formats:**
- **JSON** - Single file with all data, human-readable
- **CSV** - Multiple files (one per data type), spreadsheet-compatible

**Data Retention:** Exports include last 90 days of wellness data.

---

### 4. Privacy Policy Version Tracking (Consent)

Tracks which version of the privacy policy each user consented to.

**Location:**
- `packages/ui/src/constants/privacy.ts` - Version constants
- `apps/web/src/app/privacy/page.tsx` - Displays current version
- Database: `privacy_consents` table

**Implementation:**
```typescript
// packages/ui/src/constants/privacy.ts
export const CURRENT_PRIVACY_POLICY_VERSION = '1.0.0';
export const CURRENT_PRIVACY_POLICY_DATE = '2024-12-22';

export function needsPrivacyConsent(lastConsentedVersion: string | null): boolean {
  // Returns true if user needs to re-consent
}

export function getChangesSinceVersion(lastVersion: string | null): PolicyVersion[] {
  // Returns changelog since user's last consent
}
```

**Database Schema:**
```sql
CREATE TABLE privacy_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  policy_version TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  UNIQUE(user_id, policy_version)
);
```

**Updating Privacy Policy:**
1. Increment `CURRENT_PRIVACY_POLICY_VERSION` in `privacy.ts`
2. Update `CURRENT_PRIVACY_POLICY_DATE`
3. Add entry to `VERSION_HISTORY` array with changes
4. Update content in `apps/web/src/app/privacy/page.tsx`
5. Users will see consent banner on next login (if `needsPrivacyConsent` returns true)

---

### 5. Data Access Request Form (Right to Rectification)

Users can submit formal GDPR Subject Access Requests (SAR).

**Location:** Web Dashboard > Settings > Data & Privacy > Data Access Request

**Implementation:**
- `packages/api/src/queries.ts` - `submitDataAccessRequest()`, `getMyDataAccessRequests()`
- Database: `data_access_requests` table

**Request Types:**
| Type | Description |
|------|-------------|
| `access` | View all personal data held |
| `portability` | Transfer data to another service |
| `rectification` | Correct inaccurate data |

**Database Schema:**
```sql
CREATE TABLE data_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('access', 'rectification', 'portability')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  request_details TEXT,
  admin_notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id)
);
```

**Admin Processing:**
Admins can view requests for their organization members and update status:
- `pending` - Awaiting review
- `processing` - Being handled
- `completed` - Request fulfilled
- `rejected` - Request denied (with reason in admin_notes)

**Timeline:** GDPR requires response within 30 days.

---

## Row Level Security (RLS) Policies

All GDPR-related tables have RLS enabled:

### privacy_consents
```sql
-- Users can view and insert their own consents
CREATE POLICY "Users can view own consents" ON privacy_consents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can record consent" ON privacy_consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### data_access_requests
```sql
-- Users can view and create their own requests
CREATE POLICY "Users can view own requests" ON data_access_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own requests" ON data_access_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view and update requests for their org members
CREATE POLICY "Admins can view org requests" ON data_access_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM org_members WHERE ...)
  );
```

---

## API Reference

### Export Data
```typescript
import { exportUserData } from '@lumina/api';

// JSON format (default)
const result = await exportUserData(userId);

// CSV format
const result = await exportUserData(userId, 'csv');
// result.csv.wellnessData, result.csv.breakEvents, etc.
```

### Account Deletion
```typescript
import { requestAccountDeletion, cancelAccountDeletion } from '@lumina/api';

// Request deletion (30-day grace period)
const result = await requestAccountDeletion(userId);
// result.deletionDate = scheduled deletion timestamp

// Cancel (if within grace period)
await cancelAccountDeletion(userId);
```

### Privacy Consent
```typescript
import { getPrivacyConsent, recordPrivacyConsent } from '@lumina/api';
import { needsPrivacyConsent, CURRENT_PRIVACY_POLICY_VERSION } from '@lumina/ui';

// Check if user needs to consent
const consent = await getPrivacyConsent(userId);
if (needsPrivacyConsent(consent.version)) {
  // Show consent modal
}

// Record consent
await recordPrivacyConsent(userId, CURRENT_PRIVACY_POLICY_VERSION, navigator.userAgent);
```

### Data Access Requests
```typescript
import { submitDataAccessRequest, getMyDataAccessRequests } from '@lumina/api';

// Submit request
const result = await submitDataAccessRequest(
  userId,
  'access', // 'access' | 'rectification' | 'portability'
  'Optional details about the request'
);

// View previous requests
const requests = await getMyDataAccessRequests(userId);
```

---

## Configuration

### Environment Variables

No additional environment variables required. GDPR features use existing Supabase configuration.

### Cron Job

The account deletion job is configured via pg_cron:
```sql
-- Check daily at 3 AM UTC
SELECT cron.schedule('process-account-deletions', '0 3 * * *', ...);
```

To modify schedule, update the cron expression in the migration.

---

## Testing

### Manual Testing Checklist

- [ ] Enable local-only mode, verify no network calls to Supabase
- [ ] Export data as JSON, verify all categories present
- [ ] Export data as CSV, verify multiple files download
- [ ] Request account deletion, verify confirmation modal
- [ ] Submit data access request, verify appears in list
- [ ] Check privacy policy page shows version badge

### Automated Testing

```bash
# Run API package tests
cd packages/api && pnpm test

# Type checking
pnpm typecheck
```

---

## Compliance Checklist

For GDPR audits, verify:

- [x] Personal data can be exported in machine-readable format (JSON/CSV)
- [x] Users can request account deletion with grace period
- [x] Deletion is permanent and covers all user data
- [x] Privacy policy version is tracked per user
- [x] Users can submit formal data access requests
- [x] Local-only mode prevents cloud data transmission
- [x] RLS policies prevent unauthorized data access
- [x] No images/video transmitted (on-device CV processing only)
- [x] Data encrypted in transit (TLS 1.3) and at rest (AES-256)

---

## Changelog

### v1.0.0 (2024-12-22)
- Initial GDPR compliance implementation
- Local-only mode toggle
- Account deletion with Edge Function
- JSON/CSV data export
- Privacy policy version tracking
- Data access request form
