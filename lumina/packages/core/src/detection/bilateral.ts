/**
 * Bilateral verification for blink detection.
 *
 * Ensures both eyes show the same blink pattern to filter out:
 * - Single-eye artifacts (glasses reflections, partial occlusion)
 * - Winks (intentional single-eye closure)
 * - Asymmetric noise
 */

import { LEFT_EYE_INDICES, RIGHT_EYE_INDICES, BILATERAL } from './constants';
import { Point2D, calculateEAR, extractEyeLandmarks } from './blink';

export interface EyeMetrics {
  /** Eye Aspect Ratio */
  ear: number;
  /** Running baseline when open */
  baseline: number;
  /** How much below baseline */
  dipFromBaseline: number;
}

export interface BilateralResult {
  /** Metrics for left eye */
  leftEye: EyeMetrics;
  /** Metrics for right eye */
  rightEye: EyeMetrics;
  /** Average of both eyes */
  avgEar: number;
  /** min(left, right) / max(left, right) for dips */
  symmetryRatio: number;
  /** True if ratio >= threshold */
  isSymmetric: boolean;
  /** Combined baseline for both eyes */
  combinedBaseline: number;
}

/**
 * Tracks both eyes and verifies bilateral symmetry for blinks.
 *
 * Maintains separate baselines for each eye and requires both
 * to show similar dip patterns for a valid blink.
 */
export class BilateralVerifier {
  private leftBaseline: number = 0.3;
  private rightBaseline: number = 0.3;
  private frameCount: number = 0;
  calibrating: boolean = true;

  // Track min values during current blink for dip calculation
  private leftMin: number = 1.0;
  private rightMin: number = 1.0;
  private trackingBlink: boolean = false;

  /**
   * Calculate EAR for both eyes and check symmetry.
   *
   * @param landmarks Array of 478 MediaPipe face landmarks
   * @returns BilateralResult with metrics for both eyes
   */
  update(landmarks: Point2D[]): BilateralResult {
    // Calculate EAR for each eye
    const leftEyeLandmarks = extractEyeLandmarks(landmarks, LEFT_EYE_INDICES);
    const rightEyeLandmarks = extractEyeLandmarks(landmarks, RIGHT_EYE_INDICES);

    const leftEar = calculateEAR(leftEyeLandmarks);
    const rightEar = calculateEAR(rightEyeLandmarks);
    const avgEar = (leftEar + rightEar) / 2;

    this.frameCount++;

    // Initialize baselines during calibration period
    if (this.calibrating) {
      if (this.frameCount <= BILATERAL.BASELINE_INIT_FRAMES) {
        // Simple average during init
        const alpha = 1.0 / this.frameCount;
        this.leftBaseline = (1 - alpha) * this.leftBaseline + alpha * leftEar;
        this.rightBaseline = (1 - alpha) * this.rightBaseline + alpha * rightEar;
      } else {
        this.calibrating = false;
      }
    }

    // Update baselines (only when eyes appear open)
    if (!this.calibrating) {
      const combinedBaseline = (this.leftBaseline + this.rightBaseline) / 2;
      if (avgEar > combinedBaseline * BILATERAL.EYES_OPEN_FACTOR) {
        // Eyes are open, update baselines slowly
        this.leftBaseline = (1 - BILATERAL.BASELINE_ALPHA) * this.leftBaseline +
                            BILATERAL.BASELINE_ALPHA * leftEar;
        this.rightBaseline = (1 - BILATERAL.BASELINE_ALPHA) * this.rightBaseline +
                             BILATERAL.BASELINE_ALPHA * rightEar;
      }
    }

    // Calculate dips from baseline
    const leftDip = this.leftBaseline - leftEar;
    const rightDip = this.rightBaseline - rightEar;

    // Track minimums during blink
    if (this.trackingBlink) {
      this.leftMin = Math.min(this.leftMin, leftEar);
      this.rightMin = Math.min(this.rightMin, rightEar);
    }

    // Calculate symmetry ratio
    let symmetryRatio: number;
    if (leftDip > 0 && rightDip > 0) {
      symmetryRatio = Math.min(leftDip, rightDip) / Math.max(leftDip, rightDip);
    } else if (leftDip <= 0 && rightDip <= 0) {
      // Both eyes at or above baseline
      symmetryRatio = 1.0;
    } else {
      // One eye dipping, other not
      symmetryRatio = 0.0;
    }

    const isSymmetric = symmetryRatio >= BILATERAL.RATIO_MIN;
    const combinedBaseline = (this.leftBaseline + this.rightBaseline) / 2;

    return {
      leftEye: {
        ear: leftEar,
        baseline: this.leftBaseline,
        dipFromBaseline: leftDip,
      },
      rightEye: {
        ear: rightEar,
        baseline: this.rightBaseline,
        dipFromBaseline: rightDip,
      },
      avgEar,
      symmetryRatio,
      isSymmetric,
      combinedBaseline,
    };
  }

  /**
   * Call when blink starts to track min values.
   */
  startBlinkTracking(): void {
    this.trackingBlink = true;
    this.leftMin = 1.0;
    this.rightMin = 1.0;
  }

  /**
   * Call when blink ends to get dip magnitudes.
   *
   * @returns Tuple of [leftDip, rightDip] from baseline to minimum
   */
  endBlinkTracking(): { leftDip: number; rightDip: number } {
    this.trackingBlink = false;
    const leftDip = this.leftBaseline - this.leftMin;
    const rightDip = this.rightBaseline - this.rightMin;
    return { leftDip, rightDip };
  }

  /**
   * Get average baseline for both eyes.
   */
  getCombinedBaseline(): number {
    return (this.leftBaseline + this.rightBaseline) / 2;
  }

  /**
   * Check if calibration is complete.
   */
  isCalibrated(): boolean {
    return !this.calibrating;
  }

  /**
   * Reset all state.
   */
  reset(): void {
    this.leftBaseline = 0.3;
    this.rightBaseline = 0.3;
    this.frameCount = 0;
    this.calibrating = true;
    this.leftMin = 1.0;
    this.rightMin = 1.0;
    this.trackingBlink = false;
  }
}
