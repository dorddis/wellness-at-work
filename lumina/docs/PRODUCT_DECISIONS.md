# Lumina Product Decisions

> This document captures every significant product and technical decision made during development.
> Use this for founder presentations, investor demos, and team onboarding.

---

## How to Read This Document

Each decision follows this format:
- **Context:** Why did this question come up?
- **Options Considered:** What alternatives did we evaluate?
- **Decision:** What did we choose?
- **Rationale:** Why this choice?
- **Trade-offs:** What did we give up?

---

## Table of Contents

1. [Architecture Decisions](#architecture-decisions)
2. [Detection & AI Decisions](#detection--ai-decisions)
3. [Privacy Decisions](#privacy-decisions)
4. [UX Decisions](#ux-decisions)
5. [Business Decisions](#business-decisions)

---

# Architecture Decisions

## DEC-001: Electron + TypeScript over Python + PyQt6

**Date:** December 2024

**Context:** Needed cross-platform desktop app with camera access and modern UI.

**Options Considered:**
| Option | Pros | Cons |
|--------|------|------|
| Python + PyQt6 | Fast prototyping, good CV libs | Packaging hell, dated UI, poor DX |
| Electron + TypeScript | Modern UI, npm ecosystem, easy packaging | Larger bundle, memory overhead |
| Tauri + Rust | Small bundle, native perf | Steep learning curve, smaller ecosystem |
| Flutter Desktop | Single codebase mobile+desktop | Immature desktop support |

**Decision:** Electron with TypeScript, Vite, and React.

**Rationale:**
- Turborepo monorepo shares code between desktop app and web dashboard
- MediaPipe has excellent JavaScript/WASM support
- electron-builder handles packaging for Windows/Mac/Linux
- React component library (shadcn/ui) accelerates UI development
- TypeScript catches bugs at compile time

**Trade-offs:**
- ~150MB app bundle (acceptable for enterprise desktop)
- Higher memory baseline (~100MB vs ~50MB for native)

---

## DEC-002: Offline-First with Local SQLite

**Date:** December 2024

**Context:** Enterprise users need the app to work without internet. Also reduces cloud costs.

**Options Considered:**
| Option | Pros | Cons |
|--------|------|------|
| Cloud-only (Supabase) | Simple architecture | Requires internet, latency, cost at scale |
| Local-only (SQLite) | Works offline, free | No cross-device sync, no team analytics |
| Offline-first hybrid | Best of both | More complex sync logic |

**Decision:** Offline-first with SQLite locally, batch sync to Supabase every 5 minutes.

**Rationale:**
- App works 100% offline - critical for enterprise security policies
- Local processing means zero latency for real-time UI
- Aggregated rollups reduce sync payload by 99.8% (minute-level, not frame-level)
- Cloud sync enables web dashboard and team analytics
- Users own their data locally

**Trade-offs:**
- More complex sync conflict resolution
- Need to handle offline queue when connection restored

---

## DEC-003: TimescaleDB for Time-Series Analytics

**Date:** December 2024

**Context:** Wellness data is inherently time-series (blinks per minute, posture over time). Need efficient storage and querying.

**Options Considered:**
| Option | Pros | Cons |
|--------|------|------|
| Regular PostgreSQL | Simple, familiar | Slow for time-range queries at scale |
| TimescaleDB | Hypertables, continuous aggregates, compression | Learning curve |
| InfluxDB | Purpose-built for time-series | Different query language, separate infra |
| ClickHouse | Blazing fast analytics | Overkill, operational complexity |

**Decision:** TimescaleDB (via Supabase extension).

**Rationale:**
- Hypertables auto-partition by time - queries stay fast as data grows
- Continuous aggregates pre-compute rollups (1min, 1hour, 1day)
- 90%+ compression on historical data
- Still just PostgreSQL - familiar SQL, works with Supabase
- Retention policies auto-delete raw data after 7 days

**Trade-offs:**
- Slightly more complex schema setup
- Need to understand hypertables and continuous aggregates

---

# Detection & AI Decisions

## DEC-004: MediaPipe FaceLandmarker over OpenCV/dlib

**Date:** December 2024

**Context:** Need real-time face detection for blink/posture/yawn tracking.

**Options Considered:**
| Option | Pros | Cons |
|--------|------|------|
| OpenCV Haar Cascades | Lightweight, no ML | Low accuracy, no landmarks |
| dlib 68-point | Good accuracy, well-documented | C++ dependency, slower |
| MediaPipe FaceLandmarker | 478 landmarks, GPU accel, WASM | Google dependency |
| TensorFlow.js BlazeFace | Browser-native | Fewer landmarks, less accurate |

**Decision:** MediaPipe FaceLandmarker via @mediapipe/tasks-vision.

**Rationale:**
- 478 facial landmarks vs 68 (dlib) - more precision for eye/mouth detection
- Runs in WASM - no native dependencies, works in Electron renderer
- GPU acceleration via WebGL when available
- Sub-30ms inference on modern hardware
- Same model works for blink, posture, yawn, and drowsiness detection

**Trade-offs:**
- Google dependency (but model runs fully local)
- Larger initial download (~5MB model)

---

## DEC-005: EAR Algorithm with Kalman Filtering

**Date:** December 2024

**Context:** Basic EAR (Eye Aspect Ratio) works but has noise issues with glasses and reflections.

**Options Considered:**
| Option | Pros | Cons |
|--------|------|------|
| Raw EAR only | Simple | Noisy, false positives with glasses |
| Moving average | Reduces noise | Adds latency, misses fast blinks |
| Kalman filter | Optimal noise reduction, preserves fast changes | More complex |
| ML blink classifier | Potentially more accurate | Training data needed, black box |

**Decision:** EAR with Kalman filtering + spike detection + per-eye quality tracking.

**Rationale:**
- Kalman filter optimally balances noise reduction vs responsiveness
- Spike detection catches reflection artifacts (sudden EAR jumps)
- Per-eye quality tracking handles glasses (use better eye when one is occluded)
- Dynamic threshold calibration adapts to individual users
- Interpretable algorithm - we can explain exactly how it works

**Trade-offs:**
- More tuning parameters to get right
- Slightly higher CPU usage (negligible)

---

## DEC-006: NO Emotion Detection

**Date:** December 2024

**Context:** Considered adding emotion/sentiment detection using facial expressions.

**Options Considered:**
| Option | Pros | Cons |
|--------|------|------|
| Add emotion detection | More "insights", differentiator | Privacy nightmare, legal risk, inaccurate |
| Skip emotion detection | Privacy-first, focused product | Less "features" to market |

**Decision:** Explicitly NOT implementing emotion detection. This is a non-goal.

**Rationale:**

1. **Privacy & Trust Destruction**
   - We position as "privacy-first" - emotion tracking is surveillance
   - "Your employer knows when you're frustrated" is dystopian
   - Enterprises will reject it - HR/legal won't approve

2. **Legal & Regulatory Risk**
   - EU AI Act classifies workplace emotion AI as HIGH-RISK
   - Requires conformity assessments, bias audits, transparency
   - Some jurisdictions (Illinois BIPA) may ban it entirely

3. **Technical Inaccuracy**
   - Facial expression ≠ internal emotion
   - Resting face ≠ angry, forced smile ≠ happy
   - Cultural bias in expression interpretation
   - Industry accuracy ~60-70% - worse than coin flip for nuance

4. **Product Focus**
   - We measure PHYSIOLOGICAL wellness: blink rate, posture, fatigue
   - These are objective, measurable, actionable
   - Emotions are subjective interpretation - not our domain

5. **Competitive Positioning**
   - "We DON'T track your emotions" is a feature, not a bug
   - Differentiates us from creepy surveillance tools

**Trade-offs:**
- Can't market "AI emotion insights" (good - we don't want to)
- Some users might ask for it (educate on why it's harmful)

**What We Do Instead:**
Physiological signals that indicate engagement/wellbeing without interpreting emotions:
- Low blink rate → deep focus OR eye strain (user decides which)
- Yawn frequency → fatigue indicator
- PERCLOS → drowsiness metric
- Posture slumping → potential disengagement

---

## DEC-007: Meeting Mode via Screen Capture

**Date:** December 2024

**Context:** Enterprise users spend 30-50% of workday in video meetings. Camera is locked by Zoom/Teams/Meet.

**Options Considered:**
| Option | Pros | Cons |
|--------|------|------|
| Pause during meetings | Simple | App useless 4+ hours/day |
| Virtual camera driver | Seamless, full quality | Requires admin install, OS-specific |
| Screen capture self-view | Works with any app, no install | Lower resolution, needs calibration |
| Browser extension | Direct video access | Only works for web-based meetings |

**Decision:** Screen capture of user's self-view preview (Phase 1), with virtual camera as future enhancement (Phase 3).

**Rationale:**
- Screen capture works TODAY with any meeting app
- No special permissions beyond what Electron already has
- User calibrates once per app (draw box around self-view)
- 10 FPS capture is sufficient for blink detection
- Reuses 100% of existing MediaPipe pipeline

**Trade-offs:**
- Lower resolution than direct camera (but sufficient)
- Requires one-time calibration per meeting app
- Fails if user hides self-view (edge case)

---

## DEC-008: Posture Detection via Face Landmarks Only

**Date:** December 2024

**Context:** Need posture detection but want to minimize complexity.

**Options Considered:**
| Option | Pros | Cons |
|--------|------|------|
| MediaPipe Pose (full body) | Shoulder/spine detection | Requires body in frame, higher CPU |
| Separate posture hardware | Accurate | Extra cost, friction |
| Face landmarks only | Already have them, no extra CPU | Limited to head/face posture |

**Decision:** Use face landmarks for posture (distance, tilt, lean).

**Rationale:**
- We already run FaceLandmarker - zero additional CPU cost
- Face position reveals: too close, too far, head tilt, forward lean
- 90% of "bad posture" at a computer involves head/neck position
- No need for shoulders in frame - less intrusive

**Trade-offs:**
- Can't detect slouching spine/shoulders directly
- But head position is a good proxy (slouching = head forward)

---

# Privacy Decisions

## DEC-009: 100% On-Device Processing

**Date:** December 2024

**Context:** Users are concerned about camera data being sent to cloud.

**Decision:** ALL computer vision runs locally. Zero frames leave the device.

**Implementation:**
- MediaPipe WASM runs in Electron renderer process
- Raw frames never written to disk
- Only aggregated metrics sync to cloud (blinks per minute, not images)
- Visual indicator shows "Camera: Local Only" in UI

**Rationale:**
- Enterprise security policies often block cloud camera processing
- GDPR/privacy compliance is simpler with local-only
- Eliminates "is someone watching me?" anxiety
- Faster - no network latency

---

## DEC-010: Opt-In Everything

**Date:** December 2024

**Context:** Balance between useful defaults and user control.

**Decision:** All detection features are opt-in with clear explanations.

**Implementation:**
- First launch: explain what we detect and why
- Each feature (blink, posture, yawn) can be disabled independently
- Camera permission requested with clear rationale
- "What data do we collect?" always one click away

---

# UX Decisions

## DEC-011: System Tray First, Window Second

**Date:** December 2024

**Context:** App needs to run continuously but shouldn't be intrusive.

**Decision:** App lives in system tray. Main window is optional.

**Implementation:**
- Minimize to tray, not taskbar
- Tray icon shows status (green=good, yellow=warning, gray=paused)
- Click tray → quick stats popup
- Right-click → full menu
- Main window for detailed analytics only

---

## DEC-012: Alert Fatigue Prevention

**Date:** December 2024

**Context:** Users will disable app if it nags too much.

**Decision:** Smart alerting with cooldowns, context-awareness, and respect for focus.

**Implementation:**
- 10-15 minute cooldowns between similar alerts
- No alerts during detected flow state (declining blink rate)
- Calendar integration pauses alerts during meetings
- Max 2 postpones, then alert silently logs and backs off
- Acknowledge rate tracking - if user ignores, reduce frequency

---

# Business Decisions

## DEC-013: B2B Enterprise Focus over Consumer

**Date:** December 2024

**Context:** Could target consumers or enterprises.

**Decision:** B2B enterprise first, consumer later.

**Rationale:**
- Enterprise: higher LTV, team licenses, HR budget
- Consumer: crowded market, hard to monetize wellness
- Enterprise features (SSO, dashboard, compliance) are moats
- Can always add consumer tier later

---

## DEC-014: Freemium Model

**Date:** December 2024

**Context:** How to price the product.

**Decision:** Free tier for individuals, paid for teams.

**Structure:**
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | All detection, 7-day history, local only |
| Pro | $5/user/mo | Cloud sync, 1-year history, web dashboard |
| Team | $8/user/mo | Admin dashboard, team analytics, SSO |
| Enterprise | Custom | Dedicated support, on-prem option, SLA |

---

# Future Decisions (To Be Made)

- [ ] Mobile companion app - yes/no?
- [ ] Smartwatch integration - Apple Watch, Garmin?
- [ ] Slack/Teams bot for break reminders?
- [ ] API for third-party integrations?
- [ ] White-label option for enterprises?

---

# Decision Template

Copy this for new decisions:

```markdown
## DEC-XXX: [Decision Title]

**Date:** [Month Year]

**Context:** [Why did this question come up?]

**Options Considered:**
| Option | Pros | Cons |
|--------|------|------|
| Option A | ... | ... |
| Option B | ... | ... |

**Decision:** [What we chose]

**Rationale:** [Why this choice?]

**Trade-offs:** [What we gave up]
```

---

*Last updated: December 2024*
