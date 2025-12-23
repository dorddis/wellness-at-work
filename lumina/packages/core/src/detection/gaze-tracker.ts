/**
 * GazeTracker - Detects vertical gaze direction to prevent false blink detection
 *
 * When a user looks down and back up quickly, the EAR pattern mimics a blink.
 * This tracker detects such gaze shifts by monitoring iris position relative
 * to the eye opening.
 *
 * Key insight: During a real blink, the iris is hidden and doesn't move.
 * During a gaze shift, the iris moves significantly while EAR changes.
 */

import { IRIS_INDICES, EYE_LID_INDICES, GAZE_TRACKING } from './constants';
import { Point2D } from './blink';

export interface GazeResult {
  /** Iris Y position ratio (0=top of eye, 1=bottom, 0.5=centered) */
  leftIrisRatio: number;
  /** Iris Y position ratio for right eye */
  rightIrisRatio: number;
  /** Average iris ratio (both eyes) */
  avgIrisRatio: number;
  /** Smoothed iris ratio (EMA filtered) */
  smoothedIrisRatio: number;
  /** Current iris velocity (ratio units per frame, positive = looking down) */
  velocity: number;
  /** True if significant gaze shift detected in recent window */
  isGazeShift: boolean;
  /** Total displacement in detection window */
  recentDisplacement: number;
  /** True if tracking is reliable (eyes sufficiently open) */
  isReliable: boolean;
}

interface GazeSample {
  irisRatio: number;
  timestamp: number;
}

/**
 * Tracks iris position to detect vertical gaze shifts (looking up/down).
 *
 * Usage:
 *   const tracker = new GazeTracker();
 *
 *   for (const frame of cameraFrames) {
 *     const landmarks = mediapipe.detect(frame);
 *     const result = tracker.update(landmarks, timestamp);
 *
 *     if (result.isGazeShift) {
 *       // Suppress blink detection - this is a gaze movement, not a blink
 *     }
 *   }
 */
export class GazeTracker {
  // Smoothed iris position
  private smoothedIrisRatio: number = 0.5;

  // History for velocity calculation
  private history: GazeSample[] = [];

  // Configuration
  private readonly velocityWindowFrames: number;
  private readonly velocityThreshold: number;
  private readonly detectionWindowMs: number;
  private readonly displacementThreshold: number;
  private readonly smoothingAlpha: number;
  private readonly minEyeOpeningPixels: number;
  private readonly enabled: boolean;

  constructor(config?: Partial<typeof GAZE_TRACKING>) {
    const cfg = { ...GAZE_TRACKING, ...config };
    this.velocityWindowFrames = cfg.VELOCITY_WINDOW_FRAMES;
    this.velocityThreshold = cfg.VELOCITY_THRESHOLD;
    this.detectionWindowMs = cfg.DETECTION_WINDOW_MS;
    this.displacementThreshold = cfg.MIN_DISPLACEMENT_THRESHOLD;
    this.smoothingAlpha = cfg.SMOOTHING_ALPHA;
    this.minEyeOpeningPixels = cfg.MIN_EYE_OPENING_PIXELS;
    this.enabled = cfg.ENABLED;
  }

  /**
   * Calculate iris Y position ratio within the eye opening.
   *
   * @param iris Iris center landmark
   * @param upperLid Upper eyelid center landmark
   * @param lowerLid Lower eyelid center landmark
   * @returns Ratio from 0 (top) to 1 (bottom), 0.5 is centered
   */
  private calculateIrisRatio(
    iris: Point2D,
    upperLid: Point2D,
    lowerLid: Point2D
  ): { ratio: number; eyeOpening: number } {
    const eyeOpening = lowerLid.y - upperLid.y;

    // If eye is closed or nearly closed, ratio is unreliable
    if (eyeOpening <= 0) {
      return { ratio: 0.5, eyeOpening: 0 };
    }

    // Calculate where iris is within the eye opening
    const irisPosition = iris.y - upperLid.y;
    const ratio = irisPosition / eyeOpening;

    // Clamp to valid range (iris shouldn't be outside eye)
    const clampedRatio = Math.max(0, Math.min(1, ratio));

    return { ratio: clampedRatio, eyeOpening };
  }

  /**
   * Update tracker with new frame landmarks.
   *
   * @param landmarks Array of 478 MediaPipe face landmarks
   * @param timestampMs Current timestamp in milliseconds
   * @returns GazeResult with current gaze state
   */
  update(landmarks: Point2D[], timestampMs?: number): GazeResult {
    const ts = timestampMs ?? performance.now();

    // Default result for disabled or unreliable tracking
    const defaultResult: GazeResult = {
      leftIrisRatio: 0.5,
      rightIrisRatio: 0.5,
      avgIrisRatio: 0.5,
      smoothedIrisRatio: this.smoothedIrisRatio,
      velocity: 0,
      isGazeShift: false,
      recentDisplacement: 0,
      isReliable: false,
    };

    if (!this.enabled) {
      return defaultResult;
    }

    // Extract landmarks
    const leftIris = landmarks[IRIS_INDICES.LEFT_CENTER];
    const rightIris = landmarks[IRIS_INDICES.RIGHT_CENTER];
    const leftUpperLid = landmarks[EYE_LID_INDICES.LEFT_UPPER];
    const leftLowerLid = landmarks[EYE_LID_INDICES.LEFT_LOWER];
    const rightUpperLid = landmarks[EYE_LID_INDICES.RIGHT_UPPER];
    const rightLowerLid = landmarks[EYE_LID_INDICES.RIGHT_LOWER];

    // Validate landmarks exist
    if (!leftIris || !rightIris || !leftUpperLid || !leftLowerLid ||
        !rightUpperLid || !rightLowerLid) {
      return defaultResult;
    }

    // Calculate iris ratios for each eye
    const leftResult = this.calculateIrisRatio(leftIris, leftUpperLid, leftLowerLid);
    const rightResult = this.calculateIrisRatio(rightIris, rightUpperLid, rightLowerLid);

    // Check if eyes are open enough for reliable tracking
    const minOpening = Math.min(leftResult.eyeOpening, rightResult.eyeOpening);
    const isReliable = minOpening >= this.minEyeOpeningPixels;

    if (!isReliable) {
      // Eyes too closed - don't update smoothed values, just return current state
      return {
        ...defaultResult,
        leftIrisRatio: leftResult.ratio,
        rightIrisRatio: rightResult.ratio,
        avgIrisRatio: (leftResult.ratio + rightResult.ratio) / 2,
        isReliable: false,
      };
    }

    // Average both eyes for robustness
    const avgIrisRatio = (leftResult.ratio + rightResult.ratio) / 2;

    // Apply EMA smoothing
    this.smoothedIrisRatio =
      this.smoothingAlpha * avgIrisRatio +
      (1 - this.smoothingAlpha) * this.smoothedIrisRatio;

    // Add to history
    this.history.push({ irisRatio: this.smoothedIrisRatio, timestamp: ts });

    // Prune old history (keep enough for velocity + displacement calculation)
    const cutoffTime = ts - this.detectionWindowMs;
    while (this.history.length > 0 && this.history[0].timestamp < cutoffTime) {
      this.history.shift();
    }

    // Calculate velocity (change over last N frames)
    let velocity = 0;
    if (this.history.length >= 2) {
      const recent = this.history.slice(-this.velocityWindowFrames);
      if (recent.length >= 2) {
        const oldest = recent[0];
        const newest = recent[recent.length - 1];
        const frames = recent.length - 1;
        velocity = (newest.irisRatio - oldest.irisRatio) / frames;
      }
    }

    // Calculate total displacement in detection window
    let recentDisplacement = 0;
    if (this.history.length >= 2) {
      // Find min and max in window
      let minRatio = Infinity;
      let maxRatio = -Infinity;
      for (const sample of this.history) {
        minRatio = Math.min(minRatio, sample.irisRatio);
        maxRatio = Math.max(maxRatio, sample.irisRatio);
      }
      recentDisplacement = maxRatio - minRatio;
    }

    // Detect gaze shift: high velocity OR large displacement
    const isGazeShift =
      Math.abs(velocity) > this.velocityThreshold ||
      recentDisplacement > this.displacementThreshold;

    return {
      leftIrisRatio: leftResult.ratio,
      rightIrisRatio: rightResult.ratio,
      avgIrisRatio,
      smoothedIrisRatio: this.smoothedIrisRatio,
      velocity,
      isGazeShift,
      recentDisplacement,
      isReliable,
    };
  }

  /**
   * Check if a gaze shift occurred recently (for blink rejection).
   * This is a convenience method for use in blink detection.
   *
   * @returns True if significant gaze movement detected in recent window
   */
  hasRecentGazeShift(): boolean {
    if (this.history.length < 2) {
      return false;
    }

    // Check displacement in window
    let minRatio = Infinity;
    let maxRatio = -Infinity;
    for (const sample of this.history) {
      minRatio = Math.min(minRatio, sample.irisRatio);
      maxRatio = Math.max(maxRatio, sample.irisRatio);
    }
    const displacement = maxRatio - minRatio;

    return displacement > this.displacementThreshold;
  }

  /**
   * Get current gaze direction as a descriptive string.
   */
  getGazeDirection(): 'up' | 'center' | 'down' {
    if (this.smoothedIrisRatio < 0.4) {
      return 'up';
    } else if (this.smoothedIrisRatio > 0.6) {
      return 'down';
    }
    return 'center';
  }

  /**
   * Reset tracker state.
   */
  reset(): void {
    this.smoothedIrisRatio = 0.5;
    this.history = [];
  }

  /**
   * Check if gaze tracking is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
