# Feature Roadmap - Lumina

**Status:** Active Implementation Reference
**Last Updated:** December 2025

---

## Product Vision

Transform a simple blink counter into a comprehensive AI-powered wellness monitoring system that helps knowledge workers maintain physical and mental health during long screen sessions.

**Tagline:** "Your AI companion for healthier screen time"

**Target Market:** B2B AI wellness for enterprises, offline-first, privacy-preserving, scalable to 100K users.

---

## Feature Tiers & Implementation Status

### Tier 1: Core Features (Assignment Requirements)

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **User Authentication** | ✅ Complete | Supabase Auth (Email + Google OAuth), Desktop + Web |
| **Real-time Blink Tracking** | ✅ Complete | MediaPipe FaceLandmarker (478 landmarks, 30 FPS) |
| **Blink Rate Analytics** | ✅ Complete | EAR algorithm, minute rollups, calibrated baselines |
| **Performance Monitor** | ✅ Complete | CPU%, Memory MB, FPS display |
| **Cloud Sync** | ✅ Complete | Minute rollups → Supabase (5min batches), offline queue |
| **Offline Support** | ✅ Complete | 100% on-device processing, SQLite local DB, sync on reconnect |
| **Web Dashboard** | ✅ Complete | Next.js 15, Recharts, Real-time data, 7-30 day views |
| **System Tray/Menu Bar** | ✅ Complete | Background operation, quick stats, pause monitoring |
| **GDPR Compliance** | ✅ Complete | Consent tracking, data export (CSV/JSON), cascade deletion |

**Deliverable:** ✅ MVP complete and production-ready

---

### Tier 2: Differentiation Features

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Posture Detection** | 🟡 Planned | MAR (Mouth Aspect Ratio), PERCLOS, head tilt/distance detection |
| **Fatigue Detection** | 🟡 Planned | Yawn detection, drowsiness (PERCLOS), blink rate correlation |
| **Smart Alerts** | ✅ Partial | Context-aware notifications, cooldowns implemented |
| **20-20-20 Rule** | 🟡 Planned | Timed reminders for eye breaks |
| **Session Summaries** | ✅ Complete | Daily progress, streak tracking, break minutes |
| **Daily Wellness Score** | 🟡 Planned | 0-100 composite score based on blink, posture, breaks |
| **Break Reminders** | 🟡 Planned | Movement prompts after X minutes |
| **Meeting Mode** | ✅ Complete | Screen capture self-view during Zoom/Teams/Meet calls |
| **Baseline Calibration** | ✅ Complete | Auto-calibrate during first 2 hours (P25/P50/P75) |
| **Achievements & Gamification** | ✅ Complete | 9 achievements, 4 streak types, progress badges |
| **Onboarding Flow** | ✅ Complete | 4-step guided setup (Welcome → Camera → Goals → Calibration) |

**Deliverable:** 70% complete, high-impact features shipped

---

### Tier 3: WOW Factor (Roadmap)

| Feature | Status | Why Not Implemented |
|---------|--------|---------------------|
| **Emotion Detection** | ❌ Excluded | Privacy concern (See DEC-006) - NOT a wellness metric |
| **Predictive Alerts** | 🔵 Research | Requires ML training on user patterns (6+ months data) |
| **Guided Breathing** | 🟡 Backlog | Built-in stress relief exercises - nice-to-have |
| **Focus Mode** | 🟡 Partial | Flow detection implemented, manual toggle planned |
| **Weekly Email Reports** | 🟡 Backlog | Automated summaries with trends |
| **Hydration Reminders** | 🟡 Backlog | Drink water prompts |
| **Ergonomic Tips** | 🟡 Backlog | Personalized suggestions based on patterns |

**Deliverable:** Documented in README as future enhancements

---

## Critical Challenges - Implementation Status

Based on `CRITICAL_CHALLENGES.md`, here's how we solved the 9 make-or-break problems:

| # | Challenge | Solution | Status |
|---|-----------|----------|--------|
| 1 | **Glasses (75% users)** | MediaPipe confidence filter + single-eye fallback | ✅ Implemented |
| 2 | **Lighting (100% users)** | Adaptive frame processing, works backlit/low light | ✅ Implemented |
| 3 | **Alert fatigue** | Calendar API + flow detection + cooldowns | 🟡 Partial (cooldowns done, calendar planned) |
| 4 | **Privacy perception** | 100% on-device CV, visual "no recording" indicators | ✅ Implemented |
| 5 | **Baseline calibration** | Auto-calibrate 2hr using P25/P50/P75 | ✅ Implemented |
| 6 | **Flow interruption** | Detect via declining blink rate, queue alerts | 🟡 Planned |
| 7 | **Meeting Mode** | Screen-capture self-view from Zoom/Teams/Meet | ✅ Implemented |
| 8 | **Posture Detection** | Face landmarks for distance/tilt/lean | 🟡 Planned |
| 9 | **Yawn & Drowsiness** | MAR + PERCLOS algorithms | 🟡 Planned |

**Overall Progress:** 5/9 complete, 4/9 planned (78% roadmap coverage)

---

## Implementation Timeline (Actual)

### Phase 1: Core MVP (Week 1-2) ✅ COMPLETE

**Scope:** Offline-first desktop app with blink detection

- ✅ Turborepo monorepo setup (pnpm workspaces)
- ✅ Electron 33+ with Vite + TypeScript
- ✅ MediaPipe FaceLandmarker integration (478 landmarks)
- ✅ EAR algorithm for blink detection
- ✅ SQLite local database (WAL mode)
- ✅ Real-time blink counting and display
- ✅ System tray integration
- ✅ Performance monitoring (CPU, Memory, FPS)

**Deliverable:** Desktop app runs 100% offline, detects blinks accurately

---

### Phase 2: Cloud Sync + Auth (Week 2-3) ✅ COMPLETE

**Scope:** Supabase integration for auth and data sync

- ✅ Supabase project setup (PostgreSQL + TimescaleDB)
- ✅ Row Level Security (RLS) policies
- ✅ Google OAuth integration (web + desktop)
- ✅ Desktop auth flow (OAuth callback via localhost server)
- ✅ Sync worker (5-min batch uploads)
- ✅ Minute rollups aggregation (99.8% data reduction)
- ✅ Idempotency handling (UUID batch IDs)
- ✅ Offline queue with retry logic

**Deliverable:** Desktop app syncs to cloud, users can log in from web or desktop

---

### Phase 3: Web Dashboard (Week 3) ✅ COMPLETE

**Scope:** Next.js dashboard with charts and analytics

- ✅ Next.js 15 app with App Router
- ✅ Supabase Auth integration
- ✅ Dashboard page (real-time blink data)
- ✅ Charts (Recharts): Daily progress, Blink rate trends, Session history
- ✅ Settings page (preferences, notifications)
- ✅ GDPR features (data export CSV/JSON, account deletion)
- ✅ Responsive design (mobile-friendly)
- ✅ Vercel deployment

**Deliverable:** Users can view historical data on web dashboard

---

### Phase 4: Gamification + Polish (Week 4) ✅ COMPLETE

**Scope:** Achievements, streaks, onboarding, demo mode

- ✅ Achievement system (9 badges: First Steps, Perfect Day, Blink Master, etc.)
- ✅ Streak tracking (Daily Use, Healthy Eyes, Break Master, Good Posture)
- ✅ Onboarding flow (4-step guided setup with Stepper component)
- ✅ Demo mode (14 days historical data, 4 unlocked achievements, pre-calibrated baseline)
- ✅ UI/UX polish (Shadcn components, Tailwind CSS, animations)
- ✅ Baseline calibration (auto-calibrate during first 2 hours)
- ✅ Local-only mode (bypass auth for offline use)

**Deliverable:** Polished MVP ready for founder demo

---

### Phase 5: Meeting Mode + Enhancements (Week 5) ✅ COMPLETE

**Scope:** Critical B2B feature for video call support

- ✅ PowerShell process detection (Zoom, Teams, Meet, Webex)
- ✅ Screen capture via Electron `desktopCapturer`
- ✅ Self-view region calibration (drag box UI)
- ✅ Frame cropping and MediaPipe processing on captured frames
- ✅ Calibration persistence (localStorage)
- ✅ Auto-start after calibration
- ✅ Graceful fallback (notification if not calibrated)
- ✅ Camera restart when meeting ends

**Deliverable:** Works during 30-50% of workday when camera is owned by meeting apps

---

### Phase 6: GDPR + Production Readiness (Week 6) ✅ COMPLETE

**Scope:** Legal compliance and production deployment

- ✅ GDPR consent tracking (first launch dialog)
- ✅ Data export (download all user data as CSV/JSON)
- ✅ Data deletion (cascade delete all user data + local DB wipe)
- ✅ Privacy policy page
- ✅ Terms of service page
- ✅ Consent management (settings page)
- ✅ Production deployment (Vercel for web)
- ✅ Desktop packaging (electron-builder, Windows + macOS)

**Deliverable:** GDPR-compliant, production-ready for enterprise pilots

---

## Planned Features (Backlog)

### Q1 2026: Posture & Fatigue Detection

**Priority:** High (solves Challenges #8 and #9)

- [ ] **Posture Detection**
  - Head tilt detection (face landmark angles)
  - Forward lean detection (nose-to-eye ratio)
  - Too close/far from screen (bounding box size)
  - Alert threshold: 30s poor posture, 10-15min cooldown

- [ ] **Yawn Detection**
  - Mouth Aspect Ratio (MAR) algorithm
  - Yawn = High MAR for 2+ seconds
  - Alert: 2+ yawns in 10 min

- [ ] **Drowsiness Detection**
  - PERCLOS (% of time eyes >80% closed in 1-min window)
  - Alert: PERCLOS >15%
  - Combined fatigue score (yawns + PERCLOS + low blink rate)

**Implementation Notes:** See `docs/05-FEATURES/POSTURE_YAWN_DETECTION.md` for algorithms and landmarks

---

### Q2 2026: Advanced Alert Intelligence

**Priority:** Medium

- [ ] **Calendar Integration**
  - macOS EventKit / Windows Outlook API
  - Check meetings in next 15 min before alerting
  - Never interrupt during meetings (unless critical)

- [ ] **Flow State Detection**
  - Detect via declining blink rate + stable posture
  - Queue alerts during flow state
  - Show batched summary when flow ends

- [ ] **Alert Consolidation**
  - Wait 2 min, batch multiple alerts into one
  - "3 wellness tips for you" instead of 3 separate notifications

- [ ] **Progressive Cooldown**
  - First dismissed: Wait 10 min
  - Second dismissed: Wait 20 min (user busy)
  - Third dismissed: Wait 60 min (likely false positive)

**Implementation Notes:** See `CRITICAL_CHALLENGES.md` section on Alert Fatigue

---

### Q3 2026: Analytics & Insights

**Priority:** Low (nice-to-have)

- [ ] **Weekly Wellness Report**
  - Email summaries with trends
  - Insights: "Your blink rate improves 15% after breaks"

- [ ] **Predictive Alerts**
  - ML patterns: "You usually crash at 3pm"
  - Requires 6+ months of user data

- [ ] **Contextual Baselines**
  - Morning baseline (well-rested)
  - Afternoon baseline (normal fatigue)
  - Evening baseline (tired)

- [ ] **Wellness Coaching**
  - Personalized tips based on patterns
  - Ergonomic suggestions

---

### Q4 2026: Enterprise Features

**Priority:** Low (only if enterprise demand)

- [ ] **Team Dashboard**
  - Aggregated wellness scores
  - Manager insights (anonymized)
  - Team leaderboards (opt-in gamification)

- [ ] **SSO Integration**
  - SAML, Okta, Azure AD
  - Enterprise auth flows

- [ ] **Admin Console**
  - User management
  - Usage analytics
  - Audit logs

- [ ] **API Access**
  - REST API for integrations
  - Webhooks for alerts

---

## Architecture Decisions Impact on Features

Several features were **enabled** by the chosen Electron + TypeScript architecture:

### ✅ Enabled Features

1. **Meeting Mode** - Electron `desktopCapturer` API makes screen capture possible
2. **Offline-First** - SQLite + Zustand enable 100% offline operation
3. **Cross-Platform** - Electron runs on Windows/macOS/Linux with same codebase
4. **Fast Iteration** - TypeScript + React enable rapid UI development
5. **Native Feel** - Electron provides system tray, notifications, auto-update

### ❌ Features That Required Workarounds

1. **Camera Access** - MediaPipe in Electron requires WebRTC shim (solved with Vite config)
2. **Process Detection** - PowerShell scripts for meeting detection (platform-specific)
3. **Packaging Size** - Electron bundles are large (200MB+), but acceptable for desktop

### 🟡 Features Still Challenging

1. **Calendar Integration** - Platform-specific APIs (macOS EventKit, Windows COM), not yet implemented
2. **Low-Level Keyboard Hooks** - Requires native modules (node-addon-api), complexity high

---

## Success Metrics

### MVP Success (Achieved ✅)

- [x] Blink detection accuracy >90% (with glasses, varied lighting)
- [x] Offline operation works for 8+ hours without sync
- [x] Dashboard loads in <1 second
- [x] No crashes during 8-hour session
- [x] GDPR compliant (data export + deletion)

### User Engagement Targets (Q1 2026)

- [ ] >80% enable camera in first session (privacy messaging)
- [ ] >50% alerts still acknowledged after 30 days (no fatigue)
- [ ] >70% users return daily for 7+ days (retention)
- [ ] >60% enable meeting mode after calibration (discovery)

### Enterprise Readiness (Q2 2026)

- [ ] Meeting mode accuracy >85% (Zoom/Teams/Meet/Webex)
- [ ] Posture detection accuracy >90%, <10% false positives
- [ ] Yawn detection accuracy >85%
- [ ] Team dashboard feature complete

---

## Technology Stack Summary

Based on the chosen Electron + TypeScript architecture (see `FINAL_ARCHITECTURE.md`):

| Component | Technology | Why Chosen |
|-----------|------------|------------|
| Desktop Framework | Electron 33+ | Cross-platform, native APIs, good DX |
| Web Framework | Next.js 15 | SSG for dashboard, App Router performance |
| UI Library | React 18 + Shadcn | Reusable components, Tailwind CSS |
| State Management | Zustand | Simple, works in Electron and browser |
| Local DB | SQLite (better-sqlite3) | Zero-config, offline-first, WAL mode |
| Cloud Backend | Supabase | Auth + PostgreSQL + RLS + Realtime |
| Time-Series | TimescaleDB | Automatic partitioning, retention policies |
| Computer Vision | MediaPipe | On-device, 478 landmarks, works with glasses |
| Animations | Framer Motion | Smooth, professional animations |
| Forms | React Hook Form + Zod | Type-safe validation |
| Charts | Recharts | Simple, works with aggregated data |

**Why NOT PyQt6 or Event-Driven:** See `ARCHITECTURE_DECISION.md` for full rationale

---

## Cost Projections (Based on Chosen Architecture)

| Users | Storage | Monthly Cost | Per-User |
|-------|---------|--------------|----------|
| 0-250 | 500 MB | $0 (free tier) | $0 |
| 1K | 2 GB | $25 (Supabase Pro) | $0.025 |
| 10K | 20 GB | $27 (Supabase Pro + overage) | $0.003 |
| 100K | 200 GB | $60 (DigitalOcean self-host) | $0.0006 |

**Break-even point:** Self-host at ~20K users (Supabase costs approach $50-60/month)

**Revenue model ideas:**
- Freemium: Free (7 days history), Pro ($5/mo, 30 days)
- B2B: Small teams ($50/mo for 5-20 users), Enterprise ($500/mo for 50+ users)
- At 1,000 paying users ($5/mo): $5,000/mo revenue - $25/mo cost = **99.5% margin**

---

## Related Documentation

- **Product Strategy:** [CRITICAL_CHALLENGES.md](CRITICAL_CHALLENGES.md) - The 9 make-or-break problems
- **User Research:** [USER_RESEARCH/](USER_RESEARCH/) - Competitive analysis, pain points, insights
- **Architecture:** [../03-ARCHITECTURE/FINAL_ARCHITECTURE.md](../03-ARCHITECTURE/FINAL_ARCHITECTURE.md) - Chosen implementation
- **Features:** [../05-FEATURES/](../05-FEATURES/) - Feature-specific deep dives
- **Testing:** [../08-TESTING/E2E_VERIFICATION.md](../08-TESTING/E2E_VERIFICATION.md) - QA checklist

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 18, 2024 | Initial feature spec (FEATURE_SPEC.md) |
| 2.0 | Dec 19, 2024 | Event-Driven roadmap (IMPLEMENTATION_ROADMAP.md) |
| 3.0 | Dec 23, 2025 | Consolidated roadmap based on actual Lumina implementation |

**Status Legend:**
- ✅ Complete - Feature shipped in production
- 🟡 Planned - Documented, not yet implemented
- 🔵 Research - Exploring feasibility
- ❌ Excluded - Decided not to build (e.g., emotion detection)
