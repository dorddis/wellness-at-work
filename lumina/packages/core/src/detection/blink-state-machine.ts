/**
 * Blink phase state machine.
 *
 * Tracks the progression through blink phases:
 * IDLE -> CLOSING -> MINIMUM -> OPENING -> (BLINK detected) -> COOLDOWN -> IDLE
 *
 * This pattern-based approach is more robust than threshold-based detection.
 */

import { BLINK_TIMING, BILATERAL, SLOW_BLINK, HYBRID_VALIDATION } from './constants';

export enum BlinkPhase {
  /** Waiting for blink to start */
  IDLE = 'IDLE',
  /** Eyes closing (negative slope detected) */
  CLOSING = 'CLOSING',
  /** At minimum EAR (slope near zero) */
  MINIMUM = 'MINIMUM',
  /** Eyes opening (positive slope detected) */
  OPENING = 'OPENING',
  /** Just detected a blink, waiting before next */
  COOLDOWN = 'COOLDOWN',
}

export interface BlinkEvent {
  /** When the blink was detected */
  timestampMs: number;
  /** How long the blink took */
  durationMs: number;
  /** Minimum EAR reached during blink */
  minEar: number;
  /** How much EAR dropped from baseline */
  dipMagnitude: number;
}

export interface StateMachineResult {
  /** Current phase */
  phase: BlinkPhase;
  /** True if a valid blink was just detected */
  blinkDetected: boolean;
  /** Details about the detected blink (if any) */
  blinkEvent: BlinkEvent | null;
  /** Why blink was rejected (for debugging) */
  rejectionReason: string | null;
}

/**
 * State machine for detecting blinks based on slope patterns.
 *
 * Transitions:
 * - IDLE -> CLOSING: When negative slope detected
 * - CLOSING -> MINIMUM: When slope becomes near-zero
 * - CLOSING -> IDLE: Timeout or motion detected (abort)
 * - MINIMUM -> OPENING: When positive slope detected
 * - OPENING -> COOLDOWN: When slope stabilizes (blink complete!)
 * - COOLDOWN -> IDLE: After cooldown period
 */
export class BlinkStateMachine {
  phase: BlinkPhase = BlinkPhase.IDLE;
  private phaseStartMs: number = 0;
  private closingStartMs: number = 0;
  baselineEar: number = 0.3; // Will be updated externally
  private minEarInBlink: number = 1.0;
  private lastBlinkMs: number = 0;
  private isSlowBlink: boolean = false; // Track if current blink is slow (threshold-based)

  /**
   * Update state machine with new slope information.
   *
   * @param isClosing True if significant negative slope
   * @param isOpening True if significant positive slope
   * @param isAtMinimum True if slope is near zero
   * @param currentEar Current EAR value
   * @param timestampMs Current timestamp in milliseconds
   * @param headIsMoving True if head motion detected (suppresses detection)
   * @returns StateMachineResult with current phase and any detected blink
   */
  update(
    isClosing: boolean,
    isOpening: boolean,
    isAtMinimum: boolean,
    currentEar: number,
    timestampMs?: number,
    headIsMoving: boolean = false,
  ): StateMachineResult {
    const ts = timestampMs ?? performance.now();

    let blinkDetected = false;
    let blinkEvent: BlinkEvent | null = null;
    let rejectionReason: string | null = null;

    // Track minimum EAR during blink
    if (this.phase === BlinkPhase.CLOSING ||
        this.phase === BlinkPhase.MINIMUM ||
        this.phase === BlinkPhase.OPENING) {
      this.minEarInBlink = Math.min(this.minEarInBlink, currentEar);
    }

    // Calculate threshold-based triggers for slow blinks
    const slowBlinkThreshold = this.baselineEar * SLOW_BLINK.EAR_THRESHOLD;
    const slowRecoveryThreshold = this.baselineEar * SLOW_BLINK.RECOVERY_THRESHOLD;
    const earBelowThreshold = currentEar < slowBlinkThreshold;
    const earAboveRecovery = currentEar > slowRecoveryThreshold;

    // State transitions
    switch (this.phase) {
      case BlinkPhase.IDLE: {
        // Trigger on slope (fast blink) OR threshold crossing (slow blink)
        let startBlink = false;
        if (isClosing && !headIsMoving) {
          startBlink = true;
          this.isSlowBlink = false;
        } else if (earBelowThreshold && !headIsMoving) {
          // Slow blink: EAR dropped below threshold without significant slope
          startBlink = true;
          this.isSlowBlink = true;
        }

        if (startBlink) {
          // Start of potential blink
          this.phase = BlinkPhase.CLOSING;
          this.phaseStartMs = ts;
          this.closingStartMs = ts;
          this.minEarInBlink = currentEar;
        }
        break;
      }

      case BlinkPhase.CLOSING:
        if (headIsMoving) {
          // Abort - head motion detected
          this.phase = BlinkPhase.IDLE;
          rejectionReason = 'head_motion_during_closing';
        } else if (ts - this.closingStartMs > BLINK_TIMING.CLOSING_TIMEOUT_MS) {
          // Timeout - eyes stayed closed too long (not a blink)
          this.phase = BlinkPhase.IDLE;
          rejectionReason = 'closing_timeout';
        } else if (isAtMinimum || isOpening) {
          // Reached minimum point
          this.phase = BlinkPhase.MINIMUM;
          this.phaseStartMs = ts;
        }
        break;

      case BlinkPhase.MINIMUM:
        if (headIsMoving) {
          this.phase = BlinkPhase.IDLE;
          rejectionReason = 'head_motion_at_minimum';
        } else if (isOpening) {
          // Eyes starting to open (fast blink via slope)
          this.phase = BlinkPhase.OPENING;
          this.phaseStartMs = ts;
        } else if (this.isSlowBlink && earAboveRecovery) {
          // Slow blink: EAR recovered above threshold
          this.phase = BlinkPhase.OPENING;
          this.phaseStartMs = ts;
        }
        // If still closing, stay in minimum
        break;

      case BlinkPhase.OPENING: {
        if (headIsMoving) {
          this.phase = BlinkPhase.IDLE;
          rejectionReason = 'head_motion_during_opening';
          break;
        }

        // Complete blink when:
        // - Fast blink: slope stabilizes (neither opening nor closing)
        // - Slow blink: EAR recovered above threshold and slope is not strongly closing
        let blinkComplete = false;
        if (!isOpening && !isClosing) {
          blinkComplete = true;
        } else if (this.isSlowBlink && earAboveRecovery && !isClosing) {
          blinkComplete = true;
        }

        if (blinkComplete) {
          // Blink complete! Calculate metrics
          const durationMs = ts - this.closingStartMs;
          const dipMagnitude = this.baselineEar - this.minEarInBlink;

          // VALIDATION: Verify the EAR dip was significant enough to be a real blink
          //
          // Two modes controlled by HYBRID_VALIDATION.ENABLED:
          // - false (DEFAULT): Uses original BILATERAL validation (8% dip OR 0.015 absolute)
          // - true (EXPERIMENTAL): Stricter validation to reject eye movements
          //
          // The original algorithm works well for most users. Only enable hybrid
          // validation if you're seeing eye movements counted as false blinks.
          let isValidBlink = false;

          if (HYBRID_VALIDATION.ENABLED) {
            // EXPERIMENTAL: Stricter validation for eye movement rejection
            // Calculate validation metrics
            const dipRatio = this.minEarInBlink / this.baselineEar;
            const absoluteDip = dipMagnitude;

            // Accept if ANY of these conditions are met:
            // 1. EAR dropped to <= 75% of baseline (significant relative dip)
            const relativelySignificant = dipRatio <= HYBRID_VALIDATION.MIN_DIP_RATIO;
            // 2. EAR dropped by >= 0.06 absolute (for high-baseline users like 0.40)
            const absolutelySignificant = absoluteDip >= HYBRID_VALIDATION.MIN_ABSOLUTE_DIP;
            // 3. EAR reached truly closed level (<= 0.22 absolute)
            const trulyClosed = this.minEarInBlink <= HYBRID_VALIDATION.ABSOLUTE_CLOSED_THRESHOLD;

            isValidBlink = relativelySignificant || absolutelySignificant || trulyClosed;

            if (!isValidBlink) {
              rejectionReason = `eye_movement_not_blink: minEAR=${this.minEarInBlink.toFixed(3)}, ` +
                `baseline=${this.baselineEar.toFixed(3)}, dipRatio=${dipRatio.toFixed(2)}, ` +
                `absDip=${absoluteDip.toFixed(3)}`;
              this.phase = BlinkPhase.IDLE;
            }
          } else {
            // ORIGINAL ALGORITHM (DEFAULT): Uses BILATERAL config unchanged
            // This is the proven, working validation - do not modify
            const minDipRequired = this.baselineEar * BILATERAL.MIN_DIP_PERCENTAGE;
            if (dipMagnitude < minDipRequired || dipMagnitude < BILATERAL.MIN_DIP_ABSOLUTE) {
              rejectionReason = `shallow_dip_${dipMagnitude.toFixed(3)}_need_${minDipRequired.toFixed(3)}`;
              this.phase = BlinkPhase.IDLE;
            } else {
              isValidBlink = true;
            }
          }

          if (isValidBlink) {
            // Valid blink! (duration tracked but not used for rejection)
            blinkDetected = true;
            blinkEvent = {
              timestampMs: ts,
              durationMs,
              minEar: this.minEarInBlink,
              dipMagnitude,
            };
            this.phase = BlinkPhase.COOLDOWN;
            this.phaseStartMs = ts;
            this.lastBlinkMs = ts;
          }
        }
        break;
      }

      case BlinkPhase.COOLDOWN:
        if (ts - this.phaseStartMs > BLINK_TIMING.COOLDOWN_MS) {
          this.phase = BlinkPhase.IDLE;
        }
        break;
    }

    return {
      phase: this.phase,
      blinkDetected,
      blinkEvent,
      rejectionReason,
    };
  }

  /**
   * Update the baseline EAR (called by detector when calibrated).
   */
  setBaseline(baselineEar: number): void {
    this.baselineEar = baselineEar;
  }

  /**
   * Reset to initial state.
   */
  reset(): void {
    this.phase = BlinkPhase.IDLE;
    this.phaseStartMs = 0;
    this.closingStartMs = 0;
    this.minEarInBlink = 1.0;
    this.isSlowBlink = false;
  }

  /**
   * Get current phase name as string.
   */
  getPhaseName(): string {
    return this.phase;
  }

  /**
   * Get time since last blink.
   */
  getTimeSinceLastBlink(currentMs?: number): number {
    const ts = currentMs ?? performance.now();
    return this.lastBlinkMs > 0 ? ts - this.lastBlinkMs : Infinity;
  }
}
