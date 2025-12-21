/**
 * Posture detection using facial landmarks.
 *
 * Detects:
 * - Distance from screen (too close / optimal / too far)
 * - Head tilt (left / right)
 * - Forward lean
 *
 * Uses calibration baselines for personalized thresholds.
 */

import {
  LEFT_EYE_OUTER_INDEX,
  RIGHT_EYE_OUTER_INDEX,
  NOSE_TIP_INDEX,
  POSTURE,
} from './constants';
import { Point2D } from './blink';

// ============================================================================
// Types
// ============================================================================

export type DistanceStatus = 'too_close' | 'optimal' | 'too_far';
export type TiltDirection = 'left' | 'right' | 'neutral';

export interface DistanceResult {
  status: DistanceStatus;
  faceWidthPixels: number;
  baselineWidth: number;
  ratioToBaseline: number;
}

export interface TiltResult {
  angleDegrees: number;
  isTilted: boolean;
  direction: TiltDirection;
}

export interface LeanResult {
  noseToEyeRatio: number;
  baselineRatio: number;
  isLeaningForward: boolean;
}

export interface PostureResult {
  distance: DistanceResult;
  tilt: TiltResult;
  lean: LeanResult;
  hasIssues: boolean;
}

// ============================================================================
// Distance Detector
// ============================================================================

/**
 * Detects distance from screen based on face width.
 *
 * Larger face = closer to screen.
 * Uses calibration baseline for relative comparison.
 */
class DistanceDetector {
  private baselineWidth: number | null = null;
  private calibrationSamples: number[] = [];
  private _calibrated = false;

  get calibrated(): boolean {
    return this._calibrated;
  }

  /**
   * Calculate face width and determine distance status.
   *
   * @param landmarks MediaPipe face landmarks
   * @param frameWidth Width of camera frame in pixels
   */
  update(landmarks: Point2D[], frameWidth: number): DistanceResult {
    // Get eye outer corners
    const leftEye = landmarks[LEFT_EYE_OUTER_INDEX];
    const rightEye = landmarks[RIGHT_EYE_OUTER_INDEX];

    // Calculate face width in pixels
    const faceWidth = Math.abs(rightEye.x - leftEye.x) * frameWidth;

    // Calibrate baseline during first frames
    if (!this._calibrated) {
      this.calibrationSamples.push(faceWidth);
      if (this.calibrationSamples.length >= POSTURE.BASELINE_FRAMES) {
        const sum = this.calibrationSamples.reduce((a, b) => a + b, 0);
        this.baselineWidth = sum / this.calibrationSamples.length;
        this._calibrated = true;
      }
    }

    // Use baseline if calibrated, else use absolute thresholds
    if (this.baselineWidth !== null) {
      const ratio = faceWidth / this.baselineWidth;

      let status: DistanceStatus;
      if (ratio > POSTURE.DISTANCE_TOO_CLOSE_RATIO) {
        status = 'too_close';
      } else if (ratio < POSTURE.DISTANCE_TOO_FAR_RATIO) {
        status = 'too_far';
      } else {
        status = 'optimal';
      }

      return {
        status,
        faceWidthPixels: faceWidth,
        baselineWidth: this.baselineWidth,
        ratioToBaseline: ratio,
      };
    } else {
      // Fallback to absolute thresholds
      let status: DistanceStatus;
      if (faceWidth > POSTURE.DISTANCE_TOO_CLOSE_PIXELS) {
        status = 'too_close';
      } else if (faceWidth < POSTURE.DISTANCE_TOO_FAR_PIXELS) {
        status = 'too_far';
      } else {
        status = 'optimal';
      }

      return {
        status,
        faceWidthPixels: faceWidth,
        baselineWidth: POSTURE.DISTANCE_OPTIMAL_PIXELS,
        ratioToBaseline: faceWidth / POSTURE.DISTANCE_OPTIMAL_PIXELS,
      };
    }
  }

  reset(): void {
    this.baselineWidth = null;
    this.calibrationSamples = [];
    this._calibrated = false;
  }
}

// ============================================================================
// Tilt Detector
// ============================================================================

/**
 * Detects head tilt (left/right rotation).
 *
 * Measures angle between eye corners and horizontal.
 */
class TiltDetector {
  /**
   * Calculate head tilt angle.
   *
   * @param landmarks MediaPipe face landmarks
   */
  update(landmarks: Point2D[]): TiltResult {
    const leftEye = landmarks[LEFT_EYE_OUTER_INDEX];
    const rightEye = landmarks[RIGHT_EYE_OUTER_INDEX];

    // Calculate angle from horizontal
    const deltaY = rightEye.y - leftEye.y;
    const deltaX = rightEye.x - leftEye.x;

    const angleRad = Math.atan2(deltaY, deltaX);
    const angleDeg = angleRad * (180 / Math.PI);

    // Determine if tilted
    const isTilted = Math.abs(angleDeg) > POSTURE.TILT_THRESHOLD_DEGREES;

    let direction: TiltDirection;
    if (angleDeg > POSTURE.TILT_THRESHOLD_DEGREES) {
      direction = 'right';
    } else if (angleDeg < -POSTURE.TILT_THRESHOLD_DEGREES) {
      direction = 'left';
    } else {
      direction = 'neutral';
    }

    return {
      angleDegrees: angleDeg,
      isTilted,
      direction,
    };
  }
}

// ============================================================================
// Lean Detector
// ============================================================================

/**
 * Detects forward lean.
 *
 * When leaning forward, nose appears lower relative to eyes
 * (nose-to-eye vertical distance increases).
 */
class LeanDetector {
  private baselineRatio: number | null = null;
  private calibrationSamples: number[] = [];
  private _calibrated = false;

  get calibrated(): boolean {
    return this._calibrated;
  }

  /**
   * Calculate nose-to-eye ratio for lean detection.
   *
   * @param landmarks MediaPipe face landmarks
   */
  update(landmarks: Point2D[]): LeanResult {
    const nose = landmarks[NOSE_TIP_INDEX];
    const leftEye = landmarks[LEFT_EYE_OUTER_INDEX];
    const rightEye = landmarks[RIGHT_EYE_OUTER_INDEX];

    // Eye center
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;

    // Face height approximation (distance from eye center to nose)
    const faceHeight = Math.abs(nose.y - eyeCenterY);

    // Normalize by face width to be scale-invariant
    let faceWidth = Math.abs(rightEye.x - leftEye.x);
    if (faceWidth < 0.01) {
      faceWidth = 0.1;
    }

    // Nose-to-eye ratio (higher = leaning forward)
    const ratio = faceHeight / faceWidth;

    // Calibrate baseline
    if (!this._calibrated) {
      this.calibrationSamples.push(ratio);
      if (this.calibrationSamples.length >= POSTURE.BASELINE_FRAMES) {
        const sum = this.calibrationSamples.reduce((a, b) => a + b, 0);
        this.baselineRatio = sum / this.calibrationSamples.length;
        this._calibrated = true;
      }
    }

    // Compare to baseline
    let isLeaningForward = false;
    if (this.baselineRatio !== null) {
      const deviation = ratio - this.baselineRatio;
      isLeaningForward = deviation > POSTURE.LEAN_THRESHOLD;
    }

    return {
      noseToEyeRatio: ratio,
      baselineRatio: this.baselineRatio ?? ratio,
      isLeaningForward,
    };
  }

  reset(): void {
    this.baselineRatio = null;
    this.calibrationSamples = [];
    this._calibrated = false;
  }
}

// ============================================================================
// Posture Analyzer (Main Class)
// ============================================================================

/**
 * Combined posture analysis.
 *
 * Integrates distance, tilt, and lean detection.
 *
 * Usage:
 * ```typescript
 * const analyzer = new PostureAnalyzer();
 *
 * // In detection loop
 * const result = analyzer.update(landmarks, frameWidth);
 * if (result.hasIssues) {
 *   console.log('Posture issue detected:', result);
 * }
 * ```
 */
export class PostureAnalyzer {
  private distanceDetector: DistanceDetector;
  private tiltDetector: TiltDetector;
  private leanDetector: LeanDetector;

  constructor() {
    this.distanceDetector = new DistanceDetector();
    this.tiltDetector = new TiltDetector();
    this.leanDetector = new LeanDetector();
  }

  /**
   * Analyze all posture metrics.
   *
   * @param landmarks MediaPipe face landmarks
   * @param frameWidth Camera frame width in pixels
   */
  update(landmarks: Point2D[], frameWidth: number = 640): PostureResult {
    const distance = this.distanceDetector.update(landmarks, frameWidth);
    const tilt = this.tiltDetector.update(landmarks);
    const lean = this.leanDetector.update(landmarks);

    // Any posture issue?
    const hasIssues =
      distance.status !== 'optimal' ||
      tilt.isTilted ||
      lean.isLeaningForward;

    return {
      distance,
      tilt,
      lean,
      hasIssues,
    };
  }

  /**
   * Reset all calibration.
   */
  reset(): void {
    this.distanceDetector.reset();
    this.leanDetector.reset();
  }

  /**
   * Check if calibration is complete.
   */
  isCalibrated(): boolean {
    return (
      this.distanceDetector.calibrated &&
      this.leanDetector.calibrated
    );
  }

  /**
   * Get calibration progress (0-1).
   */
  getCalibrationProgress(): number {
    const distanceProgress = this.distanceDetector.calibrated ? 1 : 0;
    const leanProgress = this.leanDetector.calibrated ? 1 : 0;
    return (distanceProgress + leanProgress) / 2;
  }
}
