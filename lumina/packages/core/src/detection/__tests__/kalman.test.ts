/**
 * Tests for KalmanFilter1D
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { KalmanFilter1D } from '../kalman'

describe('KalmanFilter1D', () => {
  let filter: KalmanFilter1D

  beforeEach(() => {
    filter = new KalmanFilter1D()
  })

  describe('initialization', () => {
    it('starts with default initial estimate of 0.3', () => {
      expect(filter.getEstimate()).toBe(0.3)
    })

    it('uses custom initial estimate when provided', () => {
      const customFilter = new KalmanFilter1D({ initialEstimate: 0.5 })
      expect(customFilter.getEstimate()).toBe(0.5)
    })

    it('starts with initial error of 1.0', () => {
      expect(filter.getErrorCovariance()).toBe(1.0)
    })
  })

  describe('update', () => {
    it('moves estimate toward measurement', () => {
      const initial = filter.getEstimate()
      filter.update(0.5)
      const afterUpdate = filter.getEstimate()

      // Should move toward 0.5
      expect(afterUpdate).toBeGreaterThan(initial)
      expect(afterUpdate).toBeLessThan(0.5)
    })

    it('converges to constant measurement over time', () => {
      const targetValue = 0.25

      // Feed same value multiple times
      for (let i = 0; i < 50; i++) {
        filter.update(targetValue)
      }

      // Should be very close to target
      expect(filter.getEstimate()).toBeCloseTo(targetValue, 2)
    })

    it('smooths noisy measurements', () => {
      const baseValue = 0.3
      const noise = 0.1
      const values: number[] = []

      // Generate noisy measurements
      for (let i = 0; i < 100; i++) {
        const noisyValue = baseValue + (Math.random() - 0.5) * noise
        values.push(filter.update(noisyValue))
      }

      // Variance of filtered values should be less than input noise
      const mean = values.reduce((a, b) => a + b) / values.length
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length

      // Filtered variance should be much smaller than noise
      expect(variance).toBeLessThan(noise * noise / 4)
    })

    it('returns smoothed estimate', () => {
      const result = filter.update(0.5)
      expect(result).toBe(filter.getEstimate())
    })

    it('decreases error covariance over time', () => {
      const initialError = filter.getErrorCovariance()

      filter.update(0.3)
      const afterOne = filter.getErrorCovariance()

      filter.update(0.3)
      const afterTwo = filter.getErrorCovariance()

      expect(afterOne).toBeLessThan(initialError)
      expect(afterTwo).toBeLessThan(afterOne)
    })
  })

  describe('edge cases', () => {
    it('handles NaN input gracefully', () => {
      const initial = filter.getEstimate()
      const result = filter.update(NaN)

      // Should return previous estimate unchanged
      expect(result).toBe(initial)
      expect(filter.getEstimate()).toBe(initial)
    })

    it('handles Infinity input gracefully', () => {
      const initial = filter.getEstimate()
      filter.update(Infinity)

      // Should keep previous estimate
      expect(filter.getEstimate()).toBe(initial)
    })

    it('handles negative Infinity input gracefully', () => {
      const initial = filter.getEstimate()
      filter.update(-Infinity)

      expect(filter.getEstimate()).toBe(initial)
    })

    it('handles zero correctly', () => {
      filter.update(0)
      expect(filter.getEstimate()).toBeGreaterThan(0) // Smoothed toward 0
      expect(filter.getEstimate()).toBeLessThan(0.3) // But not immediately 0
    })

    it('handles negative values (edge case)', () => {
      filter.update(-0.1)
      expect(Number.isFinite(filter.getEstimate())).toBe(true)
    })
  })

  describe('reset', () => {
    it('restores initial estimate', () => {
      filter.update(0.5)
      filter.update(0.5)
      filter.reset()

      expect(filter.getEstimate()).toBe(0.3) // Default initial
    })

    it('restores initial error covariance', () => {
      filter.update(0.5)
      filter.reset()

      expect(filter.getErrorCovariance()).toBe(1.0)
    })
  })

  describe('getKalmanGain', () => {
    it('returns gain between 0 and 1', () => {
      const gain = filter.getKalmanGain()
      expect(gain).toBeGreaterThan(0)
      expect(gain).toBeLessThan(1)
    })

    it('gain decreases as filter becomes more confident', () => {
      const initialGain = filter.getKalmanGain()

      filter.update(0.3)
      const afterOne = filter.getKalmanGain()

      filter.update(0.3)
      const afterTwo = filter.getKalmanGain()

      expect(afterOne).toBeLessThan(initialGain)
      expect(afterTwo).toBeLessThan(afterOne)
    })
  })

  describe('custom configuration', () => {
    it('higher measurement noise means slower convergence', () => {
      const lowNoise = new KalmanFilter1D({ measurementNoise: 0.01 })
      const highNoise = new KalmanFilter1D({ measurementNoise: 1.0 })

      // Same measurement
      lowNoise.update(0.5)
      highNoise.update(0.5)

      // Low noise should converge faster (closer to measurement)
      expect(lowNoise.getEstimate()).toBeGreaterThan(highNoise.getEstimate())
    })

    it('higher process noise means more responsive to changes', () => {
      const lowProcess = new KalmanFilter1D({ processNoise: 0.001 })
      const highProcess = new KalmanFilter1D({ processNoise: 0.1 })

      // Both start at 0.3, then get measurement of 0.5
      lowProcess.update(0.5)
      highProcess.update(0.5)

      // High process noise should be more responsive
      expect(highProcess.getEstimate()).toBeGreaterThan(lowProcess.getEstimate())
    })
  })
})
