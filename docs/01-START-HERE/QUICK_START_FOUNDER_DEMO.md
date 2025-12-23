# Quick Start - Founder Demo

**Goal:** Present Lumina to investors/co-founders in 20 minutes.

---

## Pre-Demo Setup (5 minutes)

### 1. Install & Run Demo Mode

```bash
cd lumina
pnpm install
pnpm dev:desktop
```

**What you get:**
- ✅ Realistic 14 days of wellness data
- ✅ 4/9 achievements unlocked
- ✅ Active streaks (5-day daily use)
- ✅ Real-time blink detection working

### 2. Prepare Your Talking Points

Read [Founder Demo Package](../FOUNDER_DEMO_PACKAGE.md) (15 min) for:
- Market opportunity ($150M TAM)
- Technical differentiation (MediaPipe, 99.8% data reduction)
- Business model ($0.0006/user/month at scale)
- Solved critical challenges (glasses, lighting, privacy, baselines)

---

## Demo Flow (20 minutes)

### Part 1: The Problem (2 min)

**Setup:** Show [Competitor Analysis](../02-PRODUCT/COMPETITOR_ANALYSIS.md) table

**Script:**
> "Eye strain is the #1 computer-related health complaint. 75% of knowledge workers experience it. Existing solutions are consumer-focused ($30/year apps like BLiiNK AI) or wearables (Upright Go at $100). **No true B2B solution exists** for enterprises managing 500-50K employees."

**Key stats:**
- 150M knowledge workers globally (desk-based, 6+ hours/day screen time)
- $2K/year productivity loss per employee (McKinsey)
- 30-50% of workday in video meetings (camera is "owned" by Zoom)

---

### Part 2: The Solution (5 min)

**Demo 1: Real-time Blink Detection**

1. Open Lumina desktop app
2. Allow camera access
3. **Point to live blink counter** updating in real-time
4. Blink 10 times rapidly → Counter increments
5. **Show wellness score** (85-92 range, green/yellow/red indicators)

**Script:**
> "MediaPipe Face Landmarks tracks 478 points at 30 FPS. We calculate Eye Aspect Ratio (EAR) every 33ms. When EAR < 0.18 for 2+ frames = blink detected. **100% on-device** - no images leave your computer."

**Demo 2: Meeting Mode (CRITICAL DIFFERENTIATOR)**

1. Open Zoom/Teams test meeting
2. **Show notification:** "Meeting detected - calibrate self-view?"
3. Click "Calibrate" → Draw box around your face preview
4. **Show detection continuing** during meeting
5. End meeting → Camera switches back automatically

**Script:**
> "This solves the 30-50% problem. During meetings, Zoom owns the camera. We screen-capture your self-view preview instead. Same 30 FPS detection, same accuracy. **No other wellness tool works in meetings.**"

**Why this matters for B2B:**
- Enterprises spend 4+ hours/day in video calls
- Without meeting mode, product is useless during peak strain hours
- Zoom fatigue + eye strain compound each other

---

### Part 3: Enterprise Features (3 min)

**Demo 3: Gamification & Engagement**

1. Click "Achievements" → Show 4/9 unlocked (First Steps, Perfect Day, Blink Master, Early Bird)
2. **Show streaks:** Daily Use (5 days), Healthy Eyes (3 hours)
3. **Show historical charts** (14 days of data)

**Script:**
> "Alert fatigue kills adoption. We use gamification instead of constant interruptions. Streaks, achievements, progress tracking. Users WANT to open the dashboard."

**Demo 4: Admin Dashboard (B2B Value)**

1. Open http://localhost:3000
2. Show team wellness score (aggregated)
3. **Show department comparison chart** (Engineering 78%, Sales 85%)
4. **Show alert inbox** (admin sees who needs support)

**Script:**
> "HR sees aggregated trends, not individual surveillance. Privacy-preserving multi-tenancy with Row Level Security. GDPR compliant - data export, deletion, consent tracking all built-in."

---

### Part 4: Technical Differentiation (5 min)

**Show:** [Architecture Overview](../03-ARCHITECTURE/ARCHITECTURE_OVERVIEW.md) diagrams

**Key points:**

1. **Offline-First Design**
   - 100% on-device computer vision (MediaPipe)
   - SQLite stores raw events locally
   - Syncs minute rollups only (99.8% data reduction)
   - **Privacy win:** No images, no raw blinks, just aggregates

2. **Scalability Architecture**
   - Raw: 2.6M blink events/user/day
   - Rollups: 1,440 rows/user/day (60-second buckets)
   - TimescaleDB continuous aggregates for admin dashboards
   - **Result:** Query 30 rows, not 2.6M rows

3. **Cost Economics**
   - $0/month for 0-250 users (Supabase free tier)
   - $0.0006/user/month at 100K users (self-hosted)
   - **60x cheaper** than typical SaaS benchmarks ($0.04/user/month)

**Script:**
> "This isn't a webcam recording tool with post-processing. It's a real-time CV pipeline with aggressive data reduction. We can afford to charge $2-5/user/month and still have 80% gross margins."

---

### Part 5: Solved Critical Challenges (3 min)

**Show:** [Critical Challenges](../02-PRODUCT/CRITICAL_CHALLENGES.md) checklist

**Walk through the 9/9:**

| # | Challenge | Our Solution |
|---|-----------|--------------|
| 1 | **Glasses** (75% users) | MediaPipe confidence filter + single-eye fallback |
| 2 | **Lighting** (100% users) | Adaptive frame processing, works backlit/low-light |
| 3 | **Alert fatigue** | Gamification + cooldowns + flow detection |
| 4 | **Privacy perception** | 100% on-device CV, visual "no recording" indicator |
| 5 | **Baseline calibration** | Auto-calibrate 2hr using P25/P50/P75 percentiles |
| 6 | **Flow interruption** | Detect via declining blink rate, queue alerts |
| 7 | **Meeting Mode** | Screen-capture self-view (THE killer feature for B2B) |
| 8 | **Posture Detection** | Face landmarks for distance/tilt/lean |
| 9 | **Yawn & Drowsiness** | MAR + PERCLOS algorithms |

**Script:**
> "We didn't build an MVP and hope. We identified the 9 make-or-break problems FIRST, then designed solutions for each. These are the Pareto 20% that deliver 80% of the value."

**Emphasize Meeting Mode:**
> "Challenge #7 is the B2B moat. Consumer apps can't do this - they target individual users working solo. Enterprises NEED meeting mode because that's where burnout happens."

---

### Part 6: Business Model & Market (2 min)

**Positioning:**
- **Target:** Mid-market enterprises (500-5K employees)
- **Channel:** Direct sales + HR wellness platforms (Wellhub, Virgin Pulse)
- **Pricing:** $3-5/user/month (vs $0.0006 cost = 83-94% gross margin)

**Competitors:**
- BLiiNK AI: $30/year consumer app (no B2B, no meeting mode)
- Stretchly, WorkRave: Free timers (no detection, just reminders)
- Upright Go: $100 wearable (posture only, high friction)

**Our moat:**
1. Meeting mode (technical barrier - screen capture + CV pipeline)
2. Offline-first architecture (privacy + cost advantage)
3. Solved critical challenges (glasses, lighting, calibration)
4. GDPR compliance (enterprise requirement, not consumer nice-to-have)

**TAM:**
- 150M knowledge workers (desk-based, 6+ hours/day)
- At $4/user/month = $7.2B annual market
- **Serviceable:** 10M users (mid-market focus) = $480M ARR potential

---

## Post-Demo Q&A Prep

**Common questions:**

**Q: "Why not just use API calls to existing tools?"**
A: BLiiNK AI has no API. Existing CV APIs (Google Vision, Azure) cost $1.50/1K images = $4K/month/user at 30 FPS. Our on-device approach costs $0.

**Q: "What about false positives (glasses, lighting)?"**
A: Auto-calibration solves this. We measure YOUR baseline over 2 hours, not a population average. P25/P50/P75 percentiles adapt to individual physiology.

**Q: "How do you handle privacy concerns?"**
A: 100% on-device CV. No images leave the device, ever. Admins see aggregates only (team avg: 15 blinks/min), not individuals. GDPR data export/deletion built-in.

**Q: "Can users game the system?"**
A: Yes, but why would they? No punitive metrics, only wellness support. If someone tapes a photo to their webcam, they're only hurting themselves. HR doesn't see individual data anyway.

**Q: "What's the technical risk?"**
A: MediaPipe is Google-maintained (used in Google Meet, YouTube). Electron has 10M+ production users (Slack, VS Code, Discord). Tech stack is proven at scale.

**Q: "Why not sell to consumers first?"**
A: Unit economics don't work. Consumer apps charge $2-3/month, need 1M+ users to be profitable. B2B contracts are $10K-100K ARR from day one, with predictable revenue.

**Q: "What's the go-to-market?"**
A: Direct sales to HR/wellness teams at Series A+ startups (500-2K employees). Pilot 50 users for 3 months, expand on results. Integrate with existing wellness platforms (Wellhub, Virgin Pulse) for distribution.

---

## Next Steps After Demo

**If interested:**

1. **Technical deep-dive:** Share [Architecture Decision](../03-ARCHITECTURE/ARCHITECTURE_DECISION.md) doc
2. **Pilot proposal:** 50-100 users, 3-month trial, $2/user/month
3. **Roadmap discussion:** See [Feature Roadmap](../02-PRODUCT/FEATURE_ROADMAP.md)

**If skeptical:**

1. Offer to run POC on their team (free for 30 days)
2. Share [User Research](../02-PRODUCT/USER_RESEARCH/) findings
3. Connect with reference customer (if available)

---

## Materials to Share

**Slide deck alternative:** [Founder Demo Package](../FOUNDER_DEMO_PACKAGE.md) (self-contained, can be read in 15 min)

**Technical materials:**
- [Architecture Overview](../03-ARCHITECTURE/ARCHITECTURE_OVERVIEW.md) - 10 min read
- [Cost Analysis](../06-BUSINESS/COST_ANALYSIS.md) - Detailed economics
- [GDPR Compliance](../04-IMPLEMENTATION/GDPR_COMPLIANCE.md) - Legal requirements

**Product materials:**
- [Critical Challenges](../02-PRODUCT/CRITICAL_CHALLENGES.md) - The 9 problems we solved
- [Competitor Analysis](../02-PRODUCT/COMPETITOR_ANALYSIS.md) - Market landscape

---

**Ready to present?** Review [Founder Demo Package](../FOUNDER_DEMO_PACKAGE.md) for full talking points.
