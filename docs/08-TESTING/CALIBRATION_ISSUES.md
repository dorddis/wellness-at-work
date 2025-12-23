# Calibration Flow Issues & Fixes

> **Last Updated:** 2024-12-23
> **Status:** In Progress
> **Owner:** Coordinated (multi-agent)

This document tracks known issues with the onboarding calibration flow and coordinates fixes across agents.

---

## Issue Summary

| # | Issue | Severity | Status | Breaking? |
|---|-------|----------|--------|-----------|
| 1 | Calibration data not used by detector | FATAL | Planned (needs flag) | Yes |
| 2 | BPM display unreliable extrapolation | High | **FIXED** | No |
| 3 | Inconsistent duration constants | Medium | **FIXED** | No |
| 4 | Samples include blink events | Medium | Deferred | No |
| 5 | No init progress feedback | Low | Deferred | No |
| 6 | Uncontrolled frame rate | Low | Deferred | No |

---

## Hot Files (Recently Modified)

These files were recently changed. Coordinate before editing:

| File | Status | Notes |
|------|--------|-------|
| `packages/core/src/detection/constants.ts` | **Done** | Added CALIBRATION_FLAGS |
| `packages/ui/src/components/onboarding/CalibrationStep.tsx` | **Done** | Fixed BPM, imports constants |

---

## Issue Details

### Issue #1: Calibration Data Not Used by Detector (FATAL)

**Problem:** Two separate calibration systems exist that don't communicate.

**Evidence:**
- `CalibrationStep.tsx` creates `EARCalibrator` and collects samples
- `EARCalibrator` computes threshold via percentiles
- Result passed via `onNext({ baselineEar, earCalibration })`
- BUT `RobustBlinkDetector` uses `BilateralVerifier` with its own EMA baseline
- Comment in `faceLandmarker.ts:119` explicitly states calibration is ignored

**Files Involved:**
- `packages/ui/src/components/onboarding/CalibrationStep.tsx` (produces calibration)
- `packages/core/src/detection/faceLandmarker.ts:119` (loads but doesn't use)
- `packages/core/src/detection/robust-blink-detector.ts` (ignores calibration)
- `packages/core/src/detection/bilateral-verifier.ts` (uses own baseline)

**Fix Strategy:**
1. Add feature flag `USE_ONBOARDING_CALIBRATION` (default: false)
2. Modify `BilateralVerifier` to accept initial baseline from calibration
3. Pass calibration data through `FaceLandmarkerManager.initialize()`
4. Test extensively before enabling flag

**Status:** Planned - requires feature flag first

---

### Issue #2: BPM Display Unreliable

**Problem:** 30-second calibration extrapolates to BPM by multiplying by 2.

**Location:** `CalibrationStep.tsx:229`
```typescript
const blinksPerMinute = blinkCount > 0 ? Math.round(blinkCount * 2) : 0;
```

**Why it's wrong:**
- 30 seconds is too short for reliable BPM
- Small variance is doubled (4 blinks vs 5 blinks = 8 vs 10 BPM)
- Normal range 12-20 BPM means only 6-10 blinks in window

**Fix:**
- Option A: Extend calibration to 60 seconds (matches constants.ts)
- Option B: Show raw count instead of extrapolated BPM
- Option C: Show range with confidence interval

**Status:** Ready to fix (non-breaking)

---

### Issue #3: Inconsistent Duration Constants

**Problem:** Two different durations defined.

**Locations:**
- `CalibrationStep.tsx:25`: `CALIBRATION_DURATION_MS = 30_000` (30s)
- `constants.ts:88`: `CALIBRATION_DURATION_MS: 60_000` (60s)

**Fix:**
- Import from constants.ts instead of hardcoding
- Update BPM calculation to match actual duration

**Status:** Ready to fix (non-breaking)

---

### Issue #4: Samples Include Blink Events

**Problem:** EAR samples fed to calibrator include values during blinks.

**Location:** `CalibrationStep.tsx:150-152`

**Impact:** Percentile-based threshold may vary based on blink frequency during calibration.

**Fix:** Filter samples where `result.blink.isBlink === true`

**Status:** Deferred - low impact, percentile approach handles this somewhat

---

### Issue #5: No Init Progress Feedback

**Problem:** 2-5 second initialization shows no progress.

**Location:** `CalibrationStep.tsx:72-78`

**Fix:** Add loading spinner or progress text during MediaPipe init.

**Status:** Deferred - UX polish

---

### Issue #6: Uncontrolled Frame Rate

**Problem:** Uses `requestAnimationFrame` which runs at monitor refresh rate (60-144 FPS).

**Location:** `CalibrationStep.tsx:129-177`

**Fix:** Use `setInterval(33)` for consistent 30 FPS.

**Status:** Deferred - low impact

---

## Feature Flags

Located in `packages/core/src/detection/constants.ts`:

```typescript
export const CALIBRATION_FLAGS = {
  /** When true, pass onboarding calibration to RobustBlinkDetector */
  USE_ONBOARDING_CALIBRATION: false,
} as const;
```

**Do not enable flags without coordinating with other agents.**

---

## Implementation Order

1. **Phase 1 (Non-breaking):** COMPLETE
   - [x] Add `CALIBRATION_FLAGS` to constants.ts
   - [x] Fix duration constant import in CalibrationStep
   - [x] Fix BPM calculation (now uses dynamic duration)

2. **Phase 2 (Behind flag):**
   - [ ] Modify BilateralVerifier to accept initial baseline
   - [ ] Wire calibration through FaceLandmarkerManager
   - [ ] Test with flag enabled

3. **Phase 3 (Enable):**
   - [ ] Flip `USE_ONBOARDING_CALIBRATION` to true
   - [ ] Monitor for regressions

---

## Testing Checklist

Before enabling `USE_ONBOARDING_CALIBRATION`:

- [ ] Calibration completes without errors
- [ ] Blink count during calibration matches post-calibration detection
- [ ] Threshold persists across app restarts
- [ ] Works with glasses
- [ ] Works in low light
- [ ] No performance regression

---

## Contact

If you need to modify any hot files, check this document first and update the status.
