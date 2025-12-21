/**
 * Tests for EyeQualityTracker
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { EyeQualityTracker } from '../eye-quality'

describe('EyeQualityTracker', () => {
  let tracker: EyeQualityTracker

  beforeEach(() => {
    tracker = new EyeQualityTracker()
  })

  describe('initialization', () => {
    it('starts with empty buffers', () => {
      expect(tracker.getSampleCount()).toBe(0)
    })

    it('does not have enough data initially', () => {
      expect(tracker.hasEnoughData()).toBe(false)
    })
  })

  describe('addFrame', () => {
    it('increments sample count', () => {
      tracker.addFrame(0.3, 0.3)
      expect(tracker.getSampleCount()).toBe(1)

      tracker.addFrame(0.3, 0.3)
      expect(tracker.getSampleCount()).toBe(2)
    })

    it('caps buffer at window size', () => {
      // Default window is 10
      for (let i = 0; i < 20; i++) {
        tracker.addFrame(0.3, 0.3)
      }

      expect(tracker.getSampleCount()).toBe(10)
    })
  })

  describe('hasEnoughData', () => {
    it('returns false until window is filled', () => {
      for (let i = 0; i < 9; i++) {
        tracker.addFrame(0.3, 0.3)
        expect(tracker.hasEnoughData()).toBe(false)
      }

      tracker.addFrame(0.3, 0.3)
      expect(tracker.hasEnoughData()).toBe(true)
    })
  })

  describe('getQuality', () => {
    it('returns near-zero variance for identical values', () => {
      for (let i = 0; i < 10; i++) {
        tracker.addFrame(0.3, 0.3)
      }

      const quality = tracker.getQuality()
      // Floating point may produce tiny values instead of exact 0
      expect(quality.leftVariance).toBeLessThan(1e-10)
      expect(quality.rightVariance).toBeLessThan(1e-10)
    })

    it('calculates correct variance', () => {
      // Values: 0.1, 0.2, 0.3, 0.4, 0.5 for left
      // Mean = 0.3, Variance = [(0.04+0.01+0+0.01+0.04)] / 5 = 0.02
      tracker.addFrame(0.1, 0.3)
      tracker.addFrame(0.2, 0.3)
      tracker.addFrame(0.3, 0.3)
      tracker.addFrame(0.4, 0.3)
      tracker.addFrame(0.5, 0.3)

      const quality = tracker.getQuality()
      expect(quality.leftVariance).toBeCloseTo(0.02, 4)
      expect(quality.rightVariance).toBe(0)
    })

    it('identifies left eye as stable when variance is low', () => {
      for (let i = 0; i < 10; i++) {
        tracker.addFrame(0.3, 0.3 + i * 0.05) // Left stable, right varying
      }

      const quality = tracker.getQuality()
      expect(quality.leftStable).toBe(true)
      expect(quality.rightStable).toBe(false)
    })

    it('identifies right eye as stable when variance is low', () => {
      for (let i = 0; i < 10; i++) {
        tracker.addFrame(0.3 + i * 0.05, 0.3) // Left varying, right stable
      }

      const quality = tracker.getQuality()
      expect(quality.leftStable).toBe(false)
      expect(quality.rightStable).toBe(true)
    })
  })

  describe('preferredEye selection', () => {
    it('prefers both when both stable', () => {
      for (let i = 0; i < 10; i++) {
        tracker.addFrame(0.3, 0.3) // Both stable
      }

      const quality = tracker.getQuality()
      expect(quality.preferredEye).toBe('both')
    })

    it('prefers left when only left stable', () => {
      for (let i = 0; i < 10; i++) {
        tracker.addFrame(0.3, 0.3 + i * 0.1) // Left stable, right varying a lot
      }

      const quality = tracker.getQuality()
      expect(quality.preferredEye).toBe('left')
    })

    it('prefers right when only right stable', () => {
      for (let i = 0; i < 10; i++) {
        tracker.addFrame(0.3 + i * 0.1, 0.3) // Left varying, right stable
      }

      const quality = tracker.getQuality()
      expect(quality.preferredEye).toBe('right')
    })

    it('prefers less unstable eye when both unstable', () => {
      for (let i = 0; i < 10; i++) {
        // Left has high variance, right has even higher
        tracker.addFrame(0.3 + i * 0.05, 0.3 + i * 0.1)
      }

      const quality = tracker.getQuality()
      expect(quality.preferredEye).toBe('left') // Less variance
    })
  })

  describe('getBestEAR', () => {
    it('returns average when not enough data', () => {
      tracker.addFrame(0.2, 0.4)
      tracker.addFrame(0.2, 0.4)

      const best = tracker.getBestEAR(0.2, 0.4)
      expect(best).toBeCloseTo(0.3, 10) // Average
    })

    it('returns average when both eyes stable', () => {
      for (let i = 0; i < 10; i++) {
        tracker.addFrame(0.3, 0.3)
      }

      const best = tracker.getBestEAR(0.2, 0.4)
      expect(best).toBeCloseTo(0.3, 10) // Average
    })

    it('returns left EAR when left eye preferred', () => {
      for (let i = 0; i < 10; i++) {
        tracker.addFrame(0.3, 0.3 + i * 0.1) // Right unstable
      }

      const best = tracker.getBestEAR(0.25, 0.5)
      expect(best).toBe(0.25) // Left eye value
    })

    it('returns right EAR when right eye preferred', () => {
      for (let i = 0; i < 10; i++) {
        tracker.addFrame(0.3 + i * 0.1, 0.3) // Left unstable
      }

      const best = tracker.getBestEAR(0.5, 0.25)
      expect(best).toBe(0.25) // Right eye value
    })
  })

  describe('custom configuration', () => {
    it('respects custom window size', () => {
      const smallWindow = new EyeQualityTracker({ windowSize: 5 })

      for (let i = 0; i < 5; i++) {
        smallWindow.addFrame(0.3, 0.3)
      }

      expect(smallWindow.hasEnoughData()).toBe(true)
      expect(smallWindow.getSampleCount()).toBe(5)
    })

    it('respects custom quality threshold', () => {
      const strictTracker = new EyeQualityTracker({ qualityThreshold: 0.0001 })

      // Variance with i * 0.01 over 10 values is about 0.0083
      // This is above threshold of 0.0001, so should be unstable
      for (let i = 0; i < 10; i++) {
        strictTracker.addFrame(0.3 + i * 0.01, 0.3)
      }

      const quality = strictTracker.getQuality()
      expect(quality.leftStable).toBe(false) // Above strict threshold
      expect(quality.rightStable).toBe(true) // Right is constant
    })
  })

  describe('reset', () => {
    it('clears buffers', () => {
      tracker.addFrame(0.3, 0.3)
      tracker.addFrame(0.3, 0.3)
      tracker.reset()

      expect(tracker.getSampleCount()).toBe(0)
      expect(tracker.hasEnoughData()).toBe(false)
    })

    it('allows fresh start after reset', () => {
      for (let i = 0; i < 10; i++) {
        tracker.addFrame(0.3 + i * 0.1, 0.3) // Left unstable
      }

      tracker.reset()

      for (let i = 0; i < 10; i++) {
        tracker.addFrame(0.3, 0.3) // Both stable now
      }

      const quality = tracker.getQuality()
      expect(quality.preferredEye).toBe('both')
    })
  })

  describe('realistic scenarios', () => {
    it('handles glasses reflection on one eye', () => {
      // Left eye has stable readings, right eye has reflection artifacts
      const leftValues = [0.28, 0.29, 0.28, 0.30, 0.29, 0.28, 0.29, 0.28, 0.29, 0.28]
      const rightValues = [0.28, 0.65, 0.29, 0.70, 0.28, 0.55, 0.29, 0.60, 0.28, 0.58] // Spiky

      for (let i = 0; i < 10; i++) {
        tracker.addFrame(leftValues[i], rightValues[i])
      }

      const quality = tracker.getQuality()
      expect(quality.preferredEye).toBe('left') // Should prefer stable left eye
      expect(quality.leftVariance).toBeLessThan(quality.rightVariance)
    })

    it('handles both eyes stable during normal operation', () => {
      // Normal blink-free period with slight natural variation
      for (let i = 0; i < 10; i++) {
        const noise = (Math.random() - 0.5) * 0.02 // Small noise
        tracker.addFrame(0.3 + noise, 0.3 + noise)
      }

      const quality = tracker.getQuality()
      expect(quality.preferredEye).toBe('both')
    })

    it('adapts to changing conditions', () => {
      // Initially both stable
      for (let i = 0; i < 10; i++) {
        tracker.addFrame(0.3, 0.3)
      }
      expect(tracker.getQuality().preferredEye).toBe('both')

      // Then right eye gets occluded (high variance)
      for (let i = 0; i < 10; i++) {
        tracker.addFrame(0.3, 0.3 + i * 0.1)
      }
      expect(tracker.getQuality().preferredEye).toBe('left')
    })
  })
})
