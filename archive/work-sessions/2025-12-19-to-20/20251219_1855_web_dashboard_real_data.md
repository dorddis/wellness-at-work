# Web Dashboard Real Data Connection - Complete

**Date:** December 19, 2025 6:55 PM

## What Was Implemented

### 1. Auth Context (`apps/web/src/app/contexts/auth-context.tsx`)
New context that:
- Loads user from Supabase on mount via `getCurrentUser()`
- Redirects unauthenticated users to `/login`
- Redirects users without org to `/onboarding`
- Listens for auth state changes
- Provides `signOut` function

### 2. Updated Providers (`apps/web/src/app/providers.tsx`)
- Re-exports `AuthProvider` and `useAuth` for easy imports

### 3. Dashboard Layout (`apps/web/src/app/(dashboard)/layout.tsx`)
**Before:** Used hardcoded `mockUser`
**After:** Uses `useAuth()` hook with real user data

Changes:
- Shows loading spinner while auth loads
- Organization name from real user
- User email and role from real user
- Sign out button calls real `signOut()`
- Admin nav items filtered by real user role

### 4. Admin Page (`apps/web/src/app/(dashboard)/admin/page.tsx`)
**Before:** `const orgId = '550e8400-e29b-41d4-a716-446655440000'`
**After:** `const orgId = user?.organization?.id`

Changes:
- Uses `useAuth()` to get real org ID
- Waits for orgId before fetching data
- All API calls use real org context

## Data Flow

```
User logs in (via /login)
    |
    v
Auth callback sets Supabase session
    |
    v
AuthProvider loads user via getCurrentUser()
    |
    v
If no org -> redirect to /onboarding
If has org -> render DashboardContent
    |
    v
Admin page uses user.organization.id for API calls
    |
    v
Real data from Supabase wellness_data table
```

## Files Modified

| File | Changes |
|------|---------|
| `apps/web/src/app/contexts/auth-context.tsx` | NEW: Auth context with Supabase |
| `apps/web/src/app/providers.tsx` | Re-export AuthProvider |
| `apps/web/src/app/(dashboard)/layout.tsx` | Use real auth, remove mockUser |
| `apps/web/src/app/(dashboard)/admin/page.tsx` | Use real orgId from auth |

## Testing

1. Go to http://localhost:3000/login
2. Sign in with email magic link
3. After auth, you should see the dashboard
4. Admin page should fetch data for your real organization

## Remaining Work

- [ ] Update employee dashboard (/dashboard) with real data
- [ ] Update my-wellness page with real data
- [ ] Update employees list with real data
- [ ] Fix department stats (currently hardcoded in API)

## Notes

The web dashboard now uses real authentication. Data will appear once:
1. Desktop app syncs blink data to Supabase
2. User is authenticated and in an organization
3. Wellness data exists for that organization
