/**
 * Drowsiness detection using PERCLOS and yawn frequency.
 *
 * PERCLOS = Percentage of Eye Closure
 * Standard metric used in driver fatigue detection systems.
 *
 * Drowsiness levels based on:
 * - PERCLOS: % of time eyes are closed in a sliding window
 * - Yawn frequency: Number of yawns in tracking window
 */

import { DROWSINESS } from './constants';

// ============================================================================
// Types
// ============================================================================

export type DrowsinessLevel = 'alert' | 'mild' | 'moderate' | 'severe';

export interface DrowsinessResult {
  /** PERCLOS percentage (0-100) */
  perclos: number;
  /** Current drowsiness level */
  drowsinessLevel: DrowsinessLevel;
  /** True if not 'alert' */
  isDrowsy: boolean;
  /** Yawns in tracking window */
  recentYawns: number;
  /** Number of EAR samples in window */
  earSamples: number;
  /** Number of samples where eyes were closed */
  closedSamples: number;
}

interface EARSample {
  timestamp: number;
  ear: number;
}

// ============================================================================
// Drowsiness Detector
// ============================================================================

/**
 * Detects drowsiness by combining PERCLOS and yawn frequency.
 *
 * PERCLOS = (frames with eyes closed) / (total frames) * 100
 *
 * Drowsiness levels:
 * - alert: PERCLOS < 15% AND yawns < 1
 * - mild: PERCLOS 15-20% OR 1 yawn
 * - moderate: PERCLOS 20-30% OR 2 yawns
 * - severe: PERCLOS > 30% OR 3+ yawns
 *
 * Usage:
 * ```typescript
 * const detector = new DrowsinessDetector();
 *
 * // In detection loop
 * detector.addFrame(avgEAR, isYawn);
 * const result = detector.getDrowsiness();
 * console.log('Drowsiness level:', result.drowsinessLevel);
 * ```
 */
export class DrowsinessDetector {
  private windowMs: number;
  private earHistory: EARSample[] = [];
  private yawnHistory: number[] = [];

  constructor(windowMs: number = DROWSINESS.PERCLOS_WINDOW_MS) {
    this.windowMs = windowMs;
  }

  /**
   * Add a frame's EAR value to history.
   *
   * @param ear Eye Aspect Ratio for this frame
   * @param isYawn True if a yawn was detected this frame
   * @param timestampMs Frame timestamp
   */
  addFrame(ear: number, isYawn: boolean = false, timestampMs?: number): void {
    const now = timestampMs ?? performance.now();

    this.earHistory.push({ timestamp: now, ear });

    if (isYawn) {
      this.yawnHistory.push(now);
    }

    // Prune old data
    this.pruneHistory(now);
  }

  /**
   * Remove samples outside the window.
   */
  private pruneHistory(currentTimeMs: number): void {
    const cutoff = currentTimeMs - this.windowMs;

    // Prune EAR history
    while (this.earHistory.length > 0 && this.earHistory[0].timestamp < cutoff) {
      this.earHistory.shift();
    }

    // Prune yawn history (uses longer window)
    const yawnCutoff = currentTimeMs - DROWSINESS.YAWN_WINDOW_MS;
    while (this.yawnHistory.length > 0 && this.yawnHistory[0] < yawnCutoff) {
      this.yawnHistory.shift();
    }
  }

  /**
   * Calculate current drowsiness level.
   *
   * @param timestampMs Current timestamp
   */
  getDrowsiness(timestampMs?: number): DrowsinessResult {
    const now = timestampMs ?? performance.now();
    this.pruneHistory(now);

    const totalSamples = this.earHistory.length;

    // Need minimum samples for reliable PERCLOS
    if (totalSamples < 30) {
      // ~1 second at 30fps
      return {
        perclos: 0,
        drowsinessLevel: 'alert',
        isDrowsy: false,
        recentYawns: this.yawnHistory.length,
        earSamples: totalSamples,
        closedSamples: 0,
      };
    }

    // Count closed frames
    const closedSamples = this.earHistory.filter(
      sample => sample.ear < DROWSINESS.CLOSED_THRESHOLD
    ).length;

    // Calculate PERCLOS
    const perclos = (closedSamples / totalSamples) * 100;

    // Count recent yawns
    const recentYawns = this.yawnHistory.length;

    // Determine drowsiness level
    const drowsinessLevel = this.classifyDrowsiness(perclos, recentYawns);
    const isDrowsy = drowsinessLevel !== 'alert';

    return {
      perclos,
      drowsinessLevel,
      isDrowsy,
      recentYawns,
      earSamples: totalSamples,
      closedSamples,
    };
  }

  /**
   * Classify drowsiness level based on PERCLOS and yawns.
   *
   * Uses OR logic - either metric can indicate drowsiness.
   */
  private classifyDrowsiness(perclos: number, yawnCount: number): DrowsinessLevel {
    // Severe
    if (perclos > DROWSINESS.LEVELS.MODERATE || yawnCount >= DROWSINESS.YAWN_COUNTS.SEVERE) {
      return 'severe';
    }

    // Moderate
    if (perclos > DROWSINESS.LEVELS.MILD || yawnCount >= DROWSINESS.YAWN_COUNTS.MODERATE) {
      return 'moderate';
    }

    // Mild
    if (perclos > DROWSINESS.LEVELS.ALERT || yawnCount >= DROWSINESS.YAWN_COUNTS.MILD) {
      return 'mild';
    }

    // Alert
    return 'alert';
  }

  /**
   * Clear all history.
   */
  reset(): void {
    this.earHistory = [];
    this.yawnHistory = [];
  }

  /**
   * Get current detector statistics.
   */
  getStats(): { earSamples: number; yawnCount: number; windowMs: number } {
    return {
      earSamples: this.earHistory.length,
      yawnCount: this.yawnHistory.length,
      windowMs: this.windowMs,
    };
  }
}
