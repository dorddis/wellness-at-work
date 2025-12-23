# Desktop App Authentication - Implementation Complete

**Date:** December 19, 2025 6:43 PM

## What Was Implemented

### 1. IPC Auth Handlers (`apps/desktop/src/main/ipc.ts`)
Added 6 new auth IPC handlers:
- `auth:send-otp` - Sends magic link email via Supabase
- `auth:verify-otp` - Verifies the 6-digit OTP code
- `auth:get-session` - Gets current Supabase session
- `auth:get-user` - Gets user with organization info
- `auth:sign-out` - Signs out and clears sync credentials
- `auth:join-org` - Joins organization with invite code

### 2. Preload API (`apps/desktop/src/preload/index.ts`)
Exposed auth API to renderer:
```typescript
window.lumina.auth = {
  sendOtp: (email) => Promise<AuthResult>,
  verifyOtp: (email, token) => Promise<AuthVerifyResult>,
  getSession: () => Promise<SessionResult>,
  getUser: () => Promise<UserResult>,
  signOut: () => Promise<AuthResult>,
  joinOrg: (inviteCode) => Promise<JoinOrgResult>,
}
```

### 3. Auth Screen (`apps/desktop/src/renderer/hub/AuthScreen.tsx`)
New component with 3-step flow:
1. **Email Input** - User enters work email
2. **OTP Verification** - User enters 6-digit code from email
3. **Join Organization** - User enters invite code to join team

### 4. App Auth Gate (`apps/desktop/src/renderer/hub/App.tsx`)
- Added `authUser` and `authChecked` state
- Auth check on mount via `useEffect`
- Shows `AuthScreen` if not authenticated
- Camera/MediaPipe only initializes after auth
- Sync credentials auto-set after login

### 5. Settings Account Section
- Shows logged-in user email and organization
- Sign out button that clears auth and sync credentials

## Auth Flow

```
App Mount
    |
    v
Check Session (auth:get-user)
    |
    +-- Has valid session with org?
    |       |
    |       +-- YES --> Show main app, set sync credentials
    |       |
    |       +-- NO --> Show AuthScreen
    |
AuthScreen
    |
    v
Step 1: Enter email --> auth:send-otp
    |
    v
Step 2: Enter OTP code --> auth:verify-otp
    |
    v
Check if user has org (auth:get-user)
    |
    +-- Has org? --> Complete
    |
    +-- No org? --> Step 3: Enter invite code --> auth:join-org
    |
    v
Complete: setAuthUser(), sync.setCredentials()
```

## How Sync Now Works

1. User logs in with email OTP
2. User joins organization with invite code
3. `sync.setCredentials(orgId, userId)` is called automatically
4. Sync service now has valid credentials
5. Data syncs to Supabase every 5 minutes

## Testing the Auth Flow

1. Restart the desktop app
2. You should see the login screen
3. Enter an email address (must be valid to receive OTP)
4. Check email for 6-digit code
5. Enter code to verify
6. Enter organization invite code (slug from Supabase)
7. Main dashboard appears with camera

## Files Modified

| File | Changes |
|------|---------|
| `apps/desktop/src/main/ipc.ts` | Added auth IPC handlers |
| `apps/desktop/src/preload/index.ts` | Added auth API types and implementation |
| `apps/desktop/src/renderer/hub/AuthScreen.tsx` | NEW: Auth screen component |
| `apps/desktop/src/renderer/hub/App.tsx` | Added auth gate, state, handlers |

## Next Steps

1. **Test with real Supabase** - Try logging in with a real email
2. **Create test organization** - Set up an org in Supabase to test joining
3. **Web Dashboard Real Data** - Now that desktop can sync, connect web to real data
4. **End-to-End Verification** - Verify data flows from desktop to web

## Known Limitations

- No "forgot password" (magic link only, no password)
- No Google OAuth yet (would need deep link handling)
- No "create organization" in desktop (admin must create via web)
- Session doesn't persist across app restarts (needs electron-store integration)
