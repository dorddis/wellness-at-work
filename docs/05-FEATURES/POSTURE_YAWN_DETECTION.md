# Posture & Yawn Detection - Planned Features

## Overview

Extend the existing MediaPipe FaceLandmarker pipeline to detect:
1. **Posture issues** - slouching, too close to screen, head tilt
2. **Yawning** - fatigue/drowsiness indicator
3. **Drowsiness** - prolonged eye closure patterns

All use the same 478 face landmarks we already capture for blink detection.

---

## Feature 1: Posture Detection

### What We Can Detect

| Posture Issue | Detection Method | Landmarks Used |
|--------------|------------------|----------------|
| **Too close to screen** | Face bounding box size | Face mesh bounds |
| **Too far from screen** | Face bounding box too small | Face mesh bounds |
| **Head tilt (left/right)** | Eye-to-eye angle from horizontal | Eyes outer corners |
| **Head forward lean** | Nose-to-eye vertical ratio | Nose tip, eyes |
| **Looking down** | Nose position relative to eyes | Nose, eye centers |
| **Chin tuck/up** | Chin-to-nose distance ratio | Chin, nose |

### Key Landmarks for Posture

```typescript
// MediaPipe Face Mesh indices for posture detection
export const POSTURE_LANDMARKS = {
  // Face boundaries (for distance detection)
  FACE_OVAL: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
              397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
              172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],

  // Eye outer corners (for head tilt)
  LEFT_EYE_OUTER: 33,
  RIGHT_EYE_OUTER: 263,

  // Nose landmarks
  NOSE_TIP: 1,
  NOSE_BRIDGE: 6,

  // Chin
  CHIN: 152,

  // Forehead center
  FOREHEAD: 10,
} as const;
```

### Distance Detection Algorithm

```typescript
interface DistanceResult {
  status: 'too_close' | 'optimal' | 'too_far';
  faceWidthPixels: number;
  estimatedDistanceCm: number;
}

function detectScreenDistance(faceLandmarks: Point2D[], frameWidth: number): DistanceResult {
  // Calculate face width from outer eye corners
  const leftEye = faceLandmarks[33];
  const rightEye = faceLandmarks[263];
  const faceWidth = Math.abs(rightEye.x - leftEye.x) * frameWidth;

  // Calibrated thresholds (user calibrates once at optimal distance)
  // Average face width ~14cm, at 50cm distance appears as ~20% of 720p frame
  const TOO_CLOSE_THRESHOLD = 200;  // pixels - face too large
  const TOO_FAR_THRESHOLD = 80;     // pixels - face too small
  const OPTIMAL_FACE_WIDTH = 140;   // pixels - ~50-60cm from screen

  // Estimate distance using similar triangles
  // d = (W * f) / w where W=real face width, f=focal length, w=pixel width
  const estimatedDistanceCm = (14 * 500) / faceWidth; // Rough estimate

  if (faceWidth > TOO_CLOSE_THRESHOLD) {
    return { status: 'too_close', faceWidthPixels: faceWidth, estimatedDistanceCm };
  } else if (faceWidth < TOO_FAR_THRESHOLD) {
    return { status: 'too_far', faceWidthPixels: faceWidth, estimatedDistanceCm };
  }
  return { status: 'optimal', faceWidthPixels: faceWidth, estimatedDistanceCm };
}
```

### Head Tilt Detection Algorithm

```typescript
interface TiltResult {
  tiltAngleDegrees: number;  // Positive = tilted right, Negative = tilted left
  isTilted: boolean;
  direction: 'left' | 'right' | 'neutral';
}

function detectHeadTilt(faceLandmarks: Point2D[]): TiltResult {
  const leftEye = faceLandmarks[33];   // Left eye outer corner
  const rightEye = faceLandmarks[263]; // Right eye outer corner

  // Calculate angle from horizontal
  const deltaY = rightEye.y - leftEye.y;
  const deltaX = rightEye.x - leftEye.x;
  const angleRad = Math.atan2(deltaY, deltaX);
  const angleDeg = angleRad * (180 / Math.PI);

  const TILT_THRESHOLD = 10; // degrees

  return {
    tiltAngleDegrees: angleDeg,
    isTilted: Math.abs(angleDeg) > TILT_THRESHOLD,
    direction: angleDeg > TILT_THRESHOLD ? 'right' :
               angleDeg < -TILT_THRESHOLD ? 'left' : 'neutral'
  };
}
```

### Forward Lean Detection

```typescript
interface LeanResult {
  isLeaningForward: boolean;
  noseToEyeRatio: number;  // Higher = leaning forward
}

function detectForwardLean(faceLandmarks: Point2D[]): LeanResult {
  const noseTip = faceLandmarks[1];
  const leftEye = faceLandmarks[33];
  const rightEye = faceLandmarks[263];

  // Eye center
  const eyeCenterY = (leftEye.y + rightEye.y) / 2;

  // When leaning forward, nose appears lower relative to eyes
  const noseToEyeRatio = noseTip.y - eyeCenterY;

  // Calibrate during setup - this varies per person
  const FORWARD_LEAN_THRESHOLD = 0.15; // Normalized, needs calibration

  return {
    isLeaningForward: noseToEyeRatio > FORWARD_LEAN_THRESHOLD,
    noseToEyeRatio
  };
}
```

---

## Feature 2: Yawn Detection

### Mouth Aspect Ratio (MAR)

Similar to EAR but for mouth openness. Yawning = prolonged high MAR.

```typescript
// MediaPipe mouth landmarks for MAR calculation
export const MOUTH_LANDMARKS = {
  // Outer lips (for MAR)
  UPPER_LIP_TOP: 13,      // Top of upper lip
  LOWER_LIP_BOTTOM: 14,   // Bottom of lower lip
  LEFT_CORNER: 61,        // Left mouth corner
  RIGHT_CORNER: 291,      // Right mouth corner

  // Inner lips (more accurate for mouth opening)
  INNER_UPPER: 13,
  INNER_LOWER: 14,
  INNER_LEFT: 78,
  INNER_RIGHT: 308,
} as const;
```

### MAR Algorithm

```typescript
interface YawnResult {
  mar: number;                    // Mouth Aspect Ratio (0-1)
  isYawning: boolean;
  yawnDurationMs: number;         // How long mouth has been open
  yawnConfidence: number;         // 0-1, based on MAR magnitude and duration
}

function calculateMAR(faceLandmarks: Point2D[]): number {
  // Vertical mouth opening
  const upperLip = faceLandmarks[13];
  const lowerLip = faceLandmarks[14];
  const verticalDist = euclideanDistance(upperLip, lowerLip);

  // Horizontal mouth width
  const leftCorner = faceLandmarks[61];
  const rightCorner = faceLandmarks[291];
  const horizontalDist = euclideanDistance(leftCorner, rightCorner);

  // MAR = vertical / horizontal
  // Higher = mouth more open
  return horizontalDist > 0 ? verticalDist / horizontalDist : 0;
}

class YawnDetector {
  private yawnStartTime: number | null = null;
  private readonly MAR_THRESHOLD = 0.6;       // Above this = mouth significantly open
  private readonly YAWN_DURATION_MS = 2000;   // Must be open 2+ seconds to be yawn

  detect(faceLandmarks: Point2D[]): YawnResult {
    const mar = calculateMAR(faceLandmarks);
    const now = Date.now();

    if (mar > this.MAR_THRESHOLD) {
      // Mouth is open
      if (!this.yawnStartTime) {
        this.yawnStartTime = now;
      }

      const duration = now - this.yawnStartTime;
      const isYawning = duration >= this.YAWN_DURATION_MS;

      // Confidence based on how wide and how long
      const marConfidence = Math.min((mar - this.MAR_THRESHOLD) / 0.3, 1);
      const durationConfidence = Math.min(duration / this.YAWN_DURATION_MS, 1);
      const confidence = marConfidence * durationConfidence;

      return {
        mar,
        isYawning,
        yawnDurationMs: duration,
        yawnConfidence: confidence
      };
    } else {
      // Mouth closed, reset
      this.yawnStartTime = null;
      return { mar, isYawning: false, yawnDurationMs: 0, yawnConfidence: 0 };
    }
  }
}
```

---

## Feature 3: Drowsiness Detection

Combines blink and yawn data for fatigue detection.

### PERCLOS (Percentage of Eye Closure)

Standard drowsiness metric used in driver fatigue systems.

```typescript
interface DrowsinessResult {
  perclos: number;           // 0-100, percentage of time eyes >80% closed
  isDrowsy: boolean;
  drowsinessLevel: 'alert' | 'mild' | 'moderate' | 'severe';
  recentYawns: number;       // Yawns in last 5 minutes
}

class DrowsinessDetector {
  private earHistory: { timestamp: number; ear: number }[] = [];
  private yawnHistory: number[] = [];  // Timestamps of yawns

  private readonly WINDOW_MS = 60_000;        // 1 minute sliding window
  private readonly CLOSED_THRESHOLD = 0.2;     // EAR below this = eyes closed
  private readonly PERCLOS_THRESHOLD = 15;     // >15% = drowsy

  addFrame(ear: number, isYawn: boolean): void {
    const now = Date.now();

    // Add EAR sample
    this.earHistory.push({ timestamp: now, ear });

    // Record yawn
    if (isYawn) {
      this.yawnHistory.push(now);
    }

    // Prune old data
    const cutoff = now - this.WINDOW_MS;
    this.earHistory = this.earHistory.filter(e => e.timestamp > cutoff);
    this.yawnHistory = this.yawnHistory.filter(t => t > cutoff);
  }

  getDrowsiness(): DrowsinessResult {
    if (this.earHistory.length < 30) {
      return { perclos: 0, isDrowsy: false, drowsinessLevel: 'alert', recentYawns: 0 };
    }

    // Calculate PERCLOS
    const closedFrames = this.earHistory.filter(e => e.ear < this.CLOSED_THRESHOLD).length;
    const perclos = (closedFrames / this.earHistory.length) * 100;

    // Recent yawns (last 5 minutes)
    const fiveMinAgo = Date.now() - 5 * 60_000;
    const recentYawns = this.yawnHistory.filter(t => t > fiveMinAgo).length;

    // Determine drowsiness level
    let drowsinessLevel: DrowsinessResult['drowsinessLevel'] = 'alert';
    if (perclos > 30 || recentYawns >= 3) {
      drowsinessLevel = 'severe';
    } else if (perclos > 20 || recentYawns >= 2) {
      drowsinessLevel = 'moderate';
    } else if (perclos > this.PERCLOS_THRESHOLD || recentYawns >= 1) {
      drowsinessLevel = 'mild';
    }

    return {
      perclos,
      isDrowsy: drowsinessLevel !== 'alert',
      drowsinessLevel,
      recentYawns
    };
  }
}
```

---

## Implementation Status

> **Status:** Core detection fully implemented (2024-12). Alert integration pending.

### Phase 1: Posture Detection (v1.2) - COMPLETE

- [x] Add posture landmark constants (`packages/core/src/detection/constants.ts`)
- [x] Implement distance detection (too close/far) - `DistanceDetector` class
- [x] Implement head tilt detection - `TiltDetector` class
- [x] Implement forward lean detection - `LeanDetector` class
- [x] Auto-calibration during first frames (POSTURE.BASELINE_FRAMES)
- [x] UI indicator for posture status (`PostureIndicator` component)

**Implementation:** `packages/core/src/detection/posture.ts` - `PostureAnalyzer` class

### Phase 2: Yawn Detection (v1.3) - COMPLETE

- [x] Add mouth landmark constants (MOUTH_INDICES)
- [x] Implement MAR calculation - `calculateMAR()` function
- [x] Create YawnDetector class with cooldowns
- [x] Track yawn frequency via `getRecentYawns(windowMs)`
- [x] Yawn timestamps tracked for drowsiness integration

**Implementation:** `packages/core/src/detection/yawn.ts` - `YawnDetector` class

### Phase 3: Drowsiness Detection (v1.4) - COMPLETE

- [x] Implement PERCLOS calculation (% eye closure in sliding window)
- [x] Combine blink + yawn for drowsiness score
- [x] Multi-level classification: alert/mild/moderate/severe
- [ ] Create drowsiness alerts (not yet wired to UI)
- [ ] Add to HR dashboard (future feature)

**Implementation:** `packages/core/src/detection/drowsiness.ts` - `DrowsinessDetector` class

---

## Alert Strategy

| Condition | Alert Type | Cooldown | Message |
|-----------|-----------|----------|---------|
| Too close to screen (>30s) | Gentle nudge | 10 min | "You're quite close to the screen" |
| Head tilted (>60s) | Gentle nudge | 15 min | "Your head is tilted - try straightening up" |
| Yawn detected | Log only | N/A | (No alert, just tracked) |
| 2+ yawns in 10 min | Suggestion | 20 min | "Feeling tired? A short break might help" |
| PERCLOS >20% | Urgent | 30 min | "Your eyes are heavy - take a break" |
| PERCLOS >30% | Critical | 15 min | "Fatigue detected - please rest your eyes" |

---

## Data Model Extensions

```typescript
// New event types for analytics
interface PostureEvent {
  type: 'posture_alert';
  issue: 'too_close' | 'too_far' | 'head_tilt' | 'forward_lean';
  value: number;  // Distance in cm, angle in degrees, etc.
  duration_ms: number;
}

interface YawnEvent {
  type: 'yawn_detected';
  duration_ms: number;
  mar_peak: number;
  confidence: number;
}

interface DrowsinessEvent {
  type: 'drowsiness_alert';
  perclos: number;
  yawn_count_5min: number;
  level: 'mild' | 'moderate' | 'severe';
}
```

---

## Privacy Considerations

Same as blink detection:
- **All processing on-device**
- **No images stored or transmitted**
- **Only metrics stored:** posture scores, yawn counts, drowsiness levels
- **User can disable** each detection type independently

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Posture detection accuracy | >90% |
| Yawn detection accuracy | >85% |
| Drowsiness prediction (vs user-reported fatigue) | >75% correlation |
| False positive rate (unnecessary alerts) | <10% |
| CPU overhead (all features enabled) | <8% total |

---

## References

- MediaPipe Face Landmarks: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker
- PERCLOS research: https://www.nhtsa.gov/sites/nhtsa.gov/files/809692.pdf
- MAR for yawn detection: https://ieeexplore.ieee.org/document/8658705
