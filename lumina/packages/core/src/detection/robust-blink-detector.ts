/**
 * Robust Blink Detector - Main integration module.
 *
 * Combines all components:
 * - Bilateral EAR calculation (both eyes)
 * - Slope detection (rate of change)
 * - Head motion gating (suppress during movement)
 * - State machine (phase tracking)
 *
 * This is more accurate than simple threshold detection, especially for:
 * - Mini blinks
 * - Glasses wearers
 * - Variable lighting conditions
 */

import { Point2D } from './blink';
import { SlopeDetector, SlopeResult } from './slope-detector';
import { HeadMotionTracker, HeadMotionResult } from './head-motion';
import { BilateralVerifier, BilateralResult } from './bilateral';
import { BlinkStateMachine, BlinkPhase, BlinkEvent, StateMachineResult } from './blink-state-machine';

export interface RobustBlinkResult {
  /** True if a valid blink was detected this frame */
  isBlink: boolean;
  /** Current EAR value (average of both eyes) */
  avgEar: number;
  /** Left eye EAR */
  leftEar: number;
  /** Right eye EAR */
  rightEar: number;
  /** Slope-smoothed EAR */
  smoothedEar: number;
  /** Detection confidence (0-1) */
  confidence: number;
  /** Current blink phase */
  phase: BlinkPhase;
  /** Phase name as string */
  phaseName: string;
  /** Details about detected blink (if any) */
  blinkEvent: BlinkEvent | null;
  /** Whether head motion was detected */
  headIsMoving: boolean;
  /** Why blink was rejected (for debugging) */
  rejectionReason: string | null;
  /** Current threshold/baseline being used */
  threshold: number;
  /** Bilateral verification result */
  bilateral: BilateralResult;
  /** Slope analysis result */
  slope: SlopeResult;
  /** Head motion result */
  headMotion: HeadMotionResult;
}

/**
 * Robust blink detector using slope-based detection with head motion gating.
 *
 * Usage:
 *   const detector = new RobustBlinkDetector();
 *
 *   for (const frame of cameraFrames) {
 *     const landmarks = mediapipe.detect(frame);
 *     const result = detector.detect(landmarks);
 *     if (result.isBlink) {
 *       console.log(`Blink #${detector.getBlinkCount()}`);
 *     }
 *   }
 */
export class RobustBlinkDetector {
  // Detection components
  private bilateral: BilateralVerifier;
  private slopeDetector: SlopeDetector;
  private headMotion: HeadMotionTracker;
  private stateMachine: BlinkStateMachine;

  // Counters
  private blinkCount: number = 0;

  constructor() {
    this.bilateral = new BilateralVerifier();
    this.slopeDetector = new SlopeDetector();
    this.headMotion = new HeadMotionTracker();
    this.stateMachine = new BlinkStateMachine();
  }

  /**
   * Process a single frame of face landmarks.
   *
   * @param landmarks Array of 478 MediaPipe face landmarks
   * @param confidence Detection confidence (0-1)
   * @param timestampMs Frame timestamp in milliseconds
   * @returns RobustBlinkResult with complete analysis
   */
  detect(
    landmarks: Point2D[],
    confidence: number = 1.0,
    timestampMs?: number,
  ): RobustBlinkResult {
    const ts = timestampMs ?? performance.now();

    // 1. Calculate bilateral EAR
    const bilateralResult = this.bilateral.update(landmarks);

    // 2. Track head motion
    const headResult = this.headMotion.update(landmarks);

    // 3. Calculate slope of average EAR
    const slopeResult = this.slopeDetector.update(bilateralResult.avgEar, ts);

    // 4. Update state machine
    // Only consider closing/opening if both eyes are symmetric
    const effectiveClosing = slopeResult.isClosing && bilateralResult.isSymmetric;
    const effectiveOpening = slopeResult.isOpening && bilateralResult.isSymmetric;

    // Start tracking blink dip when entering CLOSING phase
    if (slopeResult.isClosing && this.stateMachine.phase === BlinkPhase.IDLE) {
      this.bilateral.startBlinkTracking();
    }

    // NOTE: Order matters! update() first, then setBaseline() - matches Python prototype
    const stateResult = this.stateMachine.update(
      effectiveClosing,
      effectiveOpening,
      slopeResult.isAtMinimum,
      bilateralResult.avgEar,
      ts,
      headResult.isMoving,
    );

    // Update baseline AFTER state machine update (matches Python prototype)
    this.stateMachine.setBaseline(bilateralResult.combinedBaseline);

    // Count blinks and end tracking
    if (stateResult.blinkDetected) {
      this.blinkCount++;
      this.bilateral.endBlinkTracking();
    }

    // End tracking if blink was rejected
    if (stateResult.rejectionReason && this.stateMachine.phase === BlinkPhase.IDLE) {
      this.bilateral.endBlinkTracking();
    }

    return {
      isBlink: stateResult.blinkDetected,
      avgEar: bilateralResult.avgEar,
      leftEar: bilateralResult.leftEye.ear,
      rightEar: bilateralResult.rightEye.ear,
      smoothedEar: slopeResult.rawEar,
      confidence,
      phase: stateResult.phase,
      phaseName: stateResult.phase,
      blinkEvent: stateResult.blinkEvent,
      headIsMoving: headResult.isMoving,
      rejectionReason: stateResult.rejectionReason,
      threshold: bilateralResult.combinedBaseline,
      bilateral: bilateralResult,
      slope: slopeResult,
      headMotion: headResult,
    };
  }

  /**
   * Get total number of blinks detected.
   */
  getBlinkCount(): number {
    return this.blinkCount;
  }

  /**
   * Get current threshold/baseline.
   */
  getThreshold(): number {
    return this.bilateral.getCombinedBaseline();
  }

  /**
   * Check if calibration is complete.
   */
  isCalibrated(): boolean {
    return this.bilateral.isCalibrated();
  }

  /**
   * Get current blink phase.
   */
  getPhase(): BlinkPhase {
    return this.stateMachine.phase;
  }

  /**
   * Reset blink counter to zero.
   */
  resetCount(): void {
    this.blinkCount = 0;
  }

  /**
   * Full reset of all state.
   */
  reset(): void {
    this.bilateral.reset();
    this.slopeDetector.reset();
    this.headMotion.reset();
    this.stateMachine.reset();
    this.blinkCount = 0;
  }

  /**
   * Get current detector statistics.
   */
  getStats(): {
    blinkCount: number;
    currentPhase: string;
    baselineEar: number;
    calibrating: boolean;
  } {
    return {
      blinkCount: this.blinkCount,
      currentPhase: this.stateMachine.getPhaseName(),
      baselineEar: this.bilateral.getCombinedBaseline(),
      calibrating: this.bilateral.calibrating,
    };
  }
}
