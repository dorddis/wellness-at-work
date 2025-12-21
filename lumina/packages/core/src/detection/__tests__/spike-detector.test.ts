/**
 * Tests for SpikeDetector
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { SpikeDetector } from '../spike-detector'

describe('SpikeDetector', () => {
  let detector: SpikeDetector

  beforeEach(() => {
    detector = new SpikeDetector()
  })

  describe('initialization', () => {
    it('starts with no last valid EAR', () => {
      expect(detector.getLastValidEAR()).toBe(null)
    })

    it('starts not in recovery', () => {
      expect(detector.isInRecovery()).toBe(false)
    })
  })

  describe('first frame', () => {
    it('first frame is never a spike', () => {
      const result = detector.process(0.5)

      expect(result.isSpike).toBe(false)
      expect(result.ear).toBe(0.5)
      expect(result.inRecovery).toBe(false)
    })

    it('first frame sets last valid EAR', () => {
      detector.process(0.42)
      expect(detector.getLastValidEAR()).toBe(0.42)
    })
  })

  describe('spike detection', () => {
    it('detects spike when delta exceeds threshold', () => {
      detector.process(0.3) // First frame
      const result = detector.process(0.5) // Delta = 0.2 > 0.15

      expect(result.isSpike).toBe(true)
    })

    it('does not detect spike when delta is within threshold', () => {
      detector.process(0.3)
      const result = detector.process(0.4) // Delta = 0.1 < 0.15

      expect(result.isSpike).toBe(false)
    })

    it('exactly at threshold is a spike (uses > not >=)', () => {
      detector.process(0.3)
      const result = detector.process(0.45) // Delta = 0.15 (exactly at threshold)

      // Implementation uses delta > maxDelta, so exactly at threshold IS a spike
      expect(result.isSpike).toBe(true)
    })

    it('just below threshold is not a spike', () => {
      detector.process(0.3)
      const result = detector.process(0.449) // Delta = 0.149 < 0.15

      expect(result.isSpike).toBe(false)
    })

    it('detects negative spikes (sudden drops)', () => {
      detector.process(0.5)
      const result = detector.process(0.2) // Delta = 0.3 > 0.15

      expect(result.isSpike).toBe(true)
    })

    it('returns last valid EAR when spike detected', () => {
      detector.process(0.3)
      const result = detector.process(0.6) // Spike

      expect(result.ear).toBe(0.3) // Returns last valid, not spiked value
    })
  })

  describe('recovery period', () => {
    it('enters recovery after spike', () => {
      detector.process(0.3)
      detector.process(0.6) // Spike

      expect(detector.isInRecovery()).toBe(true)
    })

    it('stays in recovery for configured frames', () => {
      const customDetector = new SpikeDetector({ recoveryFrames: 3 })

      customDetector.process(0.3)
      customDetector.process(0.6) // Spike - enter recovery

      // Should be in recovery for 3 frames
      expect(customDetector.isInRecovery()).toBe(true)
      customDetector.process(0.6) // Still spiked
      expect(customDetector.isInRecovery()).toBe(true)
      customDetector.process(0.6) // Still spiked
      expect(customDetector.isInRecovery()).toBe(true)
      customDetector.process(0.6) // Still spiked, but recovery counter exhausted
      expect(customDetector.isInRecovery()).toBe(false)
    })

    it('uses last valid EAR during recovery', () => {
      detector.process(0.3)
      detector.process(0.6) // Spike

      const result = detector.process(0.55) // Still high
      expect(result.ear).toBe(0.3) // Last valid
      expect(result.inRecovery).toBe(true)
    })

    it('exits recovery early when value stabilizes', () => {
      detector.process(0.3)
      detector.process(0.6) // Spike

      // Value returns to near last valid
      const result = detector.process(0.35) // Within threshold of 0.3

      expect(result.isSpike).toBe(false)
      expect(result.inRecovery).toBe(false)
      expect(result.ear).toBe(0.35)
    })

    it('updates last valid EAR after stabilization', () => {
      detector.process(0.3)
      detector.process(0.6) // Spike
      detector.process(0.32) // Stabilize

      expect(detector.getLastValidEAR()).toBe(0.32)
    })
  })

  describe('wouldBeSpike', () => {
    it('returns false for first frame', () => {
      expect(detector.wouldBeSpike(0.5)).toBe(false)
    })

    it('returns true if value would be a spike', () => {
      detector.process(0.3)
      expect(detector.wouldBeSpike(0.6)).toBe(true)
    })

    it('returns false if value would not be a spike', () => {
      detector.process(0.3)
      expect(detector.wouldBeSpike(0.35)).toBe(false)
    })

    it('does not modify state', () => {
      detector.process(0.3)
      const lastValid = detector.getLastValidEAR()

      detector.wouldBeSpike(0.6)

      expect(detector.getLastValidEAR()).toBe(lastValid)
      expect(detector.isInRecovery()).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('handles NaN gracefully', () => {
      detector.process(0.3)
      const result = detector.process(NaN)

      expect(result.isSpike).toBe(true)
      expect(result.ear).toBe(0.3) // Falls back to last valid
    })

    it('handles NaN on first frame', () => {
      const result = detector.process(NaN)

      expect(result.isSpike).toBe(true)
      expect(result.ear).toBe(0.3) // Default fallback
    })

    it('handles Infinity', () => {
      detector.process(0.3)
      const result = detector.process(Infinity)

      expect(result.isSpike).toBe(true)
    })

    it('handles zero values', () => {
      detector.process(0.3)
      const result = detector.process(0) // Delta = 0.3 > 0.15

      expect(result.isSpike).toBe(true)
    })
  })

  describe('custom configuration', () => {
    it('respects custom maxDelta', () => {
      const lenient = new SpikeDetector({ maxDelta: 0.3 })

      lenient.process(0.3)
      const result = lenient.process(0.5) // Delta = 0.2 < 0.3

      expect(result.isSpike).toBe(false)
    })

    it('respects custom recoveryFrames', () => {
      const shortRecovery = new SpikeDetector({ recoveryFrames: 1 })

      shortRecovery.process(0.3)
      shortRecovery.process(0.6) // Spike
      expect(shortRecovery.isInRecovery()).toBe(true)

      shortRecovery.process(0.6) // One frame of recovery
      expect(shortRecovery.isInRecovery()).toBe(false)
    })
  })

  describe('reset', () => {
    it('clears last valid EAR', () => {
      detector.process(0.3)
      detector.reset()

      expect(detector.getLastValidEAR()).toBe(null)
    })

    it('clears recovery state', () => {
      detector.process(0.3)
      detector.process(0.6) // Spike
      expect(detector.isInRecovery()).toBe(true)

      detector.reset()
      expect(detector.isInRecovery()).toBe(false)
    })

    it('allows fresh start after reset', () => {
      detector.process(0.3)
      detector.reset()

      const result = detector.process(0.5)
      expect(result.isSpike).toBe(false) // First frame after reset
    })
  })

  describe('realistic scenarios', () => {
    it('handles glasses reflection pattern', () => {
      // Normal reading -> sudden spike -> return to normal
      detector.process(0.28) // Normal
      detector.process(0.29) // Normal
      detector.process(0.75) // Reflection spike!
      detector.process(0.27) // Back to normal

      expect(detector.getLastValidEAR()).toBeCloseTo(0.27, 2)
    })

    it('handles gradual changes without false positives', () => {
      const values = [0.3, 0.32, 0.35, 0.33, 0.31, 0.28, 0.25, 0.22, 0.20]

      for (const v of values) {
        const result = detector.process(v)
        expect(result.isSpike).toBe(false)
      }
    })
  })
})
