# Lumina - Remaining Work

**Date:** December 19, 2024
**Status:** MVP Structure Complete, Integration Pending

---

## Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Monorepo + Packages | DONE | 100% |
| Phase 2: Electron Desktop App | DONE | 90% |
| Phase 3: Auth & Sync | PARTIAL | 40% |
| Phase 4: Admin Dashboard | DONE | 85% |
| Phase 5: Alerts & Baseline | PARTIAL | 30% |
| Phase 6: Polish & Package | NOT STARTED | 0% |

**Overall: ~60% complete**

---

## What's Done

### Fully Complete
- Monorepo structure (Turborepo + pnpm)
- All shared packages (@lumina/core, @lumina/ui, @lumina/api)
- Supabase schema with RLS policies
- Electron app structure (3 windows, IPC, tray)
- Next.js dashboard UI (all pages with mock data)
- TypeScript compilation passes

### Partially Complete
- Blink detection logic (algorithm done, not tested with real camera)
- Auth flow (UI done, Supabase integration TODO)
- Sync system (SyncQueue class done, not wired up)
- Alert engine (logic done, not integrated)

---

## Remaining Work by Priority

### Priority 1: Critical Path (Must Have for Demo)

#### 1.1 Supabase Setup
```
[ ] Create Supabase project
[ ] Run migration script (001_initial_schema.sql)
[ ] Enable Google OAuth provider
[ ] Configure magic link email templates
[ ] Get API keys and add to .env files
```

#### 1.2 Wire Up Authentication
```
Files to modify:
- apps/web/src/app/login/page.tsx
- apps/web/src/app/join/page.tsx
- apps/web/src/middleware.ts
- apps/desktop/src/main/index.ts (for desktop auth)

Tasks:
[ ] Replace mock auth with real Supabase calls
[ ] Implement magic link flow
[ ] Implement Google OAuth flow
[ ] Handle auth state persistence
[ ] Add logout functionality
[ ] Test org join flow with invite codes
```

#### 1.3 Connect Dashboard to Real Data
```
Files to modify:
- apps/web/src/app/(dashboard)/dashboard/page.tsx
- apps/web/src/app/(dashboard)/admin/page.tsx
- apps/web/src/app/(dashboard)/admin/employees/page.tsx
- apps/web/src/app/(dashboard)/admin/alerts/page.tsx

Tasks:
[ ] Replace all mockData with Supabase queries
[ ] Implement real-time updates with Supabase Realtime
[ ] Add loading states
[ ] Add error handling
[ ] Implement data refresh
```

#### 1.4 Test Electron Camera + MediaPipe
```
Tasks:
[ ] Run desktop app and verify camera access
[ ] Test MediaPipe FaceLandmarker initialization
[ ] Verify blink detection works in real-time
[ ] Test EAR threshold calibration
[ ] Debug any platform-specific issues (Windows/Mac)
```

---

### Priority 2: Core Features (Important)

#### 2.1 Desktop-to-Cloud Sync
```
Files to modify:
- apps/desktop/src/main/index.ts
- packages/api/src/sync.ts

Tasks:
[ ] Initialize SyncQueue on app start
[ ] Implement periodic sync (every 5 minutes)
[ ] Handle offline queueing
[ ] Implement conflict resolution
[ ] Add sync status indicator in UI
[ ] Test sync reliability
```

#### 2.2 Alert System Integration
```
Files to modify:
- apps/desktop/src/renderer/hub/App.tsx
- packages/core/src/alerts/engine.ts

Tasks:
[ ] Wire AlertEngine to blink detection stream
[ ] Implement cooldown tracking
[ ] Show alerts in overlay window
[ ] Persist alert acknowledgments
[ ] Sync alerts to cloud
[ ] Test alert triggering conditions
```

#### 2.3 Baseline Calibration Flow
```
Files to modify:
- apps/desktop/src/renderer/hub/App.tsx
- packages/core/src/baseline/calibration.ts

Tasks:
[ ] Add onboarding flow for new users
[ ] Implement 2-hour calibration period
[ ] Calculate and store P25/P50/P75 percentiles
[ ] Update alert thresholds based on baseline
[ ] Allow manual recalibration
[ ] Show calibration progress in UI
```

#### 2.4 Charts with Real Data
```
Files to modify:
- packages/ui/src/components/BlinkRateChart.tsx
- apps/web/src/app/(dashboard)/dashboard/page.tsx

Tasks:
[ ] Connect Recharts to real wellness_data
[ ] Implement time range selection (day/week/month)
[ ] Add loading/empty states
[ ] Optimize for large datasets
[ ] Add export to CSV/PDF
```

---

### Priority 3: Admin Features (Nice to Have)

#### 3.1 Admin Notifications
```
Tasks:
[ ] Email notifications for critical alerts
[ ] In-app notification bell with real data
[ ] Slack/Teams webhook integration (optional)
[ ] Daily/weekly summary emails
```

#### 3.2 Employee Management
```
Tasks:
[ ] Bulk invite via CSV upload
[ ] Role assignment (admin/manager/employee)
[ ] Department management
[ ] Deactivate/remove employees
[ ] View employee's desktop app status
```

#### 3.3 Analytics & Reports
```
Tasks:
[ ] Team wellness trends over time
[ ] Department comparison charts
[ ] Individual improvement tracking
[ ] Exportable PDF reports
[ ] Scheduled report generation
```

---

### Priority 4: Polish & Production (Final)

#### 4.1 Desktop App Packaging
```
Tasks:
[ ] Create app icons (ico, icns, png)
[ ] Configure electron-builder for Windows
[ ] Configure electron-builder for macOS
[ ] Code signing setup (Windows/Mac)
[ ] Auto-updater implementation
[ ] Create installer/DMG
[ ] Test on clean machines
```

#### 4.2 Web Deployment
```
Tasks:
[ ] Deploy to Vercel
[ ] Configure custom domain
[ ] Set up environment variables in Vercel
[ ] Enable Vercel Analytics
[ ] Set up error monitoring (Sentry)
```

#### 4.3 Security Hardening
```
Tasks:
[ ] Audit RLS policies
[ ] Rate limiting on API routes
[ ] Input validation everywhere
[ ] CORS configuration
[ ] CSP headers review
[ ] Penetration testing
```

#### 4.4 Performance Optimization
```
Tasks:
[ ] Profile MediaPipe CPU usage
[ ] Optimize SQLite queries
[ ] Lazy load dashboard components
[ ] Image optimization
[ ] Bundle size analysis
```

#### 4.5 Testing
```
Tasks:
[ ] Unit tests for core package
[ ] Integration tests for API
[ ] E2E tests for web dashboard
[ ] Manual QA checklist
[ ] Cross-browser testing
[ ] Accessibility audit (WCAG)
```

---

## Estimated Effort

| Category | Tasks | Est. Hours |
|----------|-------|------------|
| Supabase Setup | 5 | 2-3 |
| Auth Integration | 6 | 4-6 |
| Dashboard Data | 5 | 6-8 |
| Camera Testing | 5 | 3-4 |
| Sync System | 6 | 6-8 |
| Alert Integration | 6 | 4-6 |
| Baseline Flow | 6 | 4-6 |
| Charts | 5 | 4-6 |
| Admin Features | 12 | 12-16 |
| Packaging | 7 | 8-12 |
| Deployment | 5 | 3-4 |
| Security | 6 | 4-6 |
| Performance | 4 | 4-6 |
| Testing | 6 | 8-12 |
| **Total** | **84** | **68-103 hours** |

---

## Recommended Next Steps (In Order)

### Day 1: Supabase + Auth
1. Create Supabase project
2. Run migration
3. Wire up login page to real auth
4. Test auth flow end-to-end

### Day 2: Desktop Testing
1. Run `pnpm dev:desktop`
2. Debug camera/MediaPipe issues
3. Verify blink detection works
4. Test local SQLite storage

### Day 3: Connect Data
1. Replace mock data with Supabase queries
2. Test dashboard with real user
3. Implement basic sync

### Day 4: Alerts + Polish
1. Wire alert engine
2. Test alert flow
3. Basic styling fixes
4. Demo preparation

---

## Files That Need Modification

### High Priority (Auth + Data)
```
apps/web/src/app/login/page.tsx          # Real Supabase auth
apps/web/src/app/join/page.tsx           # Real org join flow
apps/web/src/app/(dashboard)/dashboard/page.tsx  # Real data
apps/web/src/app/(dashboard)/admin/page.tsx      # Real data
apps/web/src/app/(dashboard)/admin/employees/page.tsx
apps/web/src/app/(dashboard)/admin/alerts/page.tsx
apps/desktop/src/renderer/hub/App.tsx    # Camera integration
apps/desktop/src/main/index.ts           # Sync initialization
```

### Medium Priority (Features)
```
packages/core/src/alerts/engine.ts       # Alert integration
packages/core/src/baseline/calibration.ts
packages/api/src/sync.ts                 # Sync implementation
packages/ui/src/components/BlinkRateChart.tsx
```

### Low Priority (Polish)
```
apps/desktop/package.json               # Build config
apps/web/next.config.ts                 # Production optimizations
Various component styling tweaks
```

---

## Environment Variables Needed

### apps/web/.env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### apps/desktop/.env
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
```

---

## Questions to Resolve

1. **Desktop Auth Flow**: How should users log in on desktop?
   - Option A: OAuth redirect to system browser
   - Option B: In-app webview login
   - Option C: Device code flow

2. **Offline Handling**: How long should desktop work offline?
   - Current design: Queue locally, sync when online
   - Need to decide max queue size

3. **Privacy Mode Enforcement**: When privacy=anonymous, should admins see individual names in alerts?
   - Current: Yes, alerts show names
   - Alternative: Anonymize alert subjects too

4. **Calibration Period**: Is 2 hours enough for baseline?
   - Could be configurable per org
   - Or use industry averages as starting point

---

## Risk Areas

| Risk | Mitigation |
|------|------------|
| MediaPipe performance on low-end machines | Add CPU/GPU toggle, reduce frame rate |
| Glasses causing false negatives | Single-eye fallback, confidence thresholds |
| Alert fatigue | Cooldowns, smart scheduling, user preferences |
| Sync conflicts | Last-write-wins with timestamps |
| Camera permission denial | Clear UX for re-requesting permission |

---

## Definition of "MVP Ready"

Minimum for a working demo:
- [ ] User can sign up and join org
- [ ] Desktop app detects blinks from webcam
- [ ] Data syncs to cloud
- [ ] Admin can see team dashboard
- [ ] Alerts trigger and display
- [ ] Basic settings work

Nice to have for demo:
- [ ] Polished UI animations
- [ ] Email notifications
- [ ] Packaged installer
- [ ] Multiple users simultaneously
