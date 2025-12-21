/**
 * EAR (Eye Aspect Ratio) Calibrator
 *
 * Implements the "Modified EAR" algorithm for per-user threshold calibration.
 * Instead of using a fixed threshold (0.21), this learns an optimal threshold
 * for each user based on their natural eye shape.
 *
 * Algorithm: threshold = (EAR_open + EAR_closed) / 2
 * Where:
 *   EAR_open = 75th percentile of samples (typical open eye)
 *   EAR_closed = 10th percentile of samples (typical closed eye)
 *
 * @see https://peerj.com/articles/cs-943/
 */

export type CalibrationState = 'uncalibrated' | 'calibrating' | 'calibrated';

export interface EARCalibration {
  /** Computed optimal threshold for this user */
  threshold: number;
  /** 75th percentile - typical open eye EAR */
  openEAR: number;
  /** 10th percentile - typical closed eye EAR */
  closedEAR: number;
  /** When calibration was completed */
  calibratedAt: number;
  /** Number of samples used */
  samplesCount: number;
}

export interface EARCalibratorConfig {
  /** Duration of calibration period in ms. Default: 60000 (60 seconds) */
  calibrationDurationMs?: number;
  /** Minimum samples required for valid calibration. Default: 100 */
  minSamples?: number;
  /** Percentile for open eye EAR. Default: 75 */
  openEyePercentile?: number;
  /** Percentile for closed eye EAR. Default: 10 */
  closedEyePercentile?: number;
  /** Fallback threshold if calibration fails. Default: 0.21 */
  fallbackThreshold?: number;
}

const DEFAULT_CONFIG: Required<EARCalibratorConfig> = {
  calibrationDurationMs: 60_000,
  minSamples: 100,
  openEyePercentile: 75,
  closedEyePercentile: 10,
  fallbackThreshold: 0.21,
};

/**
 * Per-user EAR threshold calibrator using Modified EAR algorithm
 */
export class EARCalibrator {
  private samples: number[] = [];
  private state: CalibrationState = 'uncalibrated';
  private startTime: number | null = null;
  private calibration: EARCalibration | null = null;

  private readonly calibrationDurationMs: number;
  private readonly minSamples: number;
  private readonly openEyePercentile: number;
  private readonly closedEyePercentile: number;
  private readonly fallbackThreshold: number;

  constructor(config?: EARCalibratorConfig) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    this.calibrationDurationMs = cfg.calibrationDurationMs;
    this.minSamples = cfg.minSamples;
    this.openEyePercentile = cfg.openEyePercentile;
    this.closedEyePercentile = cfg.closedEyePercentile;
    this.fallbackThreshold = cfg.fallbackThreshold;
  }

  /**
   * Add an EAR sample and get current threshold
   *
   * @param ear - Raw EAR value from frame
   * @returns Current threshold to use (calibrated or fallback)
   */
  addSample(ear: number): number {
    // Ignore invalid samples
    if (!Number.isFinite(ear) || ear <= 0 || ear > 1) {
      return this.getThreshold();
    }

    // Already calibrated - just return threshold
    if (this.state === 'calibrated') {
      return this.calibration!.threshold;
    }

    // Start calibration on first sample
    if (this.state === 'uncalibrated') {
      this.state = 'calibrating';
      this.startTime = Date.now();
    }

    // Collect sample
    this.samples.push(ear);

    // Check if calibration period is complete
    const elapsed = Date.now() - this.startTime!;
    if (elapsed >= this.calibrationDurationMs) {
      this.finishCalibration();
    }

    return this.getThreshold();
  }

  /**
   * Force calibration with current samples (even if period not complete)
   *
   * @returns Calibration result or null if not enough samples
   */
  forceCalibrate(): EARCalibration | null {
    if (this.samples.length < this.minSamples) {
      return null;
    }

    this.finishCalibration();
    return this.calibration;
  }

  /**
   * Finish calibration and compute threshold
   */
  private finishCalibration(): void {
    if (this.samples.length < this.minSamples) {
      // Not enough samples - stay in calibrating state
      // Will use fallback threshold
      return;
    }

    // Sort samples for percentile calculation
    const sorted = [...this.samples].sort((a, b) => a - b);

    // Calculate percentiles
    const openEAR = this.percentile(sorted, this.openEyePercentile);
    const closedEAR = this.percentile(sorted, this.closedEyePercentile);

    // Modified EAR threshold = midpoint
    const threshold = (openEAR + closedEAR) / 2;

    this.calibration = {
      threshold,
      openEAR,
      closedEAR,
      calibratedAt: Date.now(),
      samplesCount: this.samples.length,
    };

    this.state = 'calibrated';

    // Clear samples to free memory
    this.samples = [];
  }

  /**
   * Calculate percentile of sorted array
   */
  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    if (sortedArray.length === 1) return sortedArray[0];

    const index = (p / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (upper >= sortedArray.length) {
      return sortedArray[sortedArray.length - 1];
    }

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Get current calibration state
   */
  getState(): CalibrationState {
    return this.state;
  }

  /**
   * Get calibration progress (0-1)
   */
  getProgress(): number {
    if (this.state === 'calibrated') return 1;
    if (this.state === 'uncalibrated') return 0;

    const elapsed = Date.now() - this.startTime!;
    return Math.min(1, elapsed / this.calibrationDurationMs);
  }

  /**
   * Get current threshold (calibrated or fallback)
   */
  getThreshold(): number {
    if (this.calibration) {
      return this.calibration.threshold;
    }
    return this.fallbackThreshold;
  }

  /**
   * Check if calibration is complete
   */
  isCalibrated(): boolean {
    return this.state === 'calibrated';
  }

  /**
   * Get the full calibration data (for persistence)
   */
  getCalibration(): EARCalibration | null {
    return this.calibration;
  }

  /**
   * Load existing calibration (from storage)
   */
  loadCalibration(calibration: EARCalibration): void {
    this.calibration = calibration;
    this.state = 'calibrated';
    this.samples = [];
  }

  /**
   * Export calibration for persistence
   */
  exportCalibration(): EARCalibration | null {
    return this.calibration ? { ...this.calibration } : null;
  }

  /**
   * Get number of samples collected (during calibration)
   */
  getSampleCount(): number {
    return this.samples.length;
  }

  /**
   * Reset to uncalibrated state
   */
  reset(): void {
    this.samples = [];
    this.state = 'uncalibrated';
    this.startTime = null;
    this.calibration = null;
  }

  /**
   * Restart calibration (keeping existing calibration as fallback)
   */
  recalibrate(): void {
    this.samples = [];
    this.state = 'uncalibrated';
    this.startTime = null;
    // Keep existing calibration - will be used as fallback during recalibration
  }
}
