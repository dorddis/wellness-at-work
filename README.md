# Wellness at Work AI - Assignment

## Company
Singapore startup - computer vision for screen wellness (eye tracking)

## Contact
- Ishaan Gupta (ishaan@wellnessatwork.ai)
- Mehul Bhardwaj

## Assignment
Build Windows + Mac application for eye/blink tracking wellness.

## Our Approach: WellnessGuard
Transform their simple blink counter into a full **AI Wellness Coach for Knowledge Workers**.

### What They Asked For
- Blink counter with PyQt
- Cloud sync
- Web dashboard
- GDPR compliance

### What We're Building
- **Multi-detection engine**: Blinks + Posture + Fatigue + Emotions
- **Smart AI alerts**: Context-aware wellness notifications
- **Wellness scoring**: Daily 0-100 score with breakdown
- **Offline-first**: Works without internet, syncs when connected
- **Professional UI**: Dark theme, system tray, charts

## Architecture Documentation

**Start here:** `ARCHITECTURE_SUMMARY.md` - Executive summary (5 min read)

**Deep dive:**
1. `CRITICAL_CHALLENGES.md` - The 6 challenges that determine success/failure
2. `SCALE_CHALLENGES_FILTERED.md` - The 10 scaling challenges (1K-100K users)
3. `ARCHITECTURE_PROPOSAL.md` - Complete system design (30 min read)
4. `ARCHITECTURE_DIAGRAM.txt` - Visual ASCII diagram

**Original materials:**
- `FEATURE_SPEC.md` - Full feature specification
- `TestCase_ Founding App Developer - Dec '25.pdf` - Original requirements
- `eye-tracker-share/` - Their reference code (79 lines)

## Negotiation
- Ask: 18 LPA cash + equity on top
- Floor: 15 LPA hard cash
- NO 50/50 split - need stability
- Planning own startup in 2 years, 4yr vest is useless

## Tech Stack
- **Desktop**: PyQt6 + MediaPipe + DeepFace
- **Backend**: Supabase (Auth + PostgreSQL + Realtime)
- **Web**: Next.js or React
- **Packaging**: PyInstaller (Win), py2app (Mac)

## Implementation Status
- [ ] Phase 1: Core (blink detection, auth, cloud sync)
- [ ] Phase 2: Features (posture, alerts, wellness score)
- [ ] Phase 3: Polish (web dashboard, packaging, CI/CD)
- [ ] Phase 4: Documentation
