/**
 * Tests for EARCalibrator
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EARCalibrator } from '../ear-calibrator'

describe('EARCalibrator', () => {
  let calibrator: EARCalibrator

  beforeEach(() => {
    vi.useFakeTimers()
    calibrator = new EARCalibrator()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('starts in uncalibrated state', () => {
      expect(calibrator.getState()).toBe('uncalibrated')
    })

    it('returns fallback threshold before calibration', () => {
      expect(calibrator.getThreshold()).toBe(0.21)
    })

    it('is not calibrated initially', () => {
      expect(calibrator.isCalibrated()).toBe(false)
    })

    it('has zero progress initially', () => {
      expect(calibrator.getProgress()).toBe(0)
    })
  })

  describe('calibration process', () => {
    it('transitions to calibrating on first sample', () => {
      calibrator.addSample(0.3)
      expect(calibrator.getState()).toBe('calibrating')
    })

    it('tracks progress during calibration', () => {
      calibrator.addSample(0.3)
      vi.advanceTimersByTime(30000) // 30 seconds

      expect(calibrator.getProgress()).toBeCloseTo(0.5, 1) // 50%
    })

    it('completes calibration after duration', () => {
      // Add first sample to start calibration
      calibrator.addSample(0.3)

      // Add enough samples (need 100 minimum)
      for (let i = 0; i < 120; i++) {
        vi.advanceTimersByTime(500) // Advance time BEFORE sample
        calibrator.addSample(0.3)
      }

      expect(calibrator.getState()).toBe('calibrated')
      expect(calibrator.getProgress()).toBe(1)
    })

    it('computes threshold using Modified EAR formula', () => {
      // Use forceCalibrate to avoid timing issues
      // Simulate realistic samples: mix of open and closed eyes
      const samples = []
      for (let i = 0; i < 80; i++) {
        samples.push(0.32) // Open eye
      }
      for (let i = 0; i < 20; i++) {
        samples.push(0.10) // Closed eye
      }

      // Add samples
      for (const sample of samples) {
        calibrator.addSample(sample)
      }

      // Force calibration
      const calibration = calibrator.forceCalibrate()
      expect(calibration).not.toBeNull()

      // P75 = 0.32, P10 = 0.10
      // Threshold = (0.32 + 0.10) / 2 = 0.21
      expect(calibration!.threshold).toBeCloseTo(0.21, 1)
    })

    it('returns calibrated threshold after completion', () => {
      for (let i = 0; i < 150; i++) {
        calibrator.addSample(0.3)
        vi.advanceTimersByTime(500)
      }

      const threshold = calibrator.getThreshold()
      expect(threshold).not.toBe(0.21) // Should be calibrated value
    })
  })

  describe('threshold calculation', () => {
    it('calculates percentiles correctly', () => {
      // Simple case: values 0.1 to 1.0 in steps of 0.1
      const customCalibrator = new EARCalibrator({
        calibrationDurationMs: 1000,
        minSamples: 10,
        openEyePercentile: 90,
        closedEyePercentile: 10,
      })

      for (let i = 1; i <= 10; i++) {
        customCalibrator.addSample(i * 0.1)
      }

      // Use forceCalibrate to avoid timing issues
      const calibration = customCalibrator.forceCalibrate()
      expect(calibration).not.toBeNull()

      // P90 of [0.1, 0.2, ..., 1.0] = 0.91 (interpolated)
      // P10 = 0.19
      // Threshold = (0.91 + 0.19) / 2 = 0.55
      expect(calibration!.threshold).toBeCloseTo(0.55, 1)
    })
  })

  describe('forceCalibrate', () => {
    it('returns null with insufficient samples', () => {
      calibrator.addSample(0.3)
      vi.advanceTimersByTime(100)

      const result = calibrator.forceCalibrate()
      expect(result).toBeNull()
      expect(calibrator.getState()).toBe('calibrating') // Still calibrating
    })

    it('forces calibration with sufficient samples', () => {
      for (let i = 0; i < 100; i++) {
        calibrator.addSample(0.3)
      }
      // Don't advance time past duration

      const result = calibrator.forceCalibrate()
      expect(result).not.toBeNull()
      expect(calibrator.getState()).toBe('calibrated')
    })
  })

  describe('loadCalibration', () => {
    it('loads existing calibration', () => {
      const existingCalibration = {
        threshold: 0.22,
        openEAR: 0.35,
        closedEAR: 0.09,
        calibratedAt: Date.now(),
        samplesCount: 200,
      }

      calibrator.loadCalibration(existingCalibration)

      expect(calibrator.getState()).toBe('calibrated')
      expect(calibrator.getThreshold()).toBe(0.22)
    })

    it('immediately becomes calibrated', () => {
      calibrator.loadCalibration({
        threshold: 0.18,
        openEAR: 0.30,
        closedEAR: 0.06,
        calibratedAt: Date.now(),
        samplesCount: 150,
      })

      expect(calibrator.isCalibrated()).toBe(true)
      expect(calibrator.getProgress()).toBe(1)
    })
  })

  describe('exportCalibration', () => {
    it('returns null when not calibrated', () => {
      expect(calibrator.exportCalibration()).toBeNull()
    })

    it('returns calibration data after completion', () => {
      for (let i = 0; i < 150; i++) {
        calibrator.addSample(0.3)
        vi.advanceTimersByTime(500)
      }

      const exported = calibrator.exportCalibration()
      expect(exported).not.toBeNull()
      expect(exported!.threshold).toBeDefined()
      expect(exported!.openEAR).toBeDefined()
      expect(exported!.closedEAR).toBeDefined()
      expect(exported!.calibratedAt).toBeDefined()
      expect(exported!.samplesCount).toBeGreaterThanOrEqual(100)
    })

    it('returns a copy, not the original', () => {
      calibrator.loadCalibration({
        threshold: 0.22,
        openEAR: 0.35,
        closedEAR: 0.09,
        calibratedAt: Date.now(),
        samplesCount: 200,
      })

      const exported = calibrator.exportCalibration()
      exported!.threshold = 0.99 // Modify the export

      expect(calibrator.getThreshold()).toBe(0.22) // Original unchanged
    })
  })

  describe('recalibrate', () => {
    it('resets to uncalibrated state', () => {
      calibrator.loadCalibration({
        threshold: 0.22,
        openEAR: 0.35,
        closedEAR: 0.09,
        calibratedAt: Date.now(),
        samplesCount: 200,
      })

      calibrator.recalibrate()

      expect(calibrator.getState()).toBe('uncalibrated')
    })

    it('keeps existing calibration as fallback', () => {
      calibrator.loadCalibration({
        threshold: 0.22,
        openEAR: 0.35,
        closedEAR: 0.09,
        calibratedAt: Date.now(),
        samplesCount: 200,
      })

      calibrator.recalibrate()

      // Should still use old threshold as fallback until new calibration completes
      expect(calibrator.getThreshold()).toBe(0.22)
    })
  })

  describe('reset', () => {
    it('clears all state', () => {
      calibrator.loadCalibration({
        threshold: 0.22,
        openEAR: 0.35,
        closedEAR: 0.09,
        calibratedAt: Date.now(),
        samplesCount: 200,
      })

      calibrator.reset()

      expect(calibrator.getState()).toBe('uncalibrated')
      expect(calibrator.getThreshold()).toBe(0.21) // Back to default
      expect(calibrator.getSampleCount()).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('ignores invalid samples (NaN)', () => {
      calibrator.addSample(0.3)
      calibrator.addSample(NaN)
      calibrator.addSample(0.3)

      expect(calibrator.getSampleCount()).toBe(2)
    })

    it('ignores invalid samples (negative)', () => {
      calibrator.addSample(0.3)
      calibrator.addSample(-0.1)
      calibrator.addSample(0.3)

      expect(calibrator.getSampleCount()).toBe(2)
    })

    it('ignores invalid samples (> 1)', () => {
      calibrator.addSample(0.3)
      calibrator.addSample(1.5)
      calibrator.addSample(0.3)

      expect(calibrator.getSampleCount()).toBe(2)
    })

    it('ignores zero samples', () => {
      calibrator.addSample(0.3)
      calibrator.addSample(0)
      calibrator.addSample(0.3)

      expect(calibrator.getSampleCount()).toBe(2)
    })

    it('returns calibrated threshold even after addSample when already calibrated', () => {
      for (let i = 0; i < 150; i++) {
        calibrator.addSample(0.3)
        vi.advanceTimersByTime(500)
      }

      const threshold = calibrator.getThreshold()

      // Add more samples after calibration
      calibrator.addSample(0.5)
      calibrator.addSample(0.1)

      // Threshold should not change
      expect(calibrator.getThreshold()).toBe(threshold)
    })
  })

  describe('custom configuration', () => {
    it('respects custom duration', () => {
      const fastCalibrator = new EARCalibrator({
        calibrationDurationMs: 10000, // 10 seconds
        minSamples: 50,
      })

      for (let i = 0; i < 60; i++) {
        fastCalibrator.addSample(0.3)
        vi.advanceTimersByTime(200)
      }

      expect(fastCalibrator.getState()).toBe('calibrated')
    })

    it('respects custom min samples', () => {
      const strictCalibrator = new EARCalibrator({
        calibrationDurationMs: 1000,
        minSamples: 200,
      })

      for (let i = 0; i < 100; i++) {
        strictCalibrator.addSample(0.3)
      }
      vi.advanceTimersByTime(1000)

      // Duration passed but not enough samples
      expect(strictCalibrator.getState()).toBe('calibrating')
    })

    it('respects custom fallback threshold', () => {
      const customFallback = new EARCalibrator({
        fallbackThreshold: 0.25,
      })

      expect(customFallback.getThreshold()).toBe(0.25)
    })
  })

  describe('realistic scenarios', () => {
    it('calibrates with typical user pattern', () => {
      // Use forceCalibrate to test the threshold calculation independently of timing
      // Simulate typical usage: 80% open eyes, 20% blink/closed
      // This ensures P10 captures closed values and P75 captures open values
      const samples: number[] = []

      // Generate 200 samples: 160 open, 40 closed
      for (let i = 0; i < 160; i++) {
        samples.push(0.28 + Math.random() * 0.05) // Open: 0.28-0.33
      }
      for (let i = 0; i < 40; i++) {
        samples.push(0.08 + Math.random() * 0.04) // Closed: 0.08-0.12
      }

      // Shuffle to simulate natural order
      for (let i = samples.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[samples[i], samples[j]] = [samples[j], samples[i]]
      }

      // Add all samples
      for (const sample of samples) {
        calibrator.addSample(sample)
      }

      const calibration = calibrator.forceCalibrate()
      expect(calibration).not.toBeNull()
      expect(calibrator.getState()).toBe('calibrated')

      // P75 ≈ 0.30 (open), P10 ≈ 0.10 (closed)
      // Threshold = (0.30 + 0.10) / 2 ≈ 0.20
      expect(calibration!.threshold).toBeGreaterThan(0.15)
      expect(calibration!.threshold).toBeLessThan(0.25)
    })
  })
})
