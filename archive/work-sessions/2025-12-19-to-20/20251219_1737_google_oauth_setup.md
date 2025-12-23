# Google OAuth Setup Guide

**Error:** `Unsupported provider: provider is not enabled`

Two things needed:
1. Enable Google in Supabase
2. Add localhost to Google Console

---

## Step 1: Enable Google in Supabase

1. Go to: https://supabase.com/dashboard/project/acvmkigubzldhpyrlail/auth/providers
2. Find **Google** in the list
3. Click to expand
4. Toggle **Enable Sign in with Google** to ON
5. Enter your credentials:
   - **Client ID:** `[REDACTED-CLIENT-ID].apps.googleusercontent.com`
   - **Client Secret:** `[REDACTED-CLIENT-SECRET]`
6. Click **Save**

---

## Step 2: Add URLs in Google Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your project (or the one with the OAuth client)
3. Click on your **OAuth 2.0 Client ID** (Web application)
4. Under **Authorized JavaScript origins**, add:
   ```
   http://localhost:3000
   ```
5. Under **Authorized redirect URIs**, add:
   ```
   https://acvmkigubzldhpyrlail.supabase.co/auth/v1/callback
   ```
6. Click **Save**

---

## After Both Steps

1. Wait 1-2 minutes for Google to propagate changes
2. Refresh http://localhost:3000
3. Click "Continue with Google"
4. Should redirect to Google login

---

## Alternative: Use Magic Link

If you want to skip Google OAuth for now:
1. Enter your email on the login page
2. Click "Send Magic Link"
3. Check your email inbox
4. Click the link to sign in

Magic link works without any additional setup.
