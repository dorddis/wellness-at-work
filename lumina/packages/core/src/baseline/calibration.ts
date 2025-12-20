/**
 * Baseline Calibration
 * Auto-calibrates user's personal baseline over 2 hours of use
 */

import { SESSION } from '../detection/constants';

export interface Baseline {
  blinkP25: number;  // 25th percentile (low threshold)
  blinkP50: number;  // 50th percentile (median)
  blinkP75: number;  // 75th percentile (high threshold)
  calibratedAt: number;
  samplesCount: number;
}

export interface CalibrationSample {
  blinkRate: number;
  timestamp: number;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const index = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (index - lower);
}

/**
 * Baseline Calibration Manager
 * Collects blink rate samples and computes percentiles
 */
export class BaselineCalibrator {
  private samples: CalibrationSample[] = [];
  private baseline: Baseline | null = null;
  private calibrationStartTime: number | null = null;

  /**
   * Add a blink rate sample
   *
   * @param blinkRate Blinks per minute
   */
  addSample(blinkRate: number): void {
    const now = Date.now();

    // Start calibration if not started
    if (this.calibrationStartTime === null) {
      this.calibrationStartTime = now;
    }

    // Only add valid samples (non-zero blink rate)
    if (blinkRate > 0) {
      this.samples.push({
        blinkRate,
        timestamp: now,
      });
    }

    // Check if calibration duration reached
    if (now - this.calibrationStartTime >= SESSION.BASELINE_DURATION) {
      this.computeBaseline();
    }
  }

  /**
   * Compute baseline from collected samples
   */
  private computeBaseline(): void {
    if (this.samples.length < 10) {
      // Not enough samples
      return;
    }

    // Sort blink rates
    const rates = this.samples.map((s) => s.blinkRate).sort((a, b) => a - b);

    this.baseline = {
      blinkP25: percentile(rates, 25),
      blinkP50: percentile(rates, 50),
      blinkP75: percentile(rates, 75),
      calibratedAt: Date.now(),
      samplesCount: rates.length,
    };
  }

  /**
   * Force baseline computation (for manual trigger)
   */
  forceCompute(): Baseline | null {
    this.computeBaseline();
    return this.baseline;
  }

  /**
   * Get current baseline (null if not yet calibrated)
   */
  getBaseline(): Baseline | null {
    return this.baseline;
  }

  /**
   * Check if calibration is complete
   */
  isCalibrated(): boolean {
    return this.baseline !== null;
  }

  /**
   * Get calibration progress (0-1)
   */
  getProgress(): number {
    if (this.calibrationStartTime === null) return 0;
    const elapsed = Date.now() - this.calibrationStartTime;
    return Math.min(elapsed / SESSION.BASELINE_DURATION, 1);
  }

  /**
   * Get sample count
   */
  getSampleCount(): number {
    return this.samples.length;
  }

  /**
   * Load existing baseline (e.g., from database)
   */
  loadBaseline(baseline: Baseline): void {
    this.baseline = baseline;
  }

  /**
   * Reset calibration
   */
  reset(): void {
    this.samples = [];
    this.baseline = null;
    this.calibrationStartTime = null;
  }

  /**
   * Export samples for persistence
   */
  exportSamples(): CalibrationSample[] {
    return [...this.samples];
  }

  /**
   * Import samples (e.g., from database)
   */
  importSamples(samples: CalibrationSample[]): void {
    this.samples = samples;
    if (samples.length > 0) {
      this.calibrationStartTime = samples[0].timestamp;
    }
  }
}
