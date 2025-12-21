/**
 * Eye Quality Tracker for per-eye stability assessment
 *
 * Tracks EAR variance over a sliding window for each eye independently.
 * Helps handle asymmetric occlusion (e.g., glasses reflection on one side)
 * by preferring the more stable eye for blink detection.
 *
 * Key insight: A stable eye has low EAR variance between frames.
 * Glasses reflections, shadows, and occlusions cause high variance.
 */

export interface EyeQualityConfig {
  /** Number of frames for variance calculation window. Default: 10 */
  windowSize?: number;
  /** Variance threshold below which eye is considered stable. Default: 0.02 */
  qualityThreshold?: number;
}

const DEFAULT_CONFIG: Required<EyeQualityConfig> = {
  windowSize: 10,
  qualityThreshold: 0.02,
};

export type PreferredEye = 'left' | 'right' | 'both';

export interface EyeQuality {
  /** Variance of left eye EAR over window */
  leftVariance: number;
  /** Variance of right eye EAR over window */
  rightVariance: number;
  /** Which eye to prefer based on stability */
  preferredEye: PreferredEye;
  /** Is left eye considered stable? */
  leftStable: boolean;
  /** Is right eye considered stable? */
  rightStable: boolean;
}

/**
 * Tracks per-eye EAR stability to select the most reliable eye
 */
export class EyeQualityTracker {
  private leftBuffer: number[] = [];
  private rightBuffer: number[] = [];
  private readonly windowSize: number;
  private readonly qualityThreshold: number;

  constructor(config?: EyeQualityConfig) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    this.windowSize = cfg.windowSize;
    this.qualityThreshold = cfg.qualityThreshold;
  }

  /**
   * Add a frame's EAR values for both eyes
   */
  addFrame(leftEAR: number, rightEAR: number): void {
    // Add to buffers (circular)
    this.leftBuffer.push(leftEAR);
    this.rightBuffer.push(rightEAR);

    // Trim to window size
    if (this.leftBuffer.length > this.windowSize) {
      this.leftBuffer.shift();
    }
    if (this.rightBuffer.length > this.windowSize) {
      this.rightBuffer.shift();
    }
  }

  /**
   * Calculate variance of an array of values
   */
  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Get current eye quality assessment
   */
  getQuality(): EyeQuality {
    const leftVariance = this.calculateVariance(this.leftBuffer);
    const rightVariance = this.calculateVariance(this.rightBuffer);

    const leftStable = leftVariance <= this.qualityThreshold;
    const rightStable = rightVariance <= this.qualityThreshold;

    let preferredEye: PreferredEye;

    if (leftStable && rightStable) {
      // Both stable - use both (average)
      preferredEye = 'both';
    } else if (leftStable && !rightStable) {
      // Only left stable
      preferredEye = 'left';
    } else if (!leftStable && rightStable) {
      // Only right stable
      preferredEye = 'right';
    } else {
      // Neither stable - use the less unstable one
      preferredEye = leftVariance <= rightVariance ? 'left' : 'right';
    }

    return {
      leftVariance,
      rightVariance,
      preferredEye,
      leftStable,
      rightStable,
    };
  }

  /**
   * Get the best EAR value based on eye quality
   *
   * Replaces the naive max(left, right) approach with quality-aware selection.
   *
   * @param leftEAR - Left eye EAR
   * @param rightEAR - Right eye EAR
   * @returns Best EAR value to use
   */
  getBestEAR(leftEAR: number, rightEAR: number): number {
    // Need some data in buffers first
    if (this.leftBuffer.length < 3) {
      // Not enough data - fall back to average
      return (leftEAR + rightEAR) / 2;
    }

    const quality = this.getQuality();

    switch (quality.preferredEye) {
      case 'left':
        return leftEAR;
      case 'right':
        return rightEAR;
      case 'both':
      default:
        return (leftEAR + rightEAR) / 2;
    }
  }

  /**
   * Check if we have enough data for reliable quality assessment
   */
  hasEnoughData(): boolean {
    return this.leftBuffer.length >= this.windowSize;
  }

  /**
   * Get number of samples collected
   */
  getSampleCount(): number {
    return Math.min(this.leftBuffer.length, this.rightBuffer.length);
  }

  /**
   * Reset tracker state
   */
  reset(): void {
    this.leftBuffer = [];
    this.rightBuffer = [];
  }
}
