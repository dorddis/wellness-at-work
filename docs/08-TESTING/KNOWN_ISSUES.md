# Known Issues & Limitations

**Status:** Active | Last Updated: Dec 23, 2025

---

## Active Issues

### High Priority

#### 1. React 19 Peer Dependency Warnings

**Severity:** Low (non-breaking)

**Description:**
```
WARN Issues with peer dependencies found
packages/ui
└─┬ react-joyride 2.9.3
  ├── ✕ unmet peer react@"15 - 18": found 19.2.3
  └─┬ react-floater 0.7.9
    ├── ✕ unmet peer react@"15 - 18": found 19.2.3
```

**Impact:** None - onboarding tour works correctly despite warning

**Workaround:** Ignore warning (react-joyride is compatible with React 19)

**Fix:** Wait for react-joyride to update peer dependencies to `"15 - 19"`

**Tracking:** https://github.com/gilbarbara/react-joyride/issues/XXX

---

#### 2. Meeting Mode Requires Manual Calibration

**Severity:** Medium (UX friction)

**Description:** Users must manually draw bounding box around self-view preview for each meeting app (Zoom, Teams, Meet, Google Meet).

**Impact:** First-time setup takes 30-60 seconds per app

**Workaround:** Calibration persists per-app (only needs to be done once)

**Fix (planned):** Auto-detect self-view region using computer vision
- Detect face in screen capture
- Auto-crop to face region
- Fallback to manual calibration if detection fails

**Timeline:** v1.3 (Q2 2025)

---

### Medium Priority

#### 3. False Blinks from Eye-Only Gaze Shifts (Looking at Second Monitor)

**Severity:** Medium (affects multi-monitor users)

**Description:** When user looks down at a second monitor and back up using only eye movement (no head tilt), the EAR drops and recovers in a pattern similar to a blink, causing false positives.

**Impact:** ~10-20% false positive rate for multi-monitor users who frequently glance at other screens

**Why It's Hard to Detect:**
- **Iris tracking fails with glasses** - MediaPipe iris landmarks (468, 473) are unreliable due to lens reflections
- **No head movement** - Head pitch detection won't help if user only moves eyes
- **Similar EAR pattern** - Both blinks and gaze shifts cause EAR to drop and recover
- **Strict thresholds break small blinks** - Requiring very low minimum EAR rejects legitimate light blinks

**Approaches Tried:**
1. Iris position tracking (`gaze_tracker.py`) - Ineffective with glasses
2. Minimum EAR threshold - Too strict, rejects small blinks
3. Head pitch detection - Won't work without head movement

**Potential Future Solutions:**
- Eyelid movement symmetry (blink: both lids move; gaze: mainly upper lid)
- EAR velocity profile analysis (blink pattern is symmetric fast-down-fast-up)
- ML classifier trained on labeled blink vs gaze-shift examples
- User-specific blink signature calibration

**Workaround:** None currently. Users with multi-monitor setups may see inflated blink counts.

**Timeline:** v1.4+ (requires R&D)

**Code Location:** `experiments/robust_blink_v2/gaze_tracker.py`, `experiments/robust_blink_v2/KNOWN_ISSUES.md`

---

#### 4. Camera Permission Denied on macOS (First Launch)

**Severity:** Medium (blocks first use)

**Description:** On first launch, macOS denies camera permission with no UI prompt. User must manually enable in System Settings.

**Impact:** 10-15% of macOS users confused on first launch

**Workaround:**
1. System Settings → Privacy & Security → Camera
2. Find "Electron" → Toggle ON
3. Restart app

**Fix (planned):** Add explicit "Grant Camera Permission" button with instructions

**Timeline:** v1.2 (Q1 2025)

---

#### 5. False Positives from Rapid Head Motion

**Severity:** Low (rare occurrence)

**Description:** Rapid head turns (>45°/sec) can cause EAR to dip below threshold momentarily, triggering false blink detection.

**Impact:** ~3% false positive rate during head motion

**Workaround:** Motion gating reduces this to <1% (implemented)

**Fix (planned):** Improve motion detection threshold
- Track angular velocity (not just position delta)
- Gate blink detection during >30°/sec rotation

**Timeline:** v1.3 (Q2 2025)

---

### Low Priority

#### 6. Web Dashboard Slow on Large Datasets

**Severity:** Low (only affects power users)

**Description:** Admin dashboard charts lag when loading >10K data points (100+ users × 7 days).

**Impact:** Page load time 3-5 seconds for enterprise (1K+ users)

**Workaround:** Use continuous aggregates (hourly/daily rollups) instead of raw minute data

**Fix (implemented):** Switch admin dashboard to query `wellness_1hour_rollup` view

**Status:** Resolved in v0.1.5

---

## Design Limitations (Not Bugs)

### 1. No Emotion Detection

**Reason:** Privacy + accuracy concerns

**Details:**
- Facial expression ≠ emotion (60-70% accuracy)
- EU AI Act classifies workplace emotion AI as HIGH-RISK
- Undermines "privacy-first" positioning

**Decision:** Intentional non-feature (see DEC-006 in PRODUCT_DECISIONS.md)

---

### 2. No Multi-User Detection

**Reason:** B2B wellness is per-individual, not shared device

**Details:**
- MediaPipe configured for `numFaces: 1`
- If multiple faces detected, uses closest to camera
- No face switching mid-session

**Workaround:** Each user should have separate device login

---

### 3. Glasses Reduce Accuracy

**Reason:** Reflections obscure eye landmarks

**Details:**
- Accuracy: 95%+ without glasses, 90%+ with glasses
- Single-eye fallback mitigates this
- Confidence filtering reduces false positives

**Status:** Acceptable trade-off (75% of users wear glasses)

---

### 4. No iOS/Android App

**Reason:** Computer vision requires sustained camera access (battery drain on mobile)

**Details:**
- Mobile OS restricts background camera access
- Wellness monitoring is desktop-focused (knowledge workers)
- Mobile companion app planned for view-only dashboards

**Timeline:** Mobile app (view-only) - v2.0 (Q3 2025)

---

## Browser Compatibility (Web Dashboard)

**Supported:**
- ✅ Chrome 90+ (recommended)
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Firefox 88+

**Not supported:**
- ❌ IE 11 (end of life)
- ❌ Chrome <90 (missing CSS features)

---

## Platform Compatibility (Desktop App)

**Fully supported:**
- ✅ macOS 11+ (Big Sur, Monterey, Ventura)
- ✅ Windows 10/11

**Partially supported:**
- ⚠️ macOS 10.15 (Catalina) - camera permission issues
- ⚠️ Windows 7/8 - not tested, may work

**Not supported:**
- ❌ Linux (Electron works, but untested - community builds welcome)

---

## Performance Benchmarks

### Desktop App

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **FPS** | 30 | 28-30 | ✅ Pass |
| **CPU Usage** | <10% | 5-8% | ✅ Pass |
| **RAM Usage** | <200 MB | 150-180 MB | ✅ Pass |
| **Inference Time** | <15ms | 8-12ms | ✅ Pass |

**Tested on:** Intel i5-8250U, 8GB RAM (mid-range laptop)

---

## Deprecated Features

### REMOVED: Performance Metrics Display

**Status:** Removed in v0.1.4

**Reason:** Requires platform-specific libraries (psutil on Python, systeminformation on Node)

**Impact:** Low - not critical for wellness tracking

**Alternative:** Use macOS Activity Monitor / Windows Task Manager

---

## Workarounds

### Issue: Electron App Won't Start

**Symptoms:** Window opens then closes immediately

**Causes:**
1. Missing `.env` file
2. Corrupted SQLite database
3. Conflicting Electron version

**Fix:**
```bash
# 1. Check .env exists
ls apps/desktop/.env

# 2. Delete database
rm ~/Library/Application\ Support/lumina/lumina.db

# 3. Clear Electron cache
rm -rf ~/Library/Application\ Support/Electron

# 4. Reinstall
pnpm install --force
```

---

### Issue: Supabase "Invalid API Key"

**Symptoms:** Cloud sync fails, CORS errors

**Causes:**
1. Wrong API key in `.env`
2. Project paused (Supabase free tier inactivity)
3. RLS policy blocking request

**Fix:**
```bash
# 1. Verify .env
cat apps/desktop/.env | grep SUPABASE

# 2. Check Supabase dashboard (project active?)
# 3. Test with curl:
curl https://your-project.supabase.co/rest/v1/wellness_data \
  -H "apikey: your-anon-key"
```

---

## Future Improvements

### Planned (Roadmap)

**v1.2 (Q1 2025):**
- Auto-detect meeting mode self-view region
- Improved camera permission UI (macOS)
- Break reminder integration (calendar API)

**v1.3 (Q2 2025):**
- Team challenges (gamification)
- Advanced motion gating (reduce false positives)
- Slack notifications (daily wellness summary)

**v2.0 (Q3 2025):**
- Mobile companion app (view-only)
- SSO integration (Okta, Azure AD)
- HRIS sync (BambooHR, Workday)

---

## Reporting Issues

### Before Reporting

1. Check this document (known issues)
2. Search GitHub Issues: https://github.com/dorddis/wellness-at-work/issues
3. Update to latest version: `pnpm install && pnpm dev`

### How to Report

**Template:**
```markdown
## Issue Description

[Clear, concise description of the problem]

## Steps to Reproduce

1. ...
2. ...
3. ...

## Expected Behavior

[What should happen]

## Actual Behavior

[What actually happens]

## Environment

- OS: macOS 13.5 / Windows 11
- App Version: 0.1.5
- Electron Version: 39.2.7
- Logs: [Attach `apps/desktop/logs/main.log`]

## Screenshots

[If applicable]
```

**Submit to:** https://github.com/dorddis/wellness-at-work/issues/new

---

## Related Documentation

- **Test Strategy:** [Testing approach](TEST_STRATEGY.md)
- **E2E Verification:** [Pre-release checklist](E2E_VERIFICATION.md)
- **Development Workflow:** [Debugging guide](../04-IMPLEMENTATION/DEVELOPMENT_WORKFLOW.md)

---

**Questions?** See [Documentation Index](../INDEX.md) or file an issue.
