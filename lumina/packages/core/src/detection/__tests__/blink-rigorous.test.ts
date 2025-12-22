/**
 * RIGOROUS Blink Detection Tests
 *
 * These tests target edge cases, boundary conditions, and error handling
 * that the happy-path tests don't cover.
 *
 * Philosophy: If breaking the code doesn't break the test, the test is useless.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  euclideanDistance,
  calculateEAR,
  extractEyeLandmarks,
  BlinkDetector,
  Point2D,
} from '../blink'
import {
  EAR_THRESHOLD,
  CONSEC_FRAMES,
  GLASSES_CONFIDENCE_THRESHOLD,
  LEFT_EYE_INDICES,
  RIGHT_EYE_INDICES,
} from '../constants'

// ============================================================================
// SECTION 1: euclideanDistance Edge Cases
// ============================================================================

describe('euclideanDistance - Rigorous Edge Cases', () => {
  describe('Special floating-point values', () => {
    it('returns NaN when either point has NaN coordinate', () => {
      const p1: Point2D = { x: NaN, y: 0 }
      const p2: Point2D = { x: 3, y: 4 }

      const result = euclideanDistance(p1, p2)

      // NaN should propagate - this is the expected behavior
      // If result is NOT NaN, we have a bug (silent corruption)
      expect(Number.isNaN(result)).toBe(true)
    })

    it('returns NaN when y coordinate is NaN', () => {
      const p1: Point2D = { x: 0, y: NaN }
      const p2: Point2D = { x: 3, y: 4 }

      expect(Number.isNaN(euclideanDistance(p1, p2))).toBe(true)
    })

    it('returns Infinity when either point has Infinity coordinate', () => {
      const p1: Point2D = { x: Infinity, y: 0 }
      const p2: Point2D = { x: 3, y: 4 }

      const result = euclideanDistance(p1, p2)

      // Infinity should propagate
      expect(result).toBe(Infinity)
    })

    it('returns NaN for Infinity - Infinity (indeterminate)', () => {
      const p1: Point2D = { x: Infinity, y: 0 }
      const p2: Point2D = { x: Infinity, y: 0 }

      const result = euclideanDistance(p1, p2)

      // Infinity - Infinity = NaN
      expect(Number.isNaN(result)).toBe(true)
    })

    it('handles -Infinity correctly', () => {
      const p1: Point2D = { x: -Infinity, y: 0 }
      const p2: Point2D = { x: 0, y: 0 }

      expect(euclideanDistance(p1, p2)).toBe(Infinity)
    })
  })

  describe('Very large and very small values', () => {
    it('handles MAX_SAFE_INTEGER coordinates without overflow', () => {
      const p1: Point2D = { x: 0, y: 0 }
      const p2: Point2D = { x: Number.MAX_SAFE_INTEGER, y: 0 }

      const result = euclideanDistance(p1, p2)

      // Should be approximately MAX_SAFE_INTEGER
      expect(result).toBeCloseTo(Number.MAX_SAFE_INTEGER, -10) // -10 = within 10 orders of magnitude
      expect(Number.isFinite(result)).toBe(true)
    })

    it('KNOWN LIMITATION: very small numbers underflow to zero (1e-300)', () => {
      // This documents a floating-point precision limitation, not a bug
      // (1e-300)^2 = 1e-600 which is smaller than MIN_VALUE (5e-324)
      // So it underflows to 0 during the squaring step of distance calculation
      const p1: Point2D = { x: 0, y: 0 }
      const p2: Point2D = { x: 1e-300, y: 0 }

      const result = euclideanDistance(p1, p2)

      // This UNDERFLOWS to 0 due to IEEE 754 floating-point limits
      // In practice, MediaPipe landmarks are normalized 0-1, so this won't occur
      expect(result).toBe(0) // Documents actual behavior
    })

    it('KNOWN LIMITATION: MIN_VALUE underflows to zero', () => {
      // MIN_VALUE = 5e-324, MIN_VALUE^2 underflows to 0
      const p1: Point2D = { x: 0, y: 0 }
      const p2: Point2D = { x: Number.MIN_VALUE, y: 0 }

      const result = euclideanDistance(p1, p2)

      expect(result).toBe(0) // Documents actual behavior
    })

    it('smallest distance that does NOT underflow', () => {
      // sqrt(x^2) = x only if x^2 doesn't underflow
      // x^2 > MIN_VALUE means x > sqrt(MIN_VALUE) approx 2.2e-162
      const p1: Point2D = { x: 0, y: 0 }
      const p2: Point2D = { x: 1e-150, y: 0 } // Safe from underflow

      const result = euclideanDistance(p1, p2)

      expect(result).toBeGreaterThan(0)
      expect(result).toBeCloseTo(1e-150, 160)
    })
  })

  describe('Precision edge cases', () => {
    it('maintains precision for typical screen coordinates', () => {
      // Real-world MediaPipe landmarks are 0-1 normalized coordinates
      const p1: Point2D = { x: 0.12345678901234567, y: 0.23456789012345678 }
      const p2: Point2D = { x: 0.34567890123456789, y: 0.45678901234567890 }

      const result = euclideanDistance(p1, p2)

      // Expected: sqrt((0.222...)^2 + (0.222...)^2) = 0.222... * sqrt(2)
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const expected = Math.sqrt(dx * dx + dy * dy)

      expect(result).toBe(expected)
    })
  })
})

// ============================================================================
// SECTION 2: calculateEAR Edge Cases
// ============================================================================

describe('calculateEAR - Rigorous Edge Cases', () => {
  describe('Invalid landmark arrays', () => {
    it('throws on empty array', () => {
      expect(() => calculateEAR([])).toThrow('EAR calculation requires exactly 6 landmarks')
    })

    it('throws on 5 landmarks', () => {
      const landmarks = Array(5).fill({ x: 0, y: 0 })
      expect(() => calculateEAR(landmarks)).toThrow('EAR calculation requires exactly 6 landmarks')
    })

    it('throws on 7 landmarks', () => {
      const landmarks = Array(7).fill({ x: 0, y: 0 })
      expect(() => calculateEAR(landmarks)).toThrow('EAR calculation requires exactly 6 landmarks')
    })
  })

  describe('NaN in landmarks', () => {
    it('returns NaN when any landmark x is NaN', () => {
      const landmarks: Point2D[] = [
        { x: NaN, y: 0 },
        { x: 0.5, y: 0.2 },
        { x: 0.5, y: 0.2 },
        { x: 1, y: 0 },
        { x: 0.5, y: -0.2 },
        { x: 0.5, y: -0.2 },
      ]

      const result = calculateEAR(landmarks)

      // NaN should propagate - not silently become 0 or some other value
      expect(Number.isNaN(result)).toBe(true)
    })

    it('returns NaN when vertical distance calculation involves NaN', () => {
      const landmarks: Point2D[] = [
        { x: 0, y: 0 },
        { x: 0.5, y: NaN }, // p1.y is NaN
        { x: 0.5, y: 0.2 },
        { x: 1, y: 0 },
        { x: 0.5, y: -0.2 },
        { x: 0.5, y: -0.2 },
      ]

      expect(Number.isNaN(calculateEAR(landmarks))).toBe(true)
    })
  })

  describe('Division by zero protection', () => {
    it('returns 0 when horizontal distance (C) is exactly 0', () => {
      // p0 and p3 at same x position = zero horizontal distance
      const landmarks: Point2D[] = [
        { x: 5, y: 0 },   // p0: outer corner
        { x: 5, y: 1 },   // p1
        { x: 5, y: 1 },   // p2
        { x: 5, y: 0 },   // p3: same x as p0
        { x: 5, y: -1 },  // p4
        { x: 5, y: -1 },  // p5
      ]

      const result = calculateEAR(landmarks)

      // Code returns 0 when C === 0
      expect(result).toBe(0)
    })

    it('returns 0 when all landmarks are at origin', () => {
      const landmarks: Point2D[] = Array(6).fill({ x: 0, y: 0 })

      expect(calculateEAR(landmarks)).toBe(0)
    })

    it('handles extremely small but non-zero horizontal distance', () => {
      const landmarks: Point2D[] = [
        { x: 0, y: 0 },
        { x: 0.5, y: 1 },
        { x: 0.5, y: 1 },
        { x: 1e-15, y: 0 }, // Very small but non-zero
        { x: 0.5, y: -1 },
        { x: 0.5, y: -1 },
      ]

      const result = calculateEAR(landmarks)

      // Should not be 0 (division worked) and should be very large
      expect(result).not.toBe(0)
      expect(Number.isFinite(result)).toBe(true)
    })
  })

  describe('EAR calculation mathematical correctness', () => {
    it('calculates EAR = 0.5 exactly for known geometry', () => {
      // Design landmarks to give exactly EAR = 0.5
      // EAR = (A + B) / (2 * C)
      // If A = B = 1, C = 2, then EAR = (1 + 1) / (2 * 2) = 0.5
      const landmarks: Point2D[] = [
        { x: 0, y: 0 },   // p0: outer corner
        { x: 1, y: 0.5 }, // p1: upper outer (A = dist(p1, p5))
        { x: 1, y: 0.5 }, // p2: upper inner (B = dist(p2, p4))
        { x: 2, y: 0 },   // p3: inner corner (C = dist(p0, p3) = 2)
        { x: 1, y: -0.5 },// p4: lower inner
        { x: 1, y: -0.5 },// p5: lower outer
      ]
      // A = sqrt(0 + 1) = 1, B = sqrt(0 + 1) = 1, C = 2
      // EAR = (1 + 1) / (2 * 2) = 0.5

      expect(calculateEAR(landmarks)).toBe(0.5)
    })

    it('calculates EAR = 0.21 exactly (threshold value)', () => {
      // EAR = (A + B) / (2 * C) = 0.21
      // If C = 1, then A + B = 0.42
      // Let A = B = 0.21
      const halfEar = 0.21 / 2 // vertical distance for A and B

      const landmarks: Point2D[] = [
        { x: 0, y: 0 },
        { x: 0.5, y: halfEar },
        { x: 0.5, y: halfEar },
        { x: 1, y: 0 },
        { x: 0.5, y: -halfEar },
        { x: 0.5, y: -halfEar },
      ]

      const result = calculateEAR(landmarks)
      expect(result).toBeCloseTo(0.21, 10)
    })
  })

  describe('Negative coordinates', () => {
    it('calculates correctly with all negative coordinates', () => {
      const landmarks: Point2D[] = [
        { x: -3, y: -1 },
        { x: -2, y: 0 },
        { x: -2, y: 0 },
        { x: -1, y: -1 },
        { x: -2, y: -2 },
        { x: -2, y: -2 },
      ]

      const result = calculateEAR(landmarks)

      // Should be a valid positive number
      expect(result).toBeGreaterThan(0)
      expect(Number.isFinite(result)).toBe(true)
    })
  })
})

// ============================================================================
// SECTION 3: BlinkDetector State Machine Edge Cases
// ============================================================================

describe('BlinkDetector - Rigorous State Machine Tests', () => {
  let detector: BlinkDetector

  beforeEach(() => {
    detector = new BlinkDetector()
  })

  // Helper to create landmarks with specific EAR
  function createLandmarks(ear: number): Point2D[] {
    const landmarks: Point2D[] = Array(478).fill(null).map(() => ({ x: 0, y: 0 }))

    const setEye = (indices: readonly number[], earValue: number) => {
      landmarks[indices[0]] = { x: 0, y: 0 }
      landmarks[indices[1]] = { x: 0.5, y: earValue / 2 }
      landmarks[indices[2]] = { x: 0.5, y: earValue / 2 }
      landmarks[indices[3]] = { x: 1, y: 0 }
      landmarks[indices[4]] = { x: 0.5, y: -earValue / 2 }
      landmarks[indices[5]] = { x: 0.5, y: -earValue / 2 }
    }

    setEye(LEFT_EYE_INDICES, ear)
    setEye(RIGHT_EYE_INDICES, ear)

    return landmarks
  }

  describe('Threshold boundary precision', () => {
    it('EAR exactly at 0.21 does NOT trigger blink (uses strict < comparison)', () => {
      const thresholdLandmarks = createLandmarks(EAR_THRESHOLD) // 0.21 exactly

      // Stay at threshold for many frames
      for (let i = 0; i < 10; i++) {
        detector.detect(thresholdLandmarks, 0.9)
      }

      // Then open eyes
      const openLandmarks = createLandmarks(0.35)
      const result = detector.detect(openLandmarks, 0.9)

      // Since 0.21 < 0.21 is FALSE, no blink should be detected
      expect(result.isBlink).toBe(false)
      expect(detector.getBlinkCount()).toBe(0)
    })

    it('EAR at 0.20999999999999 DOES trigger blink (just below threshold)', () => {
      // Floating point precision test
      const justBelowThreshold = EAR_THRESHOLD - 1e-10 // 0.20999999999...
      const closedLandmarks = createLandmarks(justBelowThreshold)

      for (let i = 0; i < CONSEC_FRAMES; i++) {
        detector.detect(closedLandmarks, 0.9)
      }

      const openLandmarks = createLandmarks(0.35)
      const result = detector.detect(openLandmarks, 0.9)

      expect(result.isBlink).toBe(true)
      expect(detector.getBlinkCount()).toBe(1)
    })

    it('EAR at 0.21000000000001 does NOT trigger blink (just above threshold)', () => {
      const justAboveThreshold = EAR_THRESHOLD + 1e-10
      const landmarks = createLandmarks(justAboveThreshold)

      for (let i = 0; i < 10; i++) {
        detector.detect(landmarks, 0.9)
      }

      const openLandmarks = createLandmarks(0.35)
      const result = detector.detect(openLandmarks, 0.9)

      expect(result.isBlink).toBe(false)
      expect(detector.getBlinkCount()).toBe(0)
    })
  })

  describe('CONSEC_FRAMES boundary tests', () => {
    it('exactly CONSEC_FRAMES-1 closed frames does NOT count as blink', () => {
      const closedLandmarks = createLandmarks(0.1)
      const openLandmarks = createLandmarks(0.35)

      // Close for exactly CONSEC_FRAMES - 1 frames
      for (let i = 0; i < CONSEC_FRAMES - 1; i++) {
        detector.detect(closedLandmarks, 0.9)
      }

      // Open - should NOT be a blink
      const result = detector.detect(openLandmarks, 0.9)

      expect(result.isBlink).toBe(false)
      expect(detector.getBlinkCount()).toBe(0)
    })

    it('exactly CONSEC_FRAMES closed frames DOES count as blink on reopen', () => {
      const closedLandmarks = createLandmarks(0.1)
      const openLandmarks = createLandmarks(0.35)

      for (let i = 0; i < CONSEC_FRAMES; i++) {
        detector.detect(closedLandmarks, 0.9)
      }

      const result = detector.detect(openLandmarks, 0.9)

      expect(result.isBlink).toBe(true)
      expect(detector.getBlinkCount()).toBe(1)
    })

    it('CONSEC_FRAMES+100 closed frames still counts as exactly 1 blink (extended closure)', () => {
      const closedLandmarks = createLandmarks(0.1)
      const openLandmarks = createLandmarks(0.35)

      // Keep eyes closed for 100+ frames (simulating looking down or sleeping)
      for (let i = 0; i < CONSEC_FRAMES + 100; i++) {
        const result = detector.detect(closedLandmarks, 0.9)
        // Should never be a blink while eyes are closed
        expect(result.isBlink).toBe(false)
      }

      // Reopen - should count as exactly 1 blink
      const result = detector.detect(openLandmarks, 0.9)

      expect(result.isBlink).toBe(true)
      expect(detector.getBlinkCount()).toBe(1) // NOT 50 or 100!
    })
  })

  describe('Oscillating at threshold (unstable readings)', () => {
    it('alternating above/below threshold counts blinks with CONSEC_FRAMES=1', () => {
      const justAbove = createLandmarks(EAR_THRESHOLD + 0.01)
      const justBelow = createLandmarks(EAR_THRESHOLD - 0.01)

      // Oscillate 20 times: 10 below followed by 10 above transitions
      // Pattern: below(0), above(1), below(2), above(3), ...
      // With CONSEC_FRAMES=1: each below->above = 1 blink
      for (let i = 0; i < 20; i++) {
        detector.detect(i % 2 === 0 ? justBelow : justAbove, 0.9)
      }

      // 10 complete close->open cycles = 10 blinks
      expect(detector.getBlinkCount()).toBe(10)
    })

    it('alternating 2 below, 1 above pattern counts blinks correctly', () => {
      const above = createLandmarks(0.35)
      const below = createLandmarks(0.1)

      // Pattern: below, below, above (repeat 3 times)
      // CONSEC_FRAMES = 2, so each "below, below, above" = 1 blink
      for (let cycle = 0; cycle < 3; cycle++) {
        detector.detect(below, 0.9) // frame 1 below
        detector.detect(below, 0.9) // frame 2 below (meets CONSEC_FRAMES)
        detector.detect(above, 0.9) // reopen - triggers blink
      }

      expect(detector.getBlinkCount()).toBe(3)
    })
  })

  describe('Glasses fallback logic edge cases', () => {
    it('confidence exactly at 0.7 threshold uses average (not single-eye)', () => {
      // Create landmarks where left eye is "closed" and right is "open"
      const landmarks: Point2D[] = Array(478).fill(null).map(() => ({ x: 0, y: 0 }))

      // Left eye: EAR = 0.1 (closed)
      landmarks[LEFT_EYE_INDICES[0]] = { x: 0, y: 0 }
      landmarks[LEFT_EYE_INDICES[1]] = { x: 0.5, y: 0.05 }
      landmarks[LEFT_EYE_INDICES[2]] = { x: 0.5, y: 0.05 }
      landmarks[LEFT_EYE_INDICES[3]] = { x: 1, y: 0 }
      landmarks[LEFT_EYE_INDICES[4]] = { x: 0.5, y: -0.05 }
      landmarks[LEFT_EYE_INDICES[5]] = { x: 0.5, y: -0.05 }

      // Right eye: EAR = 0.35 (open)
      landmarks[RIGHT_EYE_INDICES[0]] = { x: 2, y: 0 }
      landmarks[RIGHT_EYE_INDICES[1]] = { x: 2.5, y: 0.175 }
      landmarks[RIGHT_EYE_INDICES[2]] = { x: 2.5, y: 0.175 }
      landmarks[RIGHT_EYE_INDICES[3]] = { x: 3, y: 0 }
      landmarks[RIGHT_EYE_INDICES[4]] = { x: 2.5, y: -0.175 }
      landmarks[RIGHT_EYE_INDICES[5]] = { x: 2.5, y: -0.175 }

      // At exactly threshold confidence, code uses >= check
      const result = detector.detect(landmarks, GLASSES_CONFIDENCE_THRESHOLD) // 0.7 exactly

      // confidence < 0.7 is FALSE, so should use average
      // avgEAR = (0.1 + 0.35) / 2 = 0.225
      expect(result.avgEAR).toBeCloseTo(0.225, 2)
    })

    it('low confidence uses simple average (eye quality tracking is opt-in)', () => {
      // NOTE: The old confidence-based glasses fallback was removed because
      // MediaPipe visibility != glasses detection. Eye quality tracking
      // (which properly handles glasses) is now opt-in via config.
      const landmarks: Point2D[] = Array(478).fill(null).map(() => ({ x: 0, y: 0 }))

      // Left: EAR = 0.1
      landmarks[LEFT_EYE_INDICES[0]] = { x: 0, y: 0 }
      landmarks[LEFT_EYE_INDICES[1]] = { x: 0.5, y: 0.05 }
      landmarks[LEFT_EYE_INDICES[2]] = { x: 0.5, y: 0.05 }
      landmarks[LEFT_EYE_INDICES[3]] = { x: 1, y: 0 }
      landmarks[LEFT_EYE_INDICES[4]] = { x: 0.5, y: -0.05 }
      landmarks[LEFT_EYE_INDICES[5]] = { x: 0.5, y: -0.05 }

      // Right: EAR = 0.35
      landmarks[RIGHT_EYE_INDICES[0]] = { x: 2, y: 0 }
      landmarks[RIGHT_EYE_INDICES[1]] = { x: 2.5, y: 0.175 }
      landmarks[RIGHT_EYE_INDICES[2]] = { x: 2.5, y: 0.175 }
      landmarks[RIGHT_EYE_INDICES[3]] = { x: 3, y: 0 }
      landmarks[RIGHT_EYE_INDICES[4]] = { x: 2.5, y: -0.175 }
      landmarks[RIGHT_EYE_INDICES[5]] = { x: 2.5, y: -0.175 }

      const result = detector.detect(landmarks, 0.69) // Low confidence

      // With default config (no eye quality tracking), uses simple average
      // avgEAR = (0.1 + 0.35) / 2 = 0.225
      expect(result.avgEAR).toBeCloseTo(0.225, 2)
    })

    it('confidence = 0 still detects with simple average', () => {
      const landmarks = createLandmarks(0.1)

      const result = detector.detect(landmarks, 0) // Zero confidence

      // Confidence is passed through but doesn't affect EAR calculation
      expect(result.confidence).toBe(0)
      expect(result.avgEAR).toBeDefined()
      expect(result.avgEAR).toBeCloseTo(0.1, 2) // Average of identical left/right
    })

    it('confidence > 1.0 (invalid) still works with average', () => {
      const landmarks = createLandmarks(0.25)

      const result = detector.detect(landmarks, 1.5) // Invalid confidence

      // 1.5 < 0.7 is FALSE, should use average
      expect(result.confidence).toBe(1.5)
    })
  })

  describe('NaN and invalid data handling', () => {
    it('handles NaN in face landmarks', () => {
      const landmarks: Point2D[] = Array(478).fill(null).map(() => ({ x: 0, y: 0 }))

      // Set one eye landmark to NaN
      landmarks[LEFT_EYE_INDICES[0]] = { x: NaN, y: 0 }

      const result = detector.detect(landmarks, 0.9)

      // Should propagate NaN (not crash or return 0)
      expect(Number.isNaN(result.leftEAR)).toBe(true)
    })
  })

  describe('Reset behavior', () => {
    it('reset does not affect new detection after reset', () => {
      const closedLandmarks = createLandmarks(0.1)
      const openLandmarks = createLandmarks(0.35)

      // Create a blink
      for (let i = 0; i < CONSEC_FRAMES; i++) {
        detector.detect(closedLandmarks, 0.9)
      }
      detector.detect(openLandmarks, 0.9)
      expect(detector.getBlinkCount()).toBe(1)

      // Reset
      detector.reset()
      expect(detector.getBlinkCount()).toBe(0)
      expect(detector.getCurrentEAR()).toBe(1.0)

      // Close eyes again - should work fresh
      for (let i = 0; i < CONSEC_FRAMES; i++) {
        detector.detect(closedLandmarks, 0.9)
      }
      detector.detect(openLandmarks, 0.9)

      // Should have 1 blink (not 2)
      expect(detector.getBlinkCount()).toBe(1)
    })

    it('reset during mid-blink discards partial blink', () => {
      const closedLandmarks = createLandmarks(0.1)
      const openLandmarks = createLandmarks(0.35)

      // Close for 1 frame
      detector.detect(closedLandmarks, 0.9)

      // Reset mid-closure
      detector.reset()

      // Continue closing after reset
      detector.detect(closedLandmarks, 0.9)
      detector.detect(openLandmarks, 0.9)

      // With CONSEC_FRAMES=1: 1 frame closed + open = 1 blink
      // Reset clears count but the new close->open cycle after reset counts
      expect(detector.getBlinkCount()).toBe(1)
    })
  })

  describe('extractEyeLandmarks edge cases', () => {
    it('handles landmarks array smaller than required indices', () => {
      // MediaPipe should always return 478, but what if it doesn't?
      const smallLandmarks: Point2D[] = Array(50).fill({ x: 0, y: 0 })

      // This should either throw or return undefined values
      // The current implementation will return undefined for indices > 50
      const leftEye = extractEyeLandmarks(smallLandmarks, LEFT_EYE_INDICES)

      // Some values should be undefined since indices like 160, 158 > 50
      expect(leftEye[1]).toBeUndefined() // Index 160 doesn't exist
    })
  })
})

// ============================================================================
// SECTION 4: Integration Scenarios
// ============================================================================

describe('BlinkDetector - Integration Scenarios', () => {
  it('simulates realistic blink pattern (12-15 blinks per minute)', () => {
    const detector = new BlinkDetector()

    // Assume 30 FPS, 60 seconds = 1800 frames
    // 15 blinks in 60 seconds = 1 blink every 4 seconds = 120 frames
    // Blink takes ~5 frames closed + 115 frames open

    const closedLandmarks = createRealisticLandmarks(0.15)
    const openLandmarks = createRealisticLandmarks(0.28)

    let totalFrames = 0
    const framesPerBlink = 120 // 4 seconds at 30 FPS
    const blinkDuration = 5

    for (let blink = 0; blink < 15; blink++) {
      // Open period
      for (let i = 0; i < framesPerBlink - blinkDuration; i++) {
        detector.detect(openLandmarks, 0.95)
        totalFrames++
      }

      // Blink (closed)
      for (let i = 0; i < blinkDuration; i++) {
        detector.detect(closedLandmarks, 0.95)
        totalFrames++
      }
    }

    // Final open to register last blink
    detector.detect(openLandmarks, 0.95)

    expect(detector.getBlinkCount()).toBe(15)
    expect(totalFrames).toBe(1800)
  })

  it('handles camera dropout (no data for several frames) gracefully', () => {
    const detector = new BlinkDetector()

    const openLandmarks = createRealisticLandmarks(0.28)

    // Normal detection
    detector.detect(openLandmarks, 0.9)
    detector.detect(openLandmarks, 0.9)

    // Camera dropout - no detection calls for a period
    // (In real code, this would just be no calls)

    // Resume detection - should still work
    const closedLandmarks = createRealisticLandmarks(0.15)
    for (let i = 0; i < CONSEC_FRAMES; i++) {
      detector.detect(closedLandmarks, 0.9)
    }
    detector.detect(openLandmarks, 0.9)

    expect(detector.getBlinkCount()).toBe(1)
  })
})

// Helper for integration tests
function createRealisticLandmarks(ear: number): Point2D[] {
  const landmarks: Point2D[] = Array(478).fill(null).map(() => ({ x: 0, y: 0 }))

  const setEye = (indices: readonly number[], earValue: number) => {
    landmarks[indices[0]] = { x: 0, y: 0 }
    landmarks[indices[1]] = { x: 0.5, y: earValue / 2 }
    landmarks[indices[2]] = { x: 0.5, y: earValue / 2 }
    landmarks[indices[3]] = { x: 1, y: 0 }
    landmarks[indices[4]] = { x: 0.5, y: -earValue / 2 }
    landmarks[indices[5]] = { x: 0.5, y: -earValue / 2 }
  }

  setEye(LEFT_EYE_INDICES, ear)
  setEye(RIGHT_EYE_INDICES, ear)

  return landmarks
}
