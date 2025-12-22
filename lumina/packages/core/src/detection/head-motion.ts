/**
 * Head motion tracking from facial landmarks.
 *
 * Tracks head position using nose tip and face corners to detect movement.
 * Used to gate blink detection during head motion (which causes false EAR changes).
 */

import { NOSE_TIP_INDEX, HEAD_MOTION } from './constants';
import { Point2D } from './blink';

export interface HeadMotionResult {
  /** Normalized velocity (face-widths per frame) */
  velocity: number;
  /** True if velocity exceeds threshold */
  isMoving: boolean;
  /** Current (x, y) position */
  position: { x: number; y: number };
  /** Current face width (for normalization) */
  faceWidth: number;
}

/**
 * Tracks head motion by monitoring facial landmark positions.
 *
 * Uses nose tip as primary position indicator, normalized by face width
 * to be scale-invariant (works at different distances from camera).
 */
export class HeadMotionTracker {
  private smoothingAlpha: number;
  private prevPosition: { x: number; y: number } | null = null;
  private smoothedPosition: { x: number; y: number } | null = null;
  private prevFaceWidth: number | null = null;

  constructor(smoothingAlpha: number = HEAD_MOTION.SMOOTHING_ALPHA) {
    this.smoothingAlpha = smoothingAlpha;
  }

  /**
   * Update head position and calculate velocity.
   *
   * @param landmarks Array of 478 MediaPipe face landmarks
   * @returns HeadMotionResult with velocity and motion flag
   */
  update(landmarks: Point2D[]): HeadMotionResult {
    // Extract key landmarks
    const nose = landmarks[NOSE_TIP_INDEX];
    const leftCorner = landmarks[HEAD_MOTION.LEFT_FACE_CORNER_INDEX];
    const rightCorner = landmarks[HEAD_MOTION.RIGHT_FACE_CORNER_INDEX];

    // Current position (nose tip)
    const currentPos = { x: nose.x, y: nose.y };

    // Face width for normalization (distance between face corners)
    let faceWidth = Math.sqrt(
      Math.pow(rightCorner.x - leftCorner.x, 2) +
      Math.pow(rightCorner.y - leftCorner.y, 2)
    );

    // Ensure face width is reasonable (avoid division issues)
    if (faceWidth < 0.01) {
      faceWidth = 0.1;
    }

    // Apply smoothing to position
    if (this.smoothedPosition === null) {
      this.smoothedPosition = currentPos;
    } else {
      this.smoothedPosition = {
        x: this.smoothingAlpha * currentPos.x +
           (1 - this.smoothingAlpha) * this.smoothedPosition.x,
        y: this.smoothingAlpha * currentPos.y +
           (1 - this.smoothingAlpha) * this.smoothedPosition.y,
      };
    }

    // Calculate velocity
    let velocity = 0;
    if (this.prevPosition !== null && this.prevFaceWidth !== null) {
      // Distance moved
      const dx = this.smoothedPosition.x - this.prevPosition.x;
      const dy = this.smoothedPosition.y - this.prevPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Normalize by face width (scale-invariant)
      const avgFaceWidth = (faceWidth + this.prevFaceWidth) / 2;
      velocity = distance / avgFaceWidth;
    }

    // Update state for next frame
    this.prevPosition = { ...this.smoothedPosition };
    this.prevFaceWidth = faceWidth;

    // Check if moving
    const isMoving = velocity > HEAD_MOTION.THRESHOLD;

    return {
      velocity,
      isMoving,
      position: this.smoothedPosition,
      faceWidth,
    };
  }

  /**
   * Reset tracking state. Call when face is lost.
   */
  reset(): void {
    this.prevPosition = null;
    this.smoothedPosition = null;
    this.prevFaceWidth = null;
  }
}
