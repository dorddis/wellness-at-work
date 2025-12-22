/**
 * BlinkStateMachine Tests
 *
 * Tests the slope-based state machine with hybrid validation.
 * Focus on the new eye movement rejection logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BlinkStateMachine, BlinkPhase } from '../blink-state-machine';
import { HYBRID_VALIDATION } from '../constants';

describe('BlinkStateMachine', () => {
  let stateMachine: BlinkStateMachine;

  beforeEach(() => {
    stateMachine = new BlinkStateMachine();
    // Set a realistic baseline (user's open eye EAR)
    stateMachine.setBaseline(0.40);
  });

  describe('Basic state transitions', () => {
    it('starts in IDLE phase', () => {
      expect(stateMachine.phase).toBe(BlinkPhase.IDLE);
    });

    it('transitions to CLOSING when isClosing is true', () => {
      const result = stateMachine.update(
        true,  // isClosing
        false, // isOpening
        false, // isAtMinimum
        0.35,  // currentEar
        1000,  // timestamp
        false  // headIsMoving
      );

      expect(stateMachine.phase).toBe(BlinkPhase.CLOSING);
      expect(result.blinkDetected).toBe(false);
    });

    it('transitions through CLOSING -> MINIMUM -> OPENING -> COOLDOWN for valid blink', () => {
      const ts = 1000;

      // IDLE -> CLOSING
      stateMachine.update(true, false, false, 0.30, ts, false);
      expect(stateMachine.phase).toBe(BlinkPhase.CLOSING);

      // CLOSING -> MINIMUM
      stateMachine.update(false, false, true, 0.15, ts + 50, false);
      expect(stateMachine.phase).toBe(BlinkPhase.MINIMUM);

      // MINIMUM -> OPENING
      stateMachine.update(false, true, false, 0.25, ts + 100, false);
      expect(stateMachine.phase).toBe(BlinkPhase.OPENING);

      // OPENING -> COOLDOWN (blink complete!)
      const result = stateMachine.update(false, false, false, 0.38, ts + 150, false);
      expect(stateMachine.phase).toBe(BlinkPhase.COOLDOWN);
      expect(result.blinkDetected).toBe(true);
      expect(result.blinkEvent).not.toBeNull();
    });
  });

  describe('Head motion gating', () => {
    it('rejects blink when head is moving during CLOSING', () => {
      stateMachine.update(true, false, false, 0.30, 1000, false);
      expect(stateMachine.phase).toBe(BlinkPhase.CLOSING);

      // Head starts moving
      const result = stateMachine.update(true, false, false, 0.25, 1050, true);
      expect(stateMachine.phase).toBe(BlinkPhase.IDLE);
      expect(result.rejectionReason).toBe('head_motion_during_closing');
    });
  });

  describe('Hybrid Validation - Eye Movement Rejection', () => {
    // Simulate a complete slope pattern that would trigger a blink
    // but with insufficient dip (eye movement, not real blink)
    function simulateBlinkPattern(
      stateMachine: BlinkStateMachine,
      minEar: number,
      baseline: number = 0.40
    ): { blinkDetected: boolean; rejectionReason: string | null } {
      stateMachine.setBaseline(baseline);
      let ts = 1000;

      // IDLE -> CLOSING
      stateMachine.update(true, false, false, baseline - 0.02, ts, false);

      // CLOSING -> MINIMUM (dip to minEar)
      ts += 50;
      stateMachine.update(false, false, true, minEar, ts, false);

      // MINIMUM -> OPENING
      ts += 30;
      stateMachine.update(false, true, false, minEar + 0.05, ts, false);

      // OPENING -> complete (stabilize)
      ts += 50;
      return stateMachine.update(false, false, false, baseline - 0.02, ts, false);
    }

    it('rejects eye movement: small dip from high baseline (EAR 0.40 -> 0.36)', () => {
      // User baseline: 0.40
      // Eye movement dips to: 0.36
      // dipRatio = 0.36 / 0.40 = 0.90 (> 0.75, not significant)
      // absoluteDip = 0.04 (< 0.06, not significant)
      // minEar = 0.36 (> 0.22, not truly closed)
      const result = simulateBlinkPattern(stateMachine, 0.36);

      expect(result.blinkDetected).toBe(false);
      expect(result.rejectionReason).toContain('eye_movement_not_blink');
    });

    it('accepts real blink: significant dip (EAR 0.40 -> 0.15)', () => {
      // dipRatio = 0.15 / 0.40 = 0.375 (<= 0.75, significant!)
      // absoluteDip = 0.25 (>= 0.06, significant!)
      // minEar = 0.15 (<= 0.22, truly closed!)
      const result = simulateBlinkPattern(stateMachine, 0.15);

      expect(result.blinkDetected).toBe(true);
      expect(result.rejectionReason).toBeNull();
    });

    it('accepts mini-blink with sufficient absolute dip (EAR 0.40 -> 0.32)', () => {
      // dipRatio = 0.32 / 0.40 = 0.80 (> 0.75, not relatively significant)
      // absoluteDip = 0.08 (>= 0.06, significant!)
      // This catches mini-blinks for high-baseline users
      const result = simulateBlinkPattern(stateMachine, 0.32);

      expect(result.blinkDetected).toBe(true);
      expect(result.rejectionReason).toBeNull();
    });

    it('accepts when EAR reaches truly closed level (EAR -> 0.20)', () => {
      // dipRatio = 0.20 / 0.40 = 0.50 (<= 0.75, significant)
      // absoluteDip = 0.20 (>= 0.06, significant)
      // minEar = 0.20 (<= 0.22, truly closed!)
      const result = simulateBlinkPattern(stateMachine, 0.20);

      expect(result.blinkDetected).toBe(true);
    });

    it('rejects squint: EAR drops but stays high (0.40 -> 0.35)', () => {
      // dipRatio = 0.35 / 0.40 = 0.875 (> 0.75)
      // absoluteDip = 0.05 (< 0.06)
      // minEar = 0.35 (> 0.22)
      const result = simulateBlinkPattern(stateMachine, 0.35);

      expect(result.blinkDetected).toBe(false);
      expect(result.rejectionReason).toContain('eye_movement_not_blink');
    });

    it('handles edge case: exactly at threshold boundaries', () => {
      // Test at exactly MIN_DIP_RATIO boundary
      // baseline = 0.40, minEar = 0.30 => dipRatio = 0.75 exactly
      // absoluteDip = 0.10 (passes absolute check anyway)
      const result = simulateBlinkPattern(stateMachine, 0.30);

      expect(result.blinkDetected).toBe(true);
    });

    it('handles low baseline users (EAR 0.28 baseline)', () => {
      // Some users have naturally lower baseline EAR
      // baseline = 0.28, minEar = 0.12
      // dipRatio = 0.12 / 0.28 = 0.43 (<= 0.75, significant)
      // absoluteDip = 0.16 (>= 0.06, significant)
      const result = simulateBlinkPattern(stateMachine, 0.12, 0.28);

      expect(result.blinkDetected).toBe(true);
    });

    it('rejects eye movement for low baseline users too', () => {
      // baseline = 0.28, minEar = 0.25
      // dipRatio = 0.25 / 0.28 = 0.89 (> 0.75)
      // absoluteDip = 0.03 (< 0.06)
      // minEar = 0.25 (> 0.22)
      const result = simulateBlinkPattern(stateMachine, 0.25, 0.28);

      expect(result.blinkDetected).toBe(false);
      expect(result.rejectionReason).toContain('eye_movement_not_blink');
    });
  });

  describe('Slow blink detection', () => {
    it('detects slow blinks via threshold crossing (no slope)', () => {
      const baseline = 0.40;
      stateMachine.setBaseline(baseline);
      let ts = 1000;

      // Slow EAR drop below threshold (75% of baseline = 0.30)
      // But no significant slope (simulated by isClosing = false)
      // Should trigger via slow blink path
      const earBelowThreshold = baseline * 0.70; // 0.28

      // This would trigger slow blink path in the state machine
      stateMachine.update(false, false, false, earBelowThreshold, ts, false);
      expect(stateMachine.phase).toBe(BlinkPhase.CLOSING);
    });
  });

  describe('Long eye closure', () => {
    it('counts as exactly 1 blink even if eyes closed for 5+ seconds', () => {
      stateMachine.setBaseline(0.40);
      let ts = 1000;

      // Start closing
      stateMachine.update(true, false, false, 0.35, ts, false);

      // Stay at minimum for 5 seconds (5000ms)
      for (let i = 0; i < 50; i++) {
        ts += 100;
        stateMachine.update(false, false, true, 0.10, ts, false);
        // Should stay in MINIMUM or CLOSING, not count blinks yet
        expect([BlinkPhase.CLOSING, BlinkPhase.MINIMUM]).toContain(stateMachine.phase);
      }

      // Now open eyes
      ts += 50;
      stateMachine.update(false, true, false, 0.25, ts, false);
      ts += 50;
      const result = stateMachine.update(false, false, false, 0.38, ts, false);

      // Should count as exactly 1 blink
      expect(result.blinkDetected).toBe(true);
    });
  });

  describe('Constants validation', () => {
    it('HYBRID_VALIDATION constants are defined', () => {
      expect(HYBRID_VALIDATION.ENABLED).toBeDefined();
      expect(HYBRID_VALIDATION.MIN_DIP_RATIO).toBeDefined();
      expect(HYBRID_VALIDATION.MIN_ABSOLUTE_DIP).toBeDefined();
      expect(HYBRID_VALIDATION.ABSOLUTE_CLOSED_THRESHOLD).toBeDefined();
    });

    it('HYBRID_VALIDATION has sensible default values', () => {
      expect(HYBRID_VALIDATION.MIN_DIP_RATIO).toBeGreaterThan(0);
      expect(HYBRID_VALIDATION.MIN_DIP_RATIO).toBeLessThan(1);
      expect(HYBRID_VALIDATION.MIN_ABSOLUTE_DIP).toBeGreaterThan(0);
      expect(HYBRID_VALIDATION.ABSOLUTE_CLOSED_THRESHOLD).toBeGreaterThan(0);
    });
  });
});
