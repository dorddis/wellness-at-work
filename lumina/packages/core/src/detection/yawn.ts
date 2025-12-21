/**
 * Yawn detection using Mouth Aspect Ratio (MAR).
 *
 * Similar to EAR (Eye Aspect Ratio) but for mouth.
 * Yawn = mouth open (high MAR) for extended duration.
 *
 * MAR = vertical_opening / horizontal_width
 * Higher MAR = mouth more open.
 */

import { MOUTH_INDICES, YAWN } from './constants';
import { Point2D } from './blink';

// ============================================================================
// Types
// ============================================================================

export interface YawnResult {
  /** Mouth Aspect Ratio (0-1+) */
  mar: number;
  /** MAR above threshold */
  isMouthOpen: boolean;
  /** Mouth open for required duration */
  isYawning: boolean;
  /** How long mouth has been open (ms) */
  yawnDurationMs: number;
  /** Total yawns detected */
  yawnCount: number;
  /** Recently detected a yawn */
  inCooldown: boolean;
}

// ============================================================================
// MAR Calculation
// ============================================================================

/**
 * Calculate Mouth Aspect Ratio.
 *
 * MAR = vertical_opening / horizontal_width
 *
 * @param landmarks MediaPipe face landmarks
 * @returns MAR value (typically 0.1-0.3 closed, 0.5+ open wide)
 */
export function calculateMAR(landmarks: Point2D[]): number {
  const upperLip = landmarks[MOUTH_INDICES.UPPER_LIP];
  const lowerLip = landmarks[MOUTH_INDICES.LOWER_LIP];
  const leftCorner = landmarks[MOUTH_INDICES.LEFT_CORNER];
  const rightCorner = landmarks[MOUTH_INDICES.RIGHT_CORNER];

  // Vertical mouth opening
  const verticalDist = Math.sqrt(
    Math.pow(upperLip.x - lowerLip.x, 2) +
    Math.pow(upperLip.y - lowerLip.y, 2)
  );

  // Horizontal mouth width
  const horizontalDist = Math.sqrt(
    Math.pow(leftCorner.x - rightCorner.x, 2) +
    Math.pow(leftCorner.y - rightCorner.y, 2)
  );

  // Avoid division by zero
  if (horizontalDist < 0.001) {
    return 0;
  }

  return verticalDist / horizontalDist;
}

// ============================================================================
// Yawn Detector
// ============================================================================

/**
 * Detects yawns based on prolonged mouth opening.
 *
 * A yawn is detected when:
 * - MAR exceeds threshold (mouth is open)
 * - Stays open for YAWN_DURATION_MS or longer
 *
 * Usage:
 * ```typescript
 * const detector = new YawnDetector();
 *
 * // In detection loop
 * const result = detector.update(landmarks);
 * if (result.isYawning) {
 *   console.log('Yawn detected!', result.yawnCount);
 * }
 * ```
 */
export class YawnDetector {
  private mouthOpenStart: number | null = null;
  private _yawnCount: number = 0;
  private lastYawnTime: number = 0;
  private yawnTimestamps: number[] = [];

  get yawnCount(): number {
    return this._yawnCount;
  }

  /**
   * Process frame and detect yawns.
   *
   * @param landmarks MediaPipe face landmarks
   * @param timestampMs Current timestamp in milliseconds
   */
  update(landmarks: Point2D[], timestampMs?: number): YawnResult {
    const now = timestampMs ?? performance.now();
    const mar = calculateMAR(landmarks);
    const isMouthOpen = mar > YAWN.MAR_THRESHOLD;

    // Check cooldown
    const inCooldown = (now - this.lastYawnTime) < YAWN.COOLDOWN_MS;

    let yawnDurationMs = 0;
    let isYawning = false;

    if (isMouthOpen && !inCooldown) {
      // Mouth is open
      if (this.mouthOpenStart === null) {
        this.mouthOpenStart = now;
      }

      yawnDurationMs = now - this.mouthOpenStart;

      // Check if qualifies as yawn
      if (yawnDurationMs >= YAWN.DURATION_MS) {
        isYawning = true;

        // Count yawn once (when first detected)
        // Within 100ms of threshold crossing
        if (yawnDurationMs < YAWN.DURATION_MS + 100) {
          this._yawnCount++;
          this.lastYawnTime = now;
          this.yawnTimestamps.push(now);
        }
      }
    } else {
      // Mouth closed or in cooldown
      this.mouthOpenStart = null;
    }

    return {
      mar,
      isMouthOpen,
      isYawning,
      yawnDurationMs,
      yawnCount: this._yawnCount,
      inCooldown,
    };
  }

  /**
   * Get list of yawn timestamps for drowsiness calculation.
   */
  getYawnTimestamps(): number[] {
    return [...this.yawnTimestamps];
  }

  /**
   * Count yawns within a time window.
   *
   * @param windowMs Time window in milliseconds
   * @param currentTimeMs Current time (uses performance.now if not provided)
   */
  getRecentYawns(windowMs: number, currentTimeMs?: number): number {
    const now = currentTimeMs ?? performance.now();
    const cutoff = now - windowMs;
    return this.yawnTimestamps.filter(t => t > cutoff).length;
  }

  /**
   * Reset detector state.
   */
  reset(): void {
    this.mouthOpenStart = null;
    this._yawnCount = 0;
    this.lastYawnTime = 0;
    this.yawnTimestamps = [];
  }
}
