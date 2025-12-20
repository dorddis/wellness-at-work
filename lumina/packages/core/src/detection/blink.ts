/**
 * Blink detection using Eye Aspect Ratio (EAR) algorithm
 *
 * EAR = (|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|)
 *
 * Where p1-p6 are the 6 eye landmarks:
 * p1: outer corner, p2: upper outer, p3: upper inner
 * p4: inner corner, p5: lower inner, p6: lower outer
 */

import {
  LEFT_EYE_INDICES,
  RIGHT_EYE_INDICES,
  EAR_THRESHOLD,
  CONSEC_FRAMES,
  GLASSES_CONFIDENCE_THRESHOLD,
} from './constants';

export interface Point2D {
  x: number;
  y: number;
}

export interface BlinkDetectionResult {
  isBlink: boolean;
  leftEAR: number;
  rightEAR: number;
  avgEAR: number;
  confidence: number;
}

/**
 * Calculate Euclidean distance between two 2D points
 */
export function euclideanDistance(p1: Point2D, p2: Point2D): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculate Eye Aspect Ratio for a set of 6 eye landmarks
 *
 * @param landmarks Array of 6 points: [outer, upperOuter, upperInner, inner, lowerInner, lowerOuter]
 * @returns EAR value (lower = more closed)
 */
export function calculateEAR(landmarks: Point2D[]): number {
  if (landmarks.length !== 6) {
    throw new Error('EAR calculation requires exactly 6 landmarks');
  }

  // Vertical distances
  const A = euclideanDistance(landmarks[1], landmarks[5]); // upper outer to lower outer
  const B = euclideanDistance(landmarks[2], landmarks[4]); // upper inner to lower inner

  // Horizontal distance
  const C = euclideanDistance(landmarks[0], landmarks[3]); // outer corner to inner corner

  // Avoid division by zero
  if (C === 0) return 0;

  return (A + B) / (2.0 * C);
}

/**
 * Extract eye landmarks from MediaPipe face landmarks
 */
export function extractEyeLandmarks(
  faceLandmarks: Point2D[],
  eyeIndices: readonly number[]
): Point2D[] {
  return eyeIndices.map(index => faceLandmarks[index]);
}

/**
 * Blink detector class with frame-by-frame state tracking
 */
export class BlinkDetector {
  private frameCounter = 0;
  private blinkCount = 0;
  private lastEAR = 1.0;
  private isEyeClosed = false;

  /**
   * Process a single frame and detect blinks
   *
   * @param faceLandmarks Array of 478 MediaPipe face landmarks
   * @param confidence Detection confidence (0-1)
   * @returns Blink detection result
   */
  detect(faceLandmarks: Point2D[], confidence: number): BlinkDetectionResult {
    // Extract eye landmarks
    const leftEyeLandmarks = extractEyeLandmarks(faceLandmarks, LEFT_EYE_INDICES);
    const rightEyeLandmarks = extractEyeLandmarks(faceLandmarks, RIGHT_EYE_INDICES);

    // Calculate EAR for each eye
    const leftEAR = calculateEAR(leftEyeLandmarks);
    const rightEAR = calculateEAR(rightEyeLandmarks);

    // Handle glasses/occlusion: use single eye if one has low confidence
    let avgEAR: number;
    if (confidence < GLASSES_CONFIDENCE_THRESHOLD) {
      // Use the eye with higher EAR (less occluded)
      avgEAR = Math.max(leftEAR, rightEAR);
    } else {
      avgEAR = (leftEAR + rightEAR) / 2.0;
    }

    // Blink detection logic
    let isBlink = false;

    if (avgEAR < EAR_THRESHOLD) {
      this.frameCounter++;
      this.isEyeClosed = true;
    } else {
      // Eyes opened after being closed
      if (this.frameCounter >= CONSEC_FRAMES && this.isEyeClosed) {
        this.blinkCount++;
        isBlink = true;
      }
      this.frameCounter = 0;
      this.isEyeClosed = false;
    }

    this.lastEAR = avgEAR;

    return {
      isBlink,
      leftEAR,
      rightEAR,
      avgEAR,
      confidence,
    };
  }

  /**
   * Get total blink count since detector was created/reset
   */
  getBlinkCount(): number {
    return this.blinkCount;
  }

  /**
   * Get current EAR value
   */
  getCurrentEAR(): number {
    return this.lastEAR;
  }

  /**
   * Reset blink counter (e.g., for new session)
   */
  reset(): void {
    this.frameCounter = 0;
    this.blinkCount = 0;
    this.lastEAR = 1.0;
    this.isEyeClosed = false;
  }
}
