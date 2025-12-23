# Onboarding Improvements - Implementation Plan

**Status:** Paused - Resume later
**Last Updated:** 2025-12-23

## Completed Work

### 1. Stepper Component (DONE)
- Created `packages/ui/src/components/onboarding/Stepper.tsx`
- Visual step indicator with numbered circles and animated progress lines
- Supports compact mode and optional labels

### 2. OnboardingFlow Integration (DONE)
- Integrated Stepper into OnboardingFlow
- Connected to App.tsx with proper callbacks
- 6 steps: Welcome → Privacy → Camera → Calibration → Goals → Complete

### 3. CameraStep Rewrite (DONE)
- Shows live camera preview
- Enumerates available cameras via `navigator.mediaDevices.enumerateDevices()`
- Dropdown for camera selection
- Saves selected camera ID to settings store
- File: `packages/ui/src/components/onboarding/CameraStep.tsx`

### 4. GoalsStep Fix (DONE)
- Changed defaults from `true` to `false`
- User must actively select goals (reduceEyeStrain, improvePosture, takeRegularBreaks)
- File: `packages/ui/src/components/onboarding/GoalsStep.tsx`

### 5. Animation Slowdown (DONE)
- Increased delays across all steps (0.3 → 0.5 → 0.8 → 1.0 → 1.2)
- Longer durations (0.4 → 0.5 → 0.6)
- Reduced y movement (20 → 10)
- Changed color theme to black/white/gray only (removed green/purple/orange)

---

## Pending Work

### Task 1: Fix CalibrationStep with Real Detection

**Problem:** CalibrationStep currently uses fake data (`Math.random()`) instead of actual blink detection.

**Current Implementation (lines 44-52 in CalibrationStep.tsx):**
```typescript
// Simulate blink detection during calibration
if (Math.random() < 0.03) {
  setBlinkCount((prev) => prev + 1);
}
// Calculate baseline EAR (simulated)
const calculatedEar = 0.22 + Math.random() * 0.06;
```

**Required Changes:**

1. **Add Props for Detection Pipeline:**
```typescript
export interface CalibrationStepProps {
  onNext: (data: { baselineEar: number; earThreshold: number }) => void;
  onBack: () => void;
  onSkip: () => void;
  faceLandmarkerManager?: FaceLandmarkerManager;  // NEW
  selectedCameraId?: string | null;               // NEW
}
```

2. **Add Video Element and Camera Access:**
- Create hidden `<video>` element ref
- Start camera stream using `selectedCameraId` or default
- Clean up stream on unmount

3. **Run Real Detection Loop:**
```typescript
// In calibrating state, run detection at ~30fps
const intervalId = setInterval(async () => {
  if (!faceLandmarkerManager || !videoRef.current) return;

  const result = await faceLandmarkerManager.detectForVideo(
    videoRef.current,
    performance.now()
  );

  if (result?.faceLandmarks?.[0]) {
    const ear = calculateEAR(result.faceLandmarks[0]);
    earCalibrator.addSample(ear);

    // Check for blink (EAR below current threshold)
    if (ear < earCalibrator.getThreshold()) {
      setBlinkCount(prev => prev + 1);
    }
  }
}, 33); // ~30fps
```

4. **Use EARCalibrator for Threshold:**
- Import from `@lumina/core`
- Create instance: `new EARCalibrator()`
- Feed samples during calibration
- At end: `earCalibrator.forceCalibrate()` to get final threshold
- Pass `{ baselineEar, earThreshold }` to `onNext`

5. **Persist Calibration:**
- Add to settingsStore: `earThreshold: number | null`
- Save after calibration completes
- Load on app startup to skip re-calibration

**Key Files:**
- `packages/ui/src/components/onboarding/CalibrationStep.tsx` - Main changes
- `packages/ui/src/components/onboarding/OnboardingFlow.tsx` - Pass props
- `packages/ui/src/stores/settingsStore.ts` - Add earThreshold
- `packages/core/src/detection/ear-calibrator.ts` - EARCalibrator API
- `packages/core/src/detection/faceLandmarker.ts` - FaceLandmarkerManager API

**EARCalibrator API Reference:**
```typescript
class EARCalibrator {
  addSample(ear: number): void;           // Add EAR measurement
  forceCalibrate(): number;               // Force calibration, returns threshold
  getThreshold(): number;                 // Get current threshold (default 0.21)
  isCalibrated(): boolean;                // Check if calibrated
  getCalibration(): CalibrationData;      // Get full calibration data
  loadCalibration(data: CalibrationData): void;  // Restore from storage
}

interface CalibrationData {
  threshold: number;
  openEyeP75: number;
  closedEyeP10: number;
  sampleCount: number;
  calibratedAt: string;
}
```

---

### Task 2: Add Product Tour After Onboarding

**Problem:** After onboarding completes, user lands on dashboard with no guidance on features.

**Solution:** Use react-joyride for guided product tour.

**Implementation Steps:**

1. **Install react-joyride:**
```bash
cd lumina/packages/ui
pnpm add react-joyride
```

2. **Add to Settings Store:**
```typescript
// In settingsStore.ts
interface SettingsState {
  // ... existing
  hasCompletedProductTour: boolean;
  setProductTourComplete: () => void;
}
```

3. **Create ProductTour Component:**
```typescript
// packages/ui/src/components/ProductTour.tsx
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="dashboard"]',
    content: 'This is your wellness dashboard. See your daily stats at a glance.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="blink-stats"]',
    content: 'Track your blink rate throughout the day. Healthy is 15-20 per minute.',
    placement: 'right',
  },
  {
    target: '[data-tour="break-timer"]',
    content: 'We remind you to take breaks using the 20-20-20 rule.',
    placement: 'left',
  },
  {
    target: '[data-tour="settings"]',
    content: 'Customize alerts, goals, and preferences here.',
    placement: 'top',
  },
  {
    target: '[data-tour="achievements"]',
    content: 'Earn achievements as you build healthy habits!',
    placement: 'left',
  },
];

export function ProductTour({ run, onComplete }: ProductTourProps) {
  const handleCallback = (data: CallBackProps) => {
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(data.status)) {
      onComplete();
    }
  };

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: '#000',
          zIndex: 10000,
        },
      }}
    />
  );
}
```

4. **Add data-tour Attributes to UI Elements:**
- Dashboard container: `data-tour="dashboard"`
- Blink stats card: `data-tour="blink-stats"`
- Break timer: `data-tour="break-timer"`
- Settings nav item: `data-tour="settings"`
- Achievements section: `data-tour="achievements"`

5. **Integrate in App.tsx:**
```typescript
// After onboarding completes, show product tour
const { hasCompletedProductTour, setProductTourComplete } = useSettingsStore();

// In render:
{!hasCompletedProductTour && (
  <ProductTour
    run={hasCompletedOnboarding && !hasCompletedProductTour}
    onComplete={setProductTourComplete}
  />
)}
```

**Key Files:**
- `packages/ui/src/components/ProductTour.tsx` - NEW
- `packages/ui/src/stores/settingsStore.ts` - Add hasCompletedProductTour
- `apps/desktop/src/renderer/hub/App.tsx` - Integrate tour
- Various UI components - Add data-tour attributes

---

## File Reference

| File | Status | Changes |
|------|--------|---------|
| `packages/ui/src/components/onboarding/Stepper.tsx` | DONE | Created |
| `packages/ui/src/components/onboarding/OnboardingFlow.tsx` | DONE | Stepper integration |
| `packages/ui/src/components/onboarding/CameraStep.tsx` | DONE | Full rewrite |
| `packages/ui/src/components/onboarding/GoalsStep.tsx` | DONE | Defaults fixed |
| `packages/ui/src/components/onboarding/CalibrationStep.tsx` | PENDING | Real detection |
| `packages/ui/src/components/onboarding/WelcomeStep.tsx` | DONE | Animations slowed |
| `packages/ui/src/components/onboarding/PrivacyStep.tsx` | DONE | Animations slowed |
| `packages/ui/src/components/onboarding/CompleteStep.tsx` | DONE | Animations/colors |
| `packages/ui/src/components/ProductTour.tsx` | PENDING | Create new |
| `packages/ui/src/stores/settingsStore.ts` | PARTIAL | Need earThreshold, hasCompletedProductTour |
| `apps/desktop/src/renderer/hub/App.tsx` | PARTIAL | Need ProductTour integration |

---

## Testing Checklist

### CalibrationStep
- [ ] Camera stream starts when calibration begins
- [ ] Blink count increments with real blinks
- [ ] Progress circle fills over 30 seconds
- [ ] Final EAR threshold is reasonable (0.18-0.25 range)
- [ ] Calibration data persists to settings
- [ ] Skip button works and uses default threshold
- [ ] Cleanup: camera stops when leaving step

### Product Tour
- [ ] Tour starts after onboarding completes
- [ ] All tour steps have valid targets (data-tour attributes exist)
- [ ] Skip button works
- [ ] Completion saves to settings
- [ ] Tour doesn't show again after completion
- [ ] Tour styling matches app theme (black/white/gray)

---

## Resume Instructions

When resuming this work:

1. Read this document for context
2. Check current state of files (may have changed)
3. Start with Task 1 (CalibrationStep) - it's more critical
4. Then implement Task 2 (ProductTour)
5. Test both features end-to-end
6. Update this document with completion status
