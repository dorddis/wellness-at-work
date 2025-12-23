# Authentication Fix Summary

## Root Cause

The authentication was failing because of a **mismatch between what Supabase sends and what the app expects**:

| What Supabase Sends | What App Expects |
|---------------------|------------------|
| Magic link (clickable URL) | 6-digit OTP code |

When you call `verifyOtp` with `type: 'email'`, it expects a **6-digit numeric code**, not a magic link token.

## The Fix (Required Action)

**You need to change the email template in Supabase Dashboard:**

1. Go to https://supabase.com/dashboard
2. Select your project (`acvmkigubzldhpyrlail`)
3. Navigate to **Authentication > Email Templates**
4. Edit the **"Magic Link"** template
5. Change the template body from a link to show the code:

```html
<h2>Your Login Code</h2>

<p>Enter this code in the Lumina app:</p>

<h1 style="font-size: 32px; letter-spacing: 8px; font-family: monospace;">{{ .Token }}</h1>

<p>This code expires in 1 hour.</p>

<p>If you didn't request this code, you can safely ignore this email.</p>
```

6. Click **Save**

## What I Updated in Code

1. **AuthScreen.tsx** - Reverted to clean 6-digit OTP input UI
   - Shows nice big centered input for the 6-digit code
   - Only accepts numeric input
   - Submit enabled only when 6 digits entered

2. **ipc.ts** - Removed `emailRedirectTo` parameter
   - Added comments explaining the dashboard configuration requirement

## Alternative Approaches (Not Implemented)

For reference, there are other ways to handle desktop auth:

### 1. Deep Link with Token Hash (Complex)
- Requires custom URL protocol registration (`lumina://`)
- Requires modifying email template to use `{{ .TokenHash }}`
- Requires handling protocol in Electron main process
- Only works reliably in production builds, not dev mode

### 2. Server-Generated Magic Link (Most Complex)
- Requires a backend endpoint with service role access
- Uses `supabaseAdmin.auth.admin.generateLink()` to create links
- Extracts `hashed_token` and passes to desktop via deep link
- Reference: [GitHub Discussion #27181](https://github.com/orgs/supabase/discussions/27181)

The 6-digit OTP approach is the **simplest and most reliable** for desktop apps.

## Sources

- [Supabase verifyOtp API](https://supabase.com/docs/reference/javascript/auth-verifyotp)
- [Supabase Passwordless Email Login](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Electron Deep Link Auth Discussion](https://github.com/orgs/supabase/discussions/27181)
- [Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)

## Testing

After updating the email template:
1. Restart the desktop app
2. Enter your email
3. Check your email for the 6-digit code
4. Enter the code in the app
5. Proceed to organization join step
