/**
 * Slope (first derivative) calculation for EAR signal.
 *
 * Detects blink phases by analyzing the rate of change of EAR over time.
 * This is more robust than simple threshold detection for mini blinks.
 */

import { SLOPE } from './constants';

export interface SlopeResult {
  /** EAR change per millisecond */
  slope: number;
  /** True if significant negative slope (eyes closing) */
  isClosing: boolean;
  /** True if significant positive slope (eyes opening) */
  isOpening: boolean;
  /** True if slope near zero (at blink minimum) */
  isAtMinimum: boolean;
  /** Current EAR value */
  rawEar: number;
  /** When this was calculated */
  timestampMs: number;
}

interface HistoryEntry {
  timestampMs: number;
  ear: number;
}

/**
 * Calculates first derivative of EAR signal to detect blink phases.
 *
 * Uses a sliding window to compute slope, which smooths out noise
 * while still being responsive to rapid changes.
 */
export class SlopeDetector {
  private windowSize: number;
  private history: HistoryEntry[] = [];

  constructor(windowSize: number = SLOPE.WINDOW_FRAMES) {
    this.windowSize = windowSize;
  }

  /**
   * Add new EAR value and calculate slope.
   *
   * @param ear Current Eye Aspect Ratio value
   * @param timestampMs Timestamp in milliseconds (uses performance.now() if not provided)
   * @returns SlopeResult with slope value and phase detection flags
   */
  update(ear: number, timestampMs?: number): SlopeResult {
    const ts = timestampMs ?? performance.now();

    this.history.push({ timestampMs: ts, ear });

    // Keep only windowSize + 1 entries
    while (this.history.length > this.windowSize + 1) {
      this.history.shift();
    }

    // Need at least 2 points to calculate slope
    if (this.history.length < 2) {
      return {
        slope: 0,
        isClosing: false,
        isOpening: false,
        isAtMinimum: false,
        rawEar: ear,
        timestampMs: ts,
      };
    }

    // Calculate slope using oldest and newest points in window
    const oldest = this.history[0];
    const newest = this.history[this.history.length - 1];

    let dt = newest.timestampMs - oldest.timestampMs;
    if (dt <= 0) {
      dt = 1; // Prevent division by zero
    }

    const slope = (newest.ear - oldest.ear) / dt;

    // Classify the slope
    const isClosing = slope < SLOPE.CLOSING_THRESHOLD;
    const isOpening = slope > SLOPE.OPENING_THRESHOLD;
    const isAtMinimum = Math.abs(slope) < SLOPE.NEAR_ZERO && !isClosing && !isOpening;

    return {
      slope,
      isClosing,
      isOpening,
      isAtMinimum,
      rawEar: ear,
      timestampMs: ts,
    };
  }

  /**
   * Clear history. Call when detection state resets.
   */
  reset(): void {
    this.history = [];
  }

  /**
   * Get slope history for debugging.
   */
  getHistory(): HistoryEntry[] {
    return [...this.history];
  }
}
