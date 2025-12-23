# Product Vision - Lumina

**Status:** Active | Last Updated: Dec 23, 2025

---

## Vision Statement

**Lumina is the first B2B AI wellness platform that works during video meetings** - the 4+ hours/day when existing tools fail.

We use on-device computer vision to detect eye strain, poor posture, and fatigue in real-time, then deliver personalized wellness interventions through gamification instead of interruptions.

**Our moat:** Meeting mode via screen capture + offline-first architecture + solved critical challenges (glasses, lighting, privacy).

---

## The Problem We Solve

### Primary Problem: Eye Strain During Knowledge Work

**Scale:**
- **75% of computer users** experience Computer Vision Syndrome (CVS)
- **150M knowledge workers** globally spend 6+ hours/day on screens
- **$2,000/year productivity loss** per employee (McKinsey)

**Symptoms:**
- Dry eyes, blurred vision, headaches
- Neck/shoulder pain from poor posture
- Mental fatigue from prolonged focus
- Reduced productivity (30% drop after 2 hours without breaks)

**Why existing solutions fail:**

| Solution Type | Example | Why It Fails |
|---------------|---------|--------------|
| **Consumer apps** | BLiiNK AI ($30/year) | No B2B offering, no admin dashboards, individual-focused |
| **Wearables** | Upright Go ($100) | High friction, only posture, no meeting support |
| **Free timers** | Stretchly, WorkRave | No detection, just generic reminders (users ignore) |
| **Manual tracking** | Spreadsheets, journals | Requires discipline, no real-time feedback |

**The 30-50% gap:** Enterprises spend 30-50% of workday in video meetings. During meetings:
- Zoom/Teams/Meet "owns" the webcam
- Existing wellness apps can't access camera
- **Users have ZERO wellness support during peak strain hours**

**This is our wedge into B2B.**

---

## Our Solution

### Core Value Proposition

**For HR/Wellness Leaders:**
> "Reduce eye strain and boost productivity for your remote team with AI-powered wellness monitoring that works during video meetings - without invading privacy."

**For Individual Users:**
> "Your personal wellness coach that tracks blinks, posture, and breaks in real-time - even during Zoom calls - and helps you build healthy habits through achievements and streaks."

### How It Works

**1. Real-Time Computer Vision (100% On-Device)**
- MediaPipe Face Landmarks tracks 478 points at 30 FPS
- Eye Aspect Ratio (EAR) detects blinks (<100ms latency)
- Mouth Aspect Ratio (MAR) detects yawns
- Face position tracks posture (distance, tilt, lean)
- PERCLOS measures drowsiness (eye closure percentage)

**Why on-device matters:**
- Privacy: No images leave the computer
- Cost: $0 inference vs $4K/month for cloud CV APIs
- Latency: 10ms local vs 200-500ms cloud roundtrip
- Offline: Works without internet

**2. Meeting Mode (THE Differentiator)**
- Detects active video meetings (Zoom, Teams, Meet, Google Meet)
- User calibrates self-view preview once per app
- Screen captures self-view region at 30 FPS
- Runs same CV pipeline on captured frames
- **Result:** Continuous wellness monitoring during 4+ hours/day of meetings

**Why no one else has this:**
- Requires Electron/native access to screen capture APIs
- Web apps can't screen-capture (browser security)
- Consumer apps don't prioritize enterprise meeting workflows

**3. Gamification Over Interruptions**
- Achievements: 9 unlockable badges (First Steps, Perfect Day, Blink Master)
- Streaks: Daily Use, Healthy Eyes, Break Master, Good Posture
- Progress Dashboard: 14-day history, wellness score trends
- Challenges: Weekly goals with team leaderboards (planned)

**Why gamification matters:**
- Alert fatigue kills adoption (users disable nagging apps)
- Positive reinforcement > punishment
- Social proof drives behavior change (team challenges)
- Visible progress creates habit loops

**4. Offline-First Data Architecture**
- SQLite stores raw events locally (24-hour retention)
- Minute rollups aggregated every 60s (1,440/day/user)
- 5-minute batch sync to Supabase (500 records/batch)
- **99.8% data reduction:** 2.6M raw events → 1,440 rollups

**Why this matters for B2B:**
- Privacy: Aggregates only, no raw blink data in cloud
- Cost: $0.0006/user/month at 100K users (vs $0.04 industry avg)
- Compliance: GDPR data export/deletion trivial (local DB)
- Reliability: Works offline, syncs when reconnected

**5. Enterprise Admin Dashboard**
- Team wellness score (aggregated, not individual surveillance)
- Department comparisons (Engineering vs Sales vs Marketing)
- Alert inbox for HR (who needs wellness support)
- Trend analysis (are interventions working?)
- **Multi-tenant with Row Level Security** (data isolation enforced at DB level)

---

## Market Opportunity

### Target Customer

**Primary:** Mid-market enterprises (500-5,000 employees)
- Remote-first or hybrid teams
- Knowledge workers (engineering, sales, customer support)
- HR/wellness teams with budget ($50K-500K/year wellness spend)

**Why mid-market:**
- Faster sales cycles than enterprise (3-6 months vs 12-18 months)
- Budget for wellness ($100-300K/year typical)
- Less procurement friction than Fortune 500
- Agile enough to pilot new tools

**Secondary:** Startups (50-500 employees)
- Post-Series A funding (have HR budget)
- Remote-first culture (value wellness tools)
- Tech-forward (early adopters)

**Why startups:**
- Fast decision-making (2-4 weeks)
- Strong referral potential (founders talk to founders)
- Growth trajectory (50 → 500 employees in 2 years)

### Market Size (TAM/SAM/SOM)

**TAM (Total Addressable Market):**
- 150M knowledge workers globally (desk-based, 6+ hours/day screens)
- At $4/user/month = **$7.2B annual market**

**SAM (Serviceable Addressable Market):**
- 10M users in mid-market enterprises (500-5K employees)
- Focus: US, EU, APAC (Singapore, Australia)
- At $4/user/month = **$480M ARR potential**

**SOM (Serviceable Obtainable Market):**
- 100K users in Year 1-2 (200 companies × 500 employees avg)
- At $3/user/month = **$3.6M ARR**

**Path to $10M ARR:**
- Year 1: 100K users @ $3/user/month = $3.6M
- Year 2: 300K users @ $4/user/month = $14.4M (assume 50% churn, net 200K retained + 100K new)

---

## Competitive Positioning

### Direct Competitors

**BLiiNK AI** (Consumer app, $30/year)
- ✅ Similar CV-based detection
- ❌ No B2B offering, no admin dashboards
- ❌ No meeting mode
- ❌ Individual pricing (no enterprise contracts)

**Our advantage:** B2B focus, meeting mode, 10x cheaper at scale.

**Stretchly / WorkRave** (Free open-source timers)
- ✅ Reminder system works
- ❌ No detection (just timers)
- ❌ Users ignore generic reminders
- ❌ No analytics, no admin view

**Our advantage:** Real-time detection, personalized baselines, admin insights.

**Upright Go** ($100 wearable)
- ✅ Posture detection works
- ❌ Only posture, no eye strain
- ❌ High friction (wear device daily)
- ❌ No software platform

**Our advantage:** All-in-one (eyes + posture + breaks), zero hardware.

### Indirect Competitors

**Wellness platforms** (Wellhub, Virgin Pulse, Gympass)
- Focus: Gym memberships, mental health apps, fitness challenges
- **Not competing:** They lack computer vision wellness tools
- **Partnership opportunity:** Integrate Lumina as "screen time wellness" module

**Productivity tools** (RescueTime, Toggl)
- Focus: Time tracking, productivity analytics
- **Not competing:** No physiological detection
- **Complementary:** Our data could enhance their "break time" insights

---

## Business Model

### Pricing Strategy

**Tier 1: Starter (50-250 users)**
- $5/user/month
- Annual contract ($3,000-15,000 ARR)
- Self-serve onboarding
- Email support

**Tier 2: Growth (250-1,000 users)**
- $4/user/month
- Annual contract ($12,000-48,000 ARR)
- Dedicated onboarding
- Priority support + Slack channel

**Tier 3: Enterprise (1,000+ users)**
- $3/user/month
- Multi-year contract ($36,000+ ARR)
- Custom integrations (SSO, HRIS)
- Account manager + quarterly business reviews

**Freemium (Individual use):**
- Free: 1 user, 7-day history, basic features
- Pro: $3/month, unlimited history, achievements, no limits
- **Purpose:** Viral growth (individuals bring to workplace)

### Unit Economics

**Cost per user/month:**
- $0.0006 at 100K users (Supabase self-hosted)
- $0.003 at 10K users (Supabase Pro)
- $0.025 at 1K users (Supabase Pro + storage)

**Gross margin:**
- Tier 1 ($5/user): 99.5% margin
- Tier 2 ($4/user): 99.3% margin
- Tier 3 ($3/user): 99.0% margin

**CAC (Customer Acquisition Cost):**
- Direct sales: $15,000/customer (500 user avg = $30 CAC/user)
- Self-serve: $500/customer (100 user avg = $5 CAC/user)

**LTV (Lifetime Value):**
- Assume 3-year retention, $4/user/month avg
- LTV = 36 months × $4 = $144/user
- **LTV:CAC ratio:** 144:30 = 4.8:1 (target >3:1 ✅)

---

## Product Roadmap

### Shipped (Current - v1.0)

**Tier 1 (Core):**
- ✅ Real-time blink detection (EAR algorithm)
- ✅ Meeting mode (screen capture self-view)
- ✅ Offline-first SQLite + Supabase sync
- ✅ Gamification (achievements, streaks)
- ✅ Admin dashboard (team analytics)
- ✅ GDPR compliance (export, deletion)
- ✅ Onboarding flow (6-step guided setup)
- ✅ Posture detection (distance, tilt, lean)
- ✅ Yawn & drowsiness detection (MAR, PERCLOS)

**Status:** Production-ready MVP, all critical challenges solved.

### Planned (Next 6 months)

**Tier 2 (Engagement):**
- 🔵 Team challenges (weekly goals, leaderboards)
- 🔵 Break exercises (eye yoga, neck stretches)
- 🔵 Calendar integration (respect meeting schedules)
- 🔵 Slack notifications (daily wellness summary)
- 🔵 Mobile companion app (iOS/Android, view-only)

**Tier 3 (Enterprise):**
- 🔵 SSO integration (Okta, Azure AD)
- 🔵 HRIS sync (BambooHR, Workday)
- 🔵 Custom branding (white-label for large customers)
- 🔵 API access (integrate with existing wellness platforms)
- 🔵 Advanced analytics (predictive burnout, team health score)

---

## Success Metrics

### User Engagement

**Target (Month 1):**
- 70% daily active users (DAU/MAU)
- 50% enable camera (privacy concern)
- 30% complete onboarding

**Target (Month 3):**
- 85% DAU/MAU
- 75% enable camera
- 60% have 7+ day streak

### Business Metrics

**Year 1 (100K users):**
- $3.6M ARR ($3/user/month avg)
- 200 customers (500 users avg)
- 80% gross margin
- <30% churn rate

**Year 2 (300K users):**
- $14.4M ARR ($4/user/month avg)
- 400 customers (750 users avg)
- 85% gross margin
- <20% churn rate

### Wellness Impact

**Target (Month 6):**
- 20% increase in blink rate (from baseline)
- 30% reduction in posture alerts
- 50% of users take 3+ breaks/day
- 4.5+ NPS score

---

## Strategic Priorities

### 2025 Focus

**1. Meeting Mode Adoption**
- Measure: 50% of users calibrate self-view
- Why: This is our moat - no one else has it
- Risk: Users don't understand value, skip calibration

**2. Enterprise Pilots**
- Target: 5 pilots (500-1K users each) by Q2 2025
- Why: Validate B2B pricing, gather case studies
- Risk: Sales cycle longer than expected (6+ months)

**3. Product-Market Fit**
- Measure: 40%+ users say "very disappointed" if product went away (PMF survey)
- Why: Proves we're solving real pain
- Risk: Alert fatigue kills engagement

**4. GDPR & Security**
- Target: SOC 2 Type I certification by Q4 2025
- Why: Enterprise requirement, competitive advantage
- Risk: Audit costs $50K+, time-intensive

---

## Long-Term Vision (3-5 years)

**Phase 1 (Current):** Desktop app for individual users + admin dashboard
**Phase 2 (2026):** Mobile companion app, team challenges, integrations
**Phase 3 (2027):** Wellness platform (API, marketplace, white-label)

**Endgame:** Lumina becomes the "operating system" for workplace wellness:
- Employers integrate once, data flows to all wellness vendors
- We're the single source of truth for screen time health metrics
- Network effects: More users → Better baselines → More accurate detection

**Exit scenarios:**
1. **Acquisition by wellness platform** (Wellhub, Virgin Pulse) - $50-100M
2. **Acquisition by collaboration tool** (Zoom, Microsoft Teams) - $100-200M
3. **Acquisition by HR tech** (Workday, BambooHR) - $200-500M
4. **IPO** (if we hit $100M ARR) - $1B+ valuation at 10x ARR

---

## Related Documentation

- **Critical Challenges:** [9 make-or-break problems we solved](CRITICAL_CHALLENGES.md)
- **Feature Roadmap:** [Complete feature status](FEATURE_ROADMAP.md)
- **Market Analysis:** [Competitor landscape](COMPETITOR_ANALYSIS.md)
- **User Research:** [Insights from 6 research docs](USER_RESEARCH/)
- **Business Model:** [Detailed cost analysis](../06-BUSINESS/COST_ANALYSIS.md)
- **Architecture:** [Technical design decisions](../03-ARCHITECTURE/ARCHITECTURE_OVERVIEW.md)

---

**Status Legend:**
- ✅ Complete - Shipped in production
- 🔵 Planned - Roadmap confirmed
- 🟡 Exploring - Research phase
