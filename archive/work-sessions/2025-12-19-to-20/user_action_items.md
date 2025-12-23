# User Action Items - Blocking Tasks

**Date:** December 19, 2024
**Purpose:** Tasks only YOU can do that are blocking further development

---

## Blocking Item 1: Supabase Project Setup

**Why blocking:** Can't wire up auth or data without API keys

### Steps:
1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - **Name:** `lumina` (or whatever you prefer)
   - **Database Password:** (save this somewhere!)
   - **Region:** Choose closest to Singapore
4. Wait for project to provision (~2 minutes)
5. Go to **Settings > API**
6. Copy these values:

```
Project URL: https://xxxxxxxx.supabase.co - https://acvmkigubzldhpyrlail.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... - eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdm1raWd1YnpsZGhweXJsYWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNDI0ODIsImV4cCI6MjA4MTcxODQ4Mn0.K9qSjNvjl1Nmro06J5pDbWaWK3jcSGWOgigxe35fZ0k

Secret key: sb_secret_qAOeq7IdYyqGex7vT8czTg_rUuLXIUV

Publishable key: sb_publishable_L1s9t3fOGkDDFGWuX_sIEw_MqgQ5a89

Connection: postgresql://postgres:L%#XYB$NkC75p7g@db.acvmkigubzldhpyrlail.supabase.co:5432/postgres


NEXT_PUBLIC_SUPABASE_URL=https://acvmkigubzldhpyrlail.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_L1s9t3fOGkDDFGWuX_sIEw_MqgQ5a89


```

**Give me:** The Project URL and anon key (safe to share, it's public)

---

## Blocking Item 2: Run Database Migration

**Why blocking:** Tables don't exist yet

### Steps:
1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the ENTIRE contents of: `lumina/supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click "Run" (or Cmd+Enter)
6. Should see "Success. No rows returned"

**Give me:** Confirmation it ran successfully (or any errors)

---

## Blocking Item 3: Enable Google OAuth (Optional but Recommended)

**Why blocking:** Google login won't work without this

### Steps:
1. Go to https://console.cloud.google.com
2. Create a new project (or use existing)
3. Go to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth Client ID**
5. Choose "Web application"
6. Add Authorized redirect URI:
   ```
   https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback - give the correct link to me and i will add it.
   ```
7. Copy the **Client ID** and **Client Secret**
8. In Supabase dashboard, go to **Authentication > Providers**
9. Enable Google and paste the credentials

**Give me:** Confirmation it's enabled (or skip this - magic link still works) 

---

## Blocking Item 4: Create Environment Files

**Why blocking:** Apps won't connect to Supabase without these

### Create these files:

**File 1:** `lumina/apps/web/.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**File 2:** `lumina/apps/desktop/.env`
```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

**Give me:** Confirmation files are created (don't share the actual keys in chat)

---

## Blocking Item 5: Test Desktop Camera Access

**Why blocking:** Need to know if MediaPipe works on your machine

### Steps:
1. Open terminal in `lumina/` folder
2. Run:
   ```bash
   pnpm dev:desktop
   ```
3. Grant camera permission when prompted
4. Tell me what you see:
   - Does the app window open?
   - Do you see camera preview?
   - Any errors in terminal?

**Give me:** Screenshot or description of what happens

---

## Quick Summary Checklist

```
[ ] 1. Create Supabase project → Give me URL + anon key
[ ] 2. Run SQL migration → Confirm success
[ ] 3. Enable Google OAuth → Confirm or skip
[ ] 4. Create .env files → Confirm created
[ ] 5. Test pnpm dev:desktop → Tell me what happens
```

---

## What I Can Do After You Complete These

Once you give me the Supabase credentials and confirm the migration:

1. **Wire up real authentication** in login/join pages
2. **Replace mock data** with real Supabase queries
3. **Test and debug** the desktop camera integration
4. **Implement sync** between desktop and cloud
5. **Polish the UI** and fix any issues

---

## Time Estimate

| Task | Your Time |
|------|-----------|
| Supabase setup | 5 min |
| Run migration | 2 min |
| Google OAuth | 10 min (optional) |
| Create .env files | 2 min |
| Test desktop app | 5 min |
| **Total** | **~25 min** |

---

## If You Hit Errors

### Migration fails
- Copy the exact error message
- Usually it's a syntax issue or missing extension

### Desktop app won't start
- Run `pnpm install` first if you haven't
- Check Node.js version is 20+
- Share the terminal error output

### Camera permission denied
- Check Windows Settings > Privacy > Camera
- Make sure Electron is allowed

---

**Just reply with the Supabase URL + anon key when ready, and I'll continue!**
