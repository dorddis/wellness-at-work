# Deployment Guide - Lumina

**Last Updated:** December 24, 2025
**Status:** Production-ready
**Source:** Extracted from session logs + implementation experience

---

## Quick Start

**Prerequisites:**
- Node.js 18+
- pnpm 8+
- Supabase account (free tier works for 0-250 users)
- Google Cloud Console account (for OAuth)

**Build & Run:**
```bash
cd lumina
pnpm install
pnpm build           # Build all packages
pnpm dev             # Run desktop + web in dev mode
pnpm dev:desktop     # Desktop app only
pnpm dev:web         # Web dashboard only
```

---

## Environment Setup

### 1. Supabase Project Setup

**Create Project:**
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: "Lumina" (or your choice)
4. Database Password: (save securely)
5. Region: Choose closest to your users
6. Wait ~2 minutes for provisioning

**Run Migrations:**
```bash
cd lumina/supabase/migrations

# Apply initial schema (4 tables with RLS)
psql -h your-project.supabase.co -U postgres -d postgres -f 001_initial_schema.sql

# Apply new features (7 additional tables)
psql -h your-project.supabase.co -U postgres -d postgres -f 002_new_features.sql
```

**Verify Tables:**
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

**Expected tables:**
- organizations
- org_members
- wellness_data
- org_alerts
- break_events
- eye_exercises
- exercise_sessions
- team_challenges
- challenge_participants
- integrations
- member_details (view)

---

### 2. Google OAuth Configuration

**Step 1: Get Credentials**
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID (or use existing):
   - Application type: Web application
   - Name: "Lumina Web"
3. Save Client ID and Client Secret

**Step 2: Configure Authorized URLs**
1. Under "Authorized JavaScript origins", add:
   ```
   http://localhost:3000
   https://your-domain.com
   ```

2. Under "Authorized redirect URIs", add:
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```

**Step 3: Enable in Supabase**
1. Go to Supabase Dashboard → Authentication → Providers
2. Find **Google** and click to expand
3. Toggle **Enable Sign in with Google** to ON
4. Enter Client ID and Client Secret
5. Click **Save**

**Test OAuth:**
```bash
# Start web app
cd lumina/apps/web
pnpm dev

# Navigate to http://localhost:3000/login
# Click "Continue with Google"
# Should redirect to Google login
```

---

### 3. Environment Variables

**Web App** (`apps/web/.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Optional: Demo mode
VITE_DEMO_MODE=false
VITE_BYPASS_AUTH=false
```

**Desktop App** (`apps/desktop/.env`):
```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Development flags
VITE_DEMO_MODE=false
VITE_BYPASS_AUTH=false
```

**Get Supabase Keys:**
1. Go to Supabase Dashboard → Settings → API
2. Copy "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**IMPORTANT:** Never commit `.env.local` or `.env` files with real credentials to git.

---

## Desktop App Packaging

### Windows (NSIS Installer)

**Prerequisites:**
- Windows 10+ or Windows Server 2016+
- Visual Studio Build Tools (for better-sqlite3 native compilation)

**Build Commands:**
```bash
cd lumina/apps/desktop

# Development build
pnpm dev

# Production build
pnpm build             # TypeScript compilation
pnpm package           # Creates installer in release/

# Output:
# release/Lumina Setup 0.1.5.exe (~150MB)
```

**electron-builder Config** (`apps/desktop/package.json`):
```json
{
  "build": {
    "appId": "com.lumina.desktop",
    "productName": "Lumina",
    "electronVersion": "39.2.7",
    "win": {
      "target": "nsis"
    },
    "nsis": {
      "oneClick": false,
      "perMachine": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

**Common Issues:**

**Issue: better-sqlite3 compilation fails**
```bash
# Solution: Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/
# Select "C++ build tools" workload
```

**Issue: Installer not signed, Windows Defender blocks**
```bash
# Solution: Code signing certificate required for production
# See "Code Signing" section below
```

---

### macOS (DMG)

**Prerequisites:**
- macOS 10.15+ (Catalina or later)
- Xcode Command Line Tools
- Apple Developer account (for notarization)

**Build Commands:**
```bash
cd lumina/apps/desktop

# Production build
pnpm build
pnpm package

# Output:
# release/Lumina-0.1.5.dmg (~140MB)
```

**electron-builder Config** (`apps/desktop/package.json`):
```json
{
  "build": {
    "mac": {
      "target": "dmg",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "notarize": false
    },
    "afterSign": "scripts/notarize.js"
  }
}
```

**Entitlements File** (`build/entitlements.mac.plist`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.device.camera</key>
  <true/>
</dict>
</plist>
```

**Notarization (Production Only):**
```bash
# Set environment variables
export APPLE_ID="your-apple-id@email.com"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="your-team-id"

# Build with notarization
pnpm package
```

**Common Issues:**

**Issue: "Lumina.app is damaged and can't be opened"**
```bash
# Solution: App not notarized. Temporarily bypass:
xattr -cr /Applications/Lumina.app
```

**Issue: Camera permission not requested**
```bash
# Solution: Add to Info.plist (handled by Electron automatically)
# Verify entitlements.mac.plist includes camera permission
```

---

### Code Signing

**Windows (SignTool):**
```bash
# Get code signing certificate from:
# - DigiCert, Sectigo, or other CA
# - Cost: ~$200-500/year

# Sign installer
signtool sign /f certificate.pfx /p password /tr http://timestamp.digicert.com Lumina-Setup.exe
```

**macOS (Apple Developer Certificate):**
```bash
# Prerequisites:
# 1. Enroll in Apple Developer Program ($99/year)
# 2. Create Developer ID Application certificate
# 3. Download and install in Keychain

# electron-builder will auto-sign with certificate in Keychain
```

**Testing Signed Build:**
```bash
# Windows
signtool verify /pa Lumina-Setup.exe

# macOS
codesign --verify --deep --strict --verbose=2 Lumina.app
spctl -a -vvv -t install Lumina.app
```

---

## Release Hosting (Cloudflare R2)

**Status:** Production-ready (December 24, 2025)

The repository is **private**. Desktop installers are hosted on Cloudflare R2 for public downloads.

### Architecture

```
GitHub Actions (private repo)
        │
        ▼
   Build Windows + macOS installers
        │
        ▼
   Upload to Cloudflare R2 bucket
        │
        ├── /releases/v1.0.0/Lumina-Setup-1.0.0.exe
        ├── /releases/v1.0.0/Lumina-1.0.0-arm64.dmg
        ├── /latest.yml (Windows auto-update manifest)
        └── /latest-mac.yml (macOS auto-update manifest)
        │
        ▼
   Update Supabase `releases` table with URLs
        │
        ▼
   Website reads from Supabase → displays R2 download links
```

### R2 Configuration

**Bucket:** `lumina-releases`
**Public URL:** `https://pub-e3da78107a3f4e5c9db5419df773c20f.r2.dev`
**Access:** Public read, private write

### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET` | Bucket name (`lumina-releases`) |
| `R2_PUBLIC_URL` | Public URL for downloads |

### Triggering a Release

```bash
# Option 1: Git tag (recommended for production)
git tag v1.0.0
git push origin v1.0.0

# Option 2: Manual workflow dispatch
gh workflow run release.yml -f version=1.0.0
```

### Auto-Updates

The desktop app uses `electron-updater` with generic provider:

```json
{
  "build": {
    "publish": [{
      "provider": "generic",
      "url": "https://pub-e3da78107a3f4e5c9db5419df773c20f.r2.dev"
    }]
  }
}
```

Auto-updater checks `/latest.yml` (Windows) or `/latest-mac.yml` (macOS) for new versions.

### Cost

| Component | Monthly Cost |
|-----------|--------------|
| Storage (~500MB) | ~$0.01 |
| Egress | **$0** (R2 free egress) |
| Total | ~$0.01/month |

---

## Web Dashboard Deployment (Vercel)

### Option 1: Vercel Deployment (Recommended)

**Prerequisites:**
- Vercel account (free tier works)
- GitHub repository

**Deploy Steps:**

1. **Push to GitHub:**
```bash
git add .
git commit -m "feat: production build ready"
git push origin main
```

2. **Connect to Vercel:**
- Go to https://vercel.com/new
- Import your GitHub repository
- Root Directory: `lumina/apps/web`
- Framework Preset: Next.js
- Click "Deploy"

3. **Environment Variables in Vercel:**
- Go to Project Settings → Environment Variables
- Add:
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://YOUR_PROJECT_ID.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `YOUR_ANON_KEY`
- Save and redeploy

4. **Custom Domain (Optional):**
- Go to Project Settings → Domains
- Add your domain (e.g., `app.lumina.io`)
- Configure DNS as instructed by Vercel

**Deployment Time:** ~2-3 minutes for initial deploy

---

### Option 2: Self-Hosted (VPS)

**Prerequisites:**
- VPS with Node.js 18+ (DigitalOcean, AWS, GCP, etc.)
- Nginx or Apache for reverse proxy
- SSL certificate (Let's Encrypt recommended)

**Build & Deploy:**
```bash
# On local machine
cd lumina/apps/web
pnpm build

# Output: .next/ directory

# Upload to VPS
scp -r .next/ user@your-vps:/var/www/lumina-web/

# On VPS
cd /var/www/lumina-web
pnpm install --production
pnpm start  # Runs on port 3000
```

**Nginx Config** (`/etc/nginx/sites-available/lumina`):
```nginx
server {
    listen 80;
    server_name app.lumina.io;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**SSL with Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d app.lumina.io
```

**PM2 for Process Management:**
```bash
npm install -g pm2
pm2 start npm --name "lumina-web" -- start
pm2 save
pm2 startup  # Auto-restart on reboot
```

---

## Database Deployment Considerations

### RLS Policies Verification

**Check Policies:**
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

**Expected Policies:**
- `wellness_data`: User can only see own data
- `org_alerts`: User can only see own organization's alerts
- `org_members`: User can only see own organization's members
- `organizations`: User can only see own organization

**Test RLS:**
```sql
-- As regular user (should only see own data)
SELECT * FROM wellness_data;

-- Should return only current user's rows
```

---

### Data Retention Policy

**Supabase Free Tier:**
- 500 MB database storage
- 1 GB file storage
- 2 GB bandwidth

**Retention Strategy:**
```sql
-- Delete old raw events (keep rollups only)
DELETE FROM wellness_data
WHERE timestamp < NOW() - INTERVAL '90 days'
  AND is_rollup = false;

-- Archive old alerts
DELETE FROM org_alerts
WHERE created_at < NOW() - INTERVAL '180 days'
  AND acknowledged = true;
```

**Automated Cleanup (pg_cron):**
```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule weekly cleanup
SELECT cron.schedule(
  'weekly-cleanup',
  '0 2 * * 0',  -- Every Sunday at 2 AM
  $$
  DELETE FROM wellness_data
  WHERE timestamp < NOW() - INTERVAL '90 days';
  $$
);
```

---

## Monitoring & Observability

### Error Tracking (Sentry - Optional)

**Install:**
```bash
cd lumina/apps/web
pnpm add @sentry/nextjs

cd lumina/apps/desktop
pnpm add @sentry/electron
```

**Configure** (`apps/web/sentry.client.config.ts`):
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

---

### Analytics (Vercel Analytics)

**Install:**
```bash
cd lumina/apps/web
pnpm add @vercel/analytics
```

**Add to Layout** (`apps/web/src/app/layout.tsx`):
```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## Performance Optimization

### Desktop App

**Reduce Bundle Size:**
```bash
# Check bundle size
npx vite-bundle-visualizer

# Optimize MediaPipe loading
# Load FaceLandmarker on-demand, not at startup
```

**SQLite Optimization:**
```typescript
// Enable WAL mode (already done)
db.pragma('journal_mode = WAL');

// Increase cache size (10MB)
db.pragma('cache_size = -10000');

// Synchronous = NORMAL for better performance
db.pragma('synchronous = NORMAL');
```

---

### Web Dashboard

**Next.js Optimizations:**

**Image Optimization** (`next.config.ts`):
```typescript
const config = {
  images: {
    domains: ['YOUR_PROJECT_ID.supabase.co'],
    formats: ['image/webp'],
  },
};
```

**Lazy Loading:**
```typescript
// Lazy load heavy components
const AdminAnalytics = dynamic(() => import('./admin/analytics/page'), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});
```

**React Query for Data Caching:**
```bash
pnpm add @tanstack/react-query
```

```typescript
// apps/web/src/app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

---

## Security Hardening

### Content Security Policy

**Add to** `apps/web/next.config.ts`:
```typescript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      connect-src 'self' https://YOUR_PROJECT_ID.supabase.co;
    `.replace(/\s{2,}/g, ' ').trim()
  }
];

const config = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
```

---

### Rate Limiting (Upstash Redis)

**Install:**
```bash
pnpm add @upstash/ratelimit @upstash/redis
```

**Configure** (`apps/web/src/middleware.ts`):
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return new Response('Too Many Requests', { status: 429 });
  }

  return NextResponse.next();
}
```

---

## Deployment Checklist

### Pre-Production

- [ ] All tests passing (`pnpm test`)
- [ ] TypeScript compilation successful (`pnpm typecheck`)
- [ ] No console errors in browser/desktop
- [ ] Environment variables set correctly
- [ ] Supabase migrations applied
- [ ] RLS policies verified
- [ ] Google OAuth configured
- [ ] Demo mode disabled (`VITE_DEMO_MODE=false`)
- [ ] Auth bypass disabled (`VITE_BYPASS_AUTH=false`)

---

### Production Deployment

**Web Dashboard:**
- [ ] Deployed to Vercel (or VPS)
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Environment variables set in Vercel
- [ ] Sentry error tracking enabled (optional)
- [ ] Analytics enabled (optional)

**Desktop App:**
- [ ] Windows installer built and tested
- [ ] macOS DMG built and tested
- [ ] Code signed (Windows SignTool, macOS notarization)
- [ ] Auto-updater configured (optional)
- [ ] Installer tested on clean machines

**Database:**
- [ ] Supabase project on paid tier (if >250 users)
- [ ] Database backups enabled
- [ ] Retention policy configured
- [ ] Monitoring alerts set up

---

### Post-Deployment

- [ ] E2E test on production environment
- [ ] Performance monitoring enabled
- [ ] Error tracking verified
- [ ] User feedback collection ready
- [ ] Support documentation available
- [ ] Rollback plan documented

---

## Deployment Learnings (From Session Logs)

### Week 1 (Dec 19, 2024)

**Database Migration:**
- Applied `001_initial_schema.sql` successfully in 2-3 minutes
- RLS policies enabled without issues
- Helper functions (`get_user_org`, `is_org_admin`) work correctly

**Google OAuth:**
- Initial error: "Unsupported provider: provider is not enabled"
- Solution: Enable Google in Supabase Dashboard → Authentication → Providers
- Required adding `http://localhost:3000` to Google Console authorized origins
- Supabase callback URL must be added to authorized redirect URIs

**Desktop Auth Implementation:**
- OTP flow more reliable than OAuth redirect for desktop
- 6-digit code email arrives within 30 seconds
- Session persistence required electron-store (initially missing)
- Auth gate prevents camera initialization until logged in (good UX)

---

### Week 2 (Dec 20, 2024)

**MVP Demo Blockers:**
- Dead buttons caused confusion → Added toast notifications for all actions
- Employee list showing "--" → Real Supabase data integration required
- Join page fake verification → Needed real org slug lookup
- Invite code regeneration not persisting → Added immediate DB save

**GDPR Implementation:**
- Export data function downloads JSON successfully
- Account deletion with 30-day grace period works
- Soft delete implemented (marked with `deleted_at` timestamp)

---

### December 22, 2025

**New Features Deployment:**
- Migration `002_new_features.sql` added 7 tables successfully
- Eye exercises added to desktop app (feature parity with web)
- 600+ lines added to `queries.ts` without breaking existing code

---

### December 23, 2025

**Package Updates:**
- Next.js 15.1.0 → 15.1.11 critical security fix applied
- Electron 33.2.0 → 39.2.7 (6 major versions) without breaking changes
- Recharts 2.15.0 → 3.6.0 (major version) required code updates
- Total install time: 1m 41.6s

**Key Lessons:**
- Always update packages regularly to avoid vulnerabilities
- Test after major version updates (Recharts 3.x has breaking changes)
- CVE monitoring essential (Next.js RCE vulnerability had CVSS 10.0)

---

## Troubleshooting

### Common Deployment Issues

**Issue: "Cannot connect to Supabase"**
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Verify Supabase project is active
curl https://YOUR_PROJECT_ID.supabase.co/rest/v1/
```

**Issue: "Google OAuth redirect loop"**
```bash
# Clear browser cookies and localStorage
# Verify authorized redirect URIs in Google Console match exactly
# Check Supabase callback URL configuration
```

**Issue: "Desktop app camera access denied"**
```bash
# Windows: Settings → Privacy → Camera → Allow apps
# macOS: System Preferences → Security & Privacy → Camera → Check Lumina
```

**Issue: "Electron build fails on better-sqlite3"**
```bash
# Install Visual Studio Build Tools (Windows)
# Or rebuild native modules:
pnpm rebuild better-sqlite3 --force
```

**Issue: "Vercel build fails"**
```bash
# Check build logs for specific error
# Verify all dependencies in package.json
# Ensure Next.js config is valid:
pnpm build  # Test locally first
```

---

## Related Documentation

- [E2E Verification Guide](../08-TESTING/E2E_VERIFICATION.md) - Testing before deployment
- [Development Timeline](../06-BUSINESS/DEVELOPMENT_TIMELINE.md) - Deployment milestones
- [Architecture Overview](../03-ARCHITECTURE/ARCHITECTURE_OVERVIEW.md) - System design
- [GDPR Compliance](lumina/docs/GDPR_COMPLIANCE.md) - Data handling requirements

---

**Status:** Production-ready deployment guide based on actual implementation experience.
