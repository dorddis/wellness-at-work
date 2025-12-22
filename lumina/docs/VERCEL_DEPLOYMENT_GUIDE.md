# Vercel Deployment Guide

## What We're Deploying

- **Web Dashboard** (`apps/web`) → Vercel
- **Desktop App** (`apps/desktop`) → GitHub Releases (later)

---

## Step 1: Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select `dorddis/wellness-at-work`
4. Configure the project:

| Setting | Value |
|---------|-------|
| **Root Directory** | `lumina` |
| **Framework Preset** | Other |
| **Build Command** | `pnpm build:web` |
| **Output Directory** | `apps/web/.next` |
| **Install Command** | `pnpm install` |

5. Add Environment Variables:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://acvmkigubzldhpyrlail.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdm1raWd1YnpsZGhweXJsYWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNDI0ODIsImV4cCI6MjA4MTcxODQ4Mn0.K9qSjNvjl1Nmro06J5pDbWaWK3jcSGWOgigxe35fZ0k` |

6. Click **Deploy**

---

## Step 2: Disable Authentication (if 401 error)

If you see a 401 Unauthorized error when visiting the site:

1. Go to your Vercel project dashboard
2. Settings → General → **Vercel Authentication**
3. Toggle OFF "Vercel Authentication" for Production
4. Redeploy

---

## Step 3: Custom Domain (Optional)

1. Go to Settings → Domains
2. Add your domain (e.g., `app.lumina.ai`)
3. Follow DNS configuration instructions

---

## What's Already Done

| Task | Status |
|------|--------|
| Supabase Storage bucket (`releases`) | Done |
| GitHub Secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`) | Done |
| `.vercelignore` to exclude large files | Done |
| `vercel.json` config | Done |
| Download page (`/download`) | Done |
| GitHub Actions workflow (`.github/workflows/release.yml`) | Done |

---

## Files Created

```
lumina/
├── vercel.json                    # Vercel config
├── .vercelignore                  # Excludes desktop app, caches
├── apps/web/src/app/download/
│   ├── page.tsx                   # Download page
│   ├── DownloadButtons.tsx        # Platform-aware buttons
│   └── loading.tsx                # Loading skeleton
└── docs/
    └── VERCEL_DEPLOYMENT_GUIDE.md # This file

.github/
└── workflows/
    └── release.yml                # Auto-build desktop app
```

---

## Later: Connect Desktop Releases

Once Vercel is working, to enable the download page:

1. **Create a release tag:**
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. **GitHub Actions will:**
   - Build Windows + macOS installers
   - Upload to Supabase Storage (`releases` bucket)
   - Update `releases` table with download URLs

3. **Download page will show:**
   - Buttons linking to Supabase Storage URLs
   - Version info from database

---

## Troubleshooting

### Build fails with "No Next.js detected"
- Make sure Root Directory is set to `lumina`
- Framework Preset should be "Other" (not Next.js)

### Build fails with "File size exceeded"
- The `.vercelignore` should exclude large files
- If still failing, check for files >100MB in the repo

### 401 Unauthorized on production URL
- Disable Vercel Authentication in project settings

### Environment variables not working
- Make sure they start with `NEXT_PUBLIC_`
- Redeploy after adding env vars
