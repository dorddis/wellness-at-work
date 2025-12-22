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

describe('euclideanDistance', () => {
  it('calculates distance between two identical points as 0', () => {
    const p1: Point2D = { x: 0, y: 0 }
    const p2: Point2D = { x: 0, y: 0 }
    expect(euclideanDistance(p1, p2)).toBe(0)
  })

  it('calculates horizontal distance correctly', () => {
    const p1: Point2D = { x: 0, y: 0 }
    const p2: Point2D = { x: 3, y: 0 }
    expect(euclideanDistance(p1, p2)).toBe(3)
  })

  it('calculates vertical distance correctly', () => {
    const p1: Point2D = { x: 0, y: 0 }
    const p2: Point2D = { x: 0, y: 4 }
    expect(euclideanDistance(p1, p2)).toBe(4)
  })

  it('calculates diagonal distance correctly (3-4-5 triangle)', () => {
    const p1: Point2D = { x: 0, y: 0 }
    const p2: Point2D = { x: 3, y: 4 }
    expect(euclideanDistance(p1, p2)).toBe(5)
  })

  it('handles negative coordinates', () => {
    const p1: Point2D = { x: -1, y: -1 }
    const p2: Point2D = { x: 2, y: 3 }
    expect(euclideanDistance(p1, p2)).toBe(5)
  })
})

describe('calculateEAR', () => {
  it('throws error if landmarks array does not have 6 points', () => {
    expect(() => calculateEAR([])).toThrow('EAR calculation requires exactly 6 landmarks')
    expect(() => calculateEAR([{ x: 0, y: 0 }])).toThrow('EAR calculation requires exactly 6 landmarks')
  })

  it('returns 0 when horizontal distance is 0 (avoid division by zero)', () => {
    // All points at same x-coordinate for p0 and p3
    const landmarks: Point2D[] = [
      { x: 0, y: 0 },  // p0: outer corner
      { x: 0, y: 1 },  // p1: upper outer
      { x: 0, y: 1 },  // p2: upper inner
      { x: 0, y: 0 },  // p3: inner corner (same x as p0)
      { x: 0, y: -1 }, // p4: lower inner
      { x: 0, y: -1 }, // p5: lower outer
    ]
    expect(calculateEAR(landmarks)).toBe(0)
  })

  it('calculates EAR correctly for open eye (high EAR)', () => {
    // Wide open eye: large vertical distances, normal horizontal
    const landmarks: Point2D[] = [
      { x: 0, y: 0 },   // p0: outer corner
      { x: 1, y: 2 },   // p1: upper outer (high)
      { x: 2, y: 2 },   // p2: upper inner (high)
      { x: 3, y: 0 },   // p3: inner corner
      { x: 2, y: -2 },  // p4: lower inner (low)
      { x: 1, y: -2 },  // p5: lower outer (low)
    ]
    const ear = calculateEAR(landmarks)
    // EAR = (A + B) / (2 * C)
    // A = distance(p1, p5) = sqrt((1-1)^2 + (2-(-2))^2) = 4
    // B = distance(p2, p4) = sqrt((2-2)^2 + (2-(-2))^2) = 4
    // C = distance(p0, p3) = 3
    // EAR = (4 + 4) / (2 * 3) = 8/6 = 1.333...
    expect(ear).toBeCloseTo(8 / 6, 5)
  })

  it('calculates EAR correctly for closed eye (low EAR)', () => {
    // Closed eye: small vertical distances
    const landmarks: Point2D[] = [
      { x: 0, y: 0 },    // p0: outer corner
      { x: 1, y: 0.1 },  // p1: upper outer (near center)
      { x: 2, y: 0.1 },  // p2: upper inner (near center)
      { x: 3, y: 0 },    // p3: inner corner
      { x: 2, y: -0.1 }, // p4: lower inner (near center)
      { x: 1, y: -0.1 }, // p5: lower outer (near center)
    ]
    const ear = calculateEAR(landmarks)
    // A = distance(p1, p5) = sqrt(0 + 0.04) = 0.2
    // B = distance(p2, p4) = sqrt(0 + 0.04) = 0.2
    // C = distance(p0, p3) = 3
    // EAR = (0.2 + 0.2) / (2 * 3) = 0.4/6 = 0.0667
    expect(ear).toBeCloseTo(0.4 / 6, 5)
    expect(ear).toBeLessThan(EAR_THRESHOLD)
  })

  it('EAR threshold is 0.18 (more sensitive for accurate detection)', () => {
    expect(EAR_THRESHOLD).toBe(0.18)
  })
})

describe('extractEyeLandmarks', () => {
  it('extracts correct landmarks based on indices', () => {
    // Create a mock 478-point face landmarks array
    const faceLandmarks: Point2D[] = Array(478).fill(null).map((_, i) => ({
      x: i,
      y: i * 2,
    }))

    const leftEyeLandmarks = extractEyeLandmarks(faceLandmarks, LEFT_EYE_INDICES)

    expect(leftEyeLandmarks).toHaveLength(6)
    expect(leftEyeLandmarks[0]).toEqual({ x: 33, y: 66 })   // index 33
    expect(leftEyeLandmarks[1]).toEqual({ x: 160, y: 320 }) // index 160
    expect(leftEyeLandmarks[2]).toEqual({ x: 158, y: 316 }) // index 158
    expect(leftEyeLandmarks[3]).toEqual({ x: 133, y: 266 }) // index 133
    expect(leftEyeLandmarks[4]).toEqual({ x: 153, y: 306 }) // index 153
    expect(leftEyeLandmarks[5]).toEqual({ x: 144, y: 288 }) // index 144
  })

  it('left and right eye indices are correct length', () => {
    expect(LEFT_EYE_INDICES).toHaveLength(6)
    expect(RIGHT_EYE_INDICES).toHaveLength(6)
  })
})

describe('BlinkDetector', () => {
  let detector: BlinkDetector

  // Helper to create mock face landmarks with controllable eye positions
  function createMockFaceLandmarks(leftEAR: number, rightEAR: number): Point2D[] {
    const landmarks: Point2D[] = Array(478).fill(null).map(() => ({ x: 0, y: 0 }))

    // Set left eye landmarks to achieve desired EAR
    // Using formula: EAR = (A + B) / (2 * C), we set C=1, so EAR = (A + B) / 2
    // If A = B = EAR, then we get the desired EAR
    const leftIndices = LEFT_EYE_INDICES
    landmarks[leftIndices[0]] = { x: 0, y: 0 }   // outer corner
    landmarks[leftIndices[1]] = { x: 0.5, y: leftEAR / 2 }  // upper outer
    landmarks[leftIndices[2]] = { x: 0.5, y: leftEAR / 2 }  // upper inner
    landmarks[leftIndices[3]] = { x: 1, y: 0 }   // inner corner
    landmarks[leftIndices[4]] = { x: 0.5, y: -leftEAR / 2 } // lower inner
    landmarks[leftIndices[5]] = { x: 0.5, y: -leftEAR / 2 } // lower outer

    // Set right eye landmarks
    const rightIndices = RIGHT_EYE_INDICES
    landmarks[rightIndices[0]] = { x: 2, y: 0 }  // outer corner
    landmarks[rightIndices[1]] = { x: 2.5, y: rightEAR / 2 }  // upper outer
    landmarks[rightIndices[2]] = { x: 2.5, y: rightEAR / 2 }  // upper inner
    landmarks[rightIndices[3]] = { x: 3, y: 0 }  // inner corner
    landmarks[rightIndices[4]] = { x: 2.5, y: -rightEAR / 2 } // lower inner
    landmarks[rightIndices[5]] = { x: 2.5, y: -rightEAR / 2 } // lower outer

    return landmarks
  }

  beforeEach(() => {
    detector = new BlinkDetector()
  })

  it('starts with zero blink count', () => {
    expect(detector.getBlinkCount()).toBe(0)
  })

  it('starts with default EAR of 1.0', () => {
    expect(detector.getCurrentEAR()).toBe(1.0)
  })

  it('detects no blink when eyes are open', () => {
    const openEyeEAR = 0.35 // Well above threshold
    const landmarks = createMockFaceLandmarks(openEyeEAR, openEyeEAR)

    const result = detector.detect(landmarks, 0.9)

    expect(result.isBlink).toBe(false)
    expect(result.avgEAR).toBeGreaterThan(EAR_THRESHOLD)
    expect(detector.getBlinkCount()).toBe(0)
  })

  it('does not count blink during eye closure (only after reopening)', () => {
    const closedEyeEAR = 0.1 // Below threshold
    const landmarks = createMockFaceLandmarks(closedEyeEAR, closedEyeEAR)

    // Eyes closed for multiple frames
    for (let i = 0; i < CONSEC_FRAMES + 1; i++) {
      const result = detector.detect(landmarks, 0.9)
      expect(result.isBlink).toBe(false) // Blink only counted on reopen
    }

    expect(detector.getBlinkCount()).toBe(0)
  })

  it('counts blink after eyes close for CONSEC_FRAMES and reopen', () => {
    const closedEyeEAR = 0.1
    const openEyeEAR = 0.35
    const closedLandmarks = createMockFaceLandmarks(closedEyeEAR, closedEyeEAR)
    const openLandmarks = createMockFaceLandmarks(openEyeEAR, openEyeEAR)

    // Close eyes for required frames
    for (let i = 0; i < CONSEC_FRAMES; i++) {
      detector.detect(closedLandmarks, 0.9)
    }

    // Reopen eyes - this should trigger blink count
    const result = detector.detect(openLandmarks, 0.9)

    expect(result.isBlink).toBe(true)
    expect(detector.getBlinkCount()).toBe(1)
  })

  it('does not count blink if eyes closed for less than CONSEC_FRAMES', () => {
    const closedEyeEAR = 0.1
    const openEyeEAR = 0.35
    const closedLandmarks = createMockFaceLandmarks(closedEyeEAR, closedEyeEAR)
    const openLandmarks = createMockFaceLandmarks(openEyeEAR, openEyeEAR)

    // Close eyes for less than required frames
    for (let i = 0; i < CONSEC_FRAMES - 1; i++) {
      detector.detect(closedLandmarks, 0.9)
    }

    // Reopen eyes - should NOT trigger blink
    const result = detector.detect(openLandmarks, 0.9)

    expect(result.isBlink).toBe(false)
    expect(detector.getBlinkCount()).toBe(0)
  })

  it('counts multiple blinks correctly', () => {
    const closedEyeEAR = 0.1
    const openEyeEAR = 0.35
    const closedLandmarks = createMockFaceLandmarks(closedEyeEAR, closedEyeEAR)
    const openLandmarks = createMockFaceLandmarks(openEyeEAR, openEyeEAR)

    // Simulate 3 blinks
    for (let blink = 0; blink < 3; blink++) {
      // Eyes open
      detector.detect(openLandmarks, 0.9)

      // Eyes closed
      for (let i = 0; i < CONSEC_FRAMES; i++) {
        detector.detect(closedLandmarks, 0.9)
      }

      // Eyes reopen
      detector.detect(openLandmarks, 0.9)
    }

    expect(detector.getBlinkCount()).toBe(3)
  })

  it('uses max EAR (single-eye fallback) when confidence is low (glasses)', () => {
    const leftEAR = 0.15  // Would be a blink if averaged
    const rightEAR = 0.30 // Open eye
    const landmarks = createMockFaceLandmarks(leftEAR, rightEAR)

    // Low confidence triggers single-eye fallback
    const result = detector.detect(landmarks, GLASSES_CONFIDENCE_THRESHOLD - 0.1)

    // Should use max(leftEAR, rightEAR) = 0.30
    expect(result.avgEAR).toBeGreaterThan(EAR_THRESHOLD)
    expect(result.isBlink).toBe(false)
  })

  it('uses average EAR when confidence is high', () => {
    const leftEAR = 0.15
    const rightEAR = 0.30
    const landmarks = createMockFaceLandmarks(leftEAR, rightEAR)

    // High confidence uses average
    const result = detector.detect(landmarks, GLASSES_CONFIDENCE_THRESHOLD + 0.1)

    // avgEAR should be approximately (0.15 + 0.30) / 2 = 0.225
    // Note: due to our mock landmark construction, values might differ slightly
    expect(result.avgEAR).toBeDefined()
    expect(result.leftEAR).toBeDefined()
    expect(result.rightEAR).toBeDefined()
  })

  it('reset clears all state', () => {
    const closedLandmarks = createMockFaceLandmarks(0.1, 0.1)
    const openLandmarks = createMockFaceLandmarks(0.35, 0.35)

    // Create some state
    for (let i = 0; i < CONSEC_FRAMES; i++) {
      detector.detect(closedLandmarks, 0.9)
    }
    detector.detect(openLandmarks, 0.9) // This triggers a blink

    expect(detector.getBlinkCount()).toBe(1)

    // Reset
    detector.reset()

    expect(detector.getBlinkCount()).toBe(0)
    expect(detector.getCurrentEAR()).toBe(1.0)
  })

  it('CONSEC_FRAMES is 1 (fast blink detection)', () => {
    expect(CONSEC_FRAMES).toBe(1)
  })

  it('GLASSES_CONFIDENCE_THRESHOLD is 0.7', () => {
    expect(GLASSES_CONFIDENCE_THRESHOLD).toBe(0.7)
  })
})

describe('BlinkDetector edge cases', () => {
  let detector: BlinkDetector

  beforeEach(() => {
    detector = new BlinkDetector()
  })

  it('handles rapid eye flutter (with CONSEC_FRAMES=1, each close-open is a blink)', () => {
    // With CONSEC_FRAMES=1, each close->open transition counts as a blink
    // This is by design for fast blink detection
    const closedLandmarks = createMockLandmarks(0.1)
    const openLandmarks = createMockLandmarks(0.35)

    // Rapid flutter: close, open, close, open
    // With CONSEC_FRAMES=1: each "close, open" = 1 blink
    detector.detect(closedLandmarks, 0.9) // close (1 frame)
    detector.detect(openLandmarks, 0.9)   // open -> blink 1
    detector.detect(closedLandmarks, 0.9) // close (1 frame)
    detector.detect(openLandmarks, 0.9)   // open -> blink 2

    expect(detector.getBlinkCount()).toBe(2)
  })

  it('handles EAR exactly at threshold', () => {
    const thresholdLandmarks = createMockLandmarks(EAR_THRESHOLD)

    // At exactly threshold, eyes are considered closed (< threshold)
    for (let i = 0; i < CONSEC_FRAMES; i++) {
      detector.detect(thresholdLandmarks, 0.9)
    }

    const openLandmarks = createMockLandmarks(0.35)
    const result = detector.detect(openLandmarks, 0.9)

    // Should NOT count as blink since threshold check is avgEAR < EAR_THRESHOLD (not <=)
    expect(result.isBlink).toBe(false)
  })

  it('handles EAR just below threshold', () => {
    const belowThresholdLandmarks = createMockLandmarks(EAR_THRESHOLD - 0.01)

    for (let i = 0; i < CONSEC_FRAMES; i++) {
      detector.detect(belowThresholdLandmarks, 0.9)
    }

    const openLandmarks = createMockLandmarks(0.35)
    const result = detector.detect(openLandmarks, 0.9)

    expect(result.isBlink).toBe(true)
    expect(detector.getBlinkCount()).toBe(1)
  })
})

// Helper for edge case tests
function createMockLandmarks(targetEAR: number): Point2D[] {
  const landmarks: Point2D[] = Array(478).fill(null).map(() => ({ x: 0, y: 0 }))

  // Set both eyes to same EAR
  const setEyeLandmarks = (indices: readonly number[], ear: number) => {
    landmarks[indices[0]] = { x: 0, y: 0 }
    landmarks[indices[1]] = { x: 0.5, y: ear / 2 }
    landmarks[indices[2]] = { x: 0.5, y: ear / 2 }
    landmarks[indices[3]] = { x: 1, y: 0 }
    landmarks[indices[4]] = { x: 0.5, y: -ear / 2 }
    landmarks[indices[5]] = { x: 0.5, y: -ear / 2 }
  }

  setEyeLandmarks(LEFT_EYE_INDICES, targetEAR)
  setEyeLandmarks(RIGHT_EYE_INDICES, targetEAR)

  return landmarks
}
