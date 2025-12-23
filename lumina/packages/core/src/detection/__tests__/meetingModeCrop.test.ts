/**
 * Unit tests for Meeting Mode Cropping Logic
 *
 * Tests the coordinate scaling and clamping that occurs when
 * cropping screen capture to the self-view region during meetings.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCropRegion,
  clampRegion,
  needsRecalibration,
  type CalibrationData,
  type CropRegion,
} from '../meetingModeCrop';

describe('calculateCropRegion', () => {
  describe('normal cases', () => {
    it('returns unchanged region when calibration matches video dimensions', () => {
      const calibration: CalibrationData = {
        region: { x: 100, y: 50, width: 300, height: 150 },
        calibrationWidth: 1920,
        calibrationHeight: 1080,
      };

      const result = calculateCropRegion(calibration, 1920, 1080);

      expect(result.scaledRegion).toEqual({ x: 100, y: 50, width: 300, height: 150 });
      expect(result.scale).toEqual({ x: 1, y: 1 });
      expect(result.outOfBounds).toEqual({ x: false, y: false });
      expect(result.warnings).toHaveLength(0);
    });

    it('scales region up when video is larger than calibration', () => {
      const calibration: CalibrationData = {
        region: { x: 100, y: 50, width: 300, height: 150 },
        calibrationWidth: 960, // Half of video
        calibrationHeight: 540,
      };

      const result = calculateCropRegion(calibration, 1920, 1080);

      // Everything should double
      expect(result.scaledRegion).toEqual({ x: 200, y: 100, width: 600, height: 300 });
      expect(result.scale).toEqual({ x: 2, y: 2 });
      expect(result.outOfBounds).toEqual({ x: false, y: false });
    });

    it('scales region down when video is smaller than calibration', () => {
      const calibration: CalibrationData = {
        region: { x: 200, y: 100, width: 600, height: 300 },
        calibrationWidth: 1920,
        calibrationHeight: 1080,
      };

      const result = calculateCropRegion(calibration, 960, 540);

      // Everything should halve
      expect(result.scaledRegion).toEqual({ x: 100, y: 50, width: 300, height: 150 });
      expect(result.scale).toEqual({ x: 0.5, y: 0.5 });
      expect(result.outOfBounds).toEqual({ x: false, y: false });
    });
  });

  describe('missing calibration dimensions (THE BUG SCENARIO)', () => {
    it('falls back to video dimensions when calibrationWidth is missing', () => {
      const calibration: CalibrationData = {
        region: { x: 100, y: 50, width: 300, height: 150 },
        // calibrationWidth: undefined - MISSING!
        calibrationHeight: 1080,
      };

      const result = calculateCropRegion(calibration, 1920, 1080);

      // Should warn about missing dimension
      expect(result.warnings.some((w) => w.includes('calibrationWidth missing'))).toBe(true);
      // Scale should be 1.0 (fallback)
      expect(result.scale.x).toBe(1);
    });

    it('falls back to video dimensions when calibrationHeight is missing', () => {
      const calibration: CalibrationData = {
        region: { x: 100, y: 50, width: 300, height: 150 },
        calibrationWidth: 1920,
        // calibrationHeight: undefined - MISSING!
      };

      const result = calculateCropRegion(calibration, 1920, 1080);

      expect(result.warnings.some((w) => w.includes('calibrationHeight missing'))).toBe(true);
      expect(result.scale.y).toBe(1);
    });

    it('handles both dimensions missing (common case for old calibrations)', () => {
      const calibration: CalibrationData = {
        region: { x: 1620, y: 880, width: 280, height: 200 },
        // Both missing - this is the demo data scenario
      };

      const result = calculateCropRegion(calibration, 1920, 1080);

      // Should warn about both
      expect(result.warnings).toHaveLength(2);
      // Scale should be 1:1
      expect(result.scale).toEqual({ x: 1, y: 1 });
      // This region IS within bounds for 1920x1080
      expect(result.outOfBounds).toEqual({ x: false, y: false });
    });
  });

  describe('out of bounds scenarios (THE BLANK STREAM BUG)', () => {
    it('detects X out of bounds', () => {
      const calibration: CalibrationData = {
        region: { x: 1700, y: 100, width: 300, height: 150 },
        calibrationWidth: 1920,
        calibrationHeight: 1080,
      };

      const result = calculateCropRegion(calibration, 1920, 1080);

      // 1700 + 300 = 2000 > 1920 = OUT OF BOUNDS
      expect(result.outOfBounds.x).toBe(true);
      expect(result.outOfBounds.y).toBe(false);
      expect(result.warnings.some((w) => w.includes('X out of bounds'))).toBe(true);
    });

    it('detects Y out of bounds', () => {
      const calibration: CalibrationData = {
        region: { x: 100, y: 900, width: 300, height: 200 },
        calibrationWidth: 1920,
        calibrationHeight: 1080,
      };

      const result = calculateCropRegion(calibration, 1920, 1080);

      // 900 + 200 = 1100 > 1080 = OUT OF BOUNDS
      expect(result.outOfBounds.x).toBe(false);
      expect(result.outOfBounds.y).toBe(true);
      expect(result.warnings.some((w) => w.includes('Y out of bounds'))).toBe(true);
    });

    it('detects both X and Y out of bounds', () => {
      const calibration: CalibrationData = {
        region: { x: 1700, y: 900, width: 300, height: 200 },
        calibrationWidth: 1920,
        calibrationHeight: 1080,
      };

      const result = calculateCropRegion(calibration, 1920, 1080);

      expect(result.outOfBounds).toEqual({ x: true, y: true });
    });

    it('detects out of bounds when video is smaller than calibration', () => {
      // Calibrated on 1920x1080, but video is 1280x720
      const calibration: CalibrationData = {
        region: { x: 1500, y: 800, width: 400, height: 260 },
        calibrationWidth: 1920,
        calibrationHeight: 1080,
      };

      const result = calculateCropRegion(calibration, 1280, 720);

      // Scaled: x = 1500 * (1280/1920) = 1000, width = 400 * 0.67 = 267
      // 1000 + 267 = 1267 < 1280 - actually fits!
      // y = 800 * (720/1080) = 533, height = 260 * 0.67 = 173
      // 533 + 173 = 706 < 720 - fits!
      expect(result.outOfBounds).toEqual({ x: false, y: false });
    });

    it('REPRODUCES THE BUG: calibration without dimensions on different resolution', () => {
      // This is the exact bug scenario:
      // - User calibrates on 1920x1080 screenshot (full screen)
      // - calibrationWidth/Height NOT saved (old code or bug)
      // - Window capture returns different resolution (e.g., 1280x720 window)
      // - Coordinates are used as-is (scale = 1.0)
      // - Result: coordinates way out of bounds

      const calibration: CalibrationData = {
        region: { x: 1620, y: 880, width: 280, height: 200 },
        // MISSING: calibrationWidth, calibrationHeight
      };

      // Window capture at 720p
      const result = calculateCropRegion(calibration, 1280, 720);

      // Scale falls back to 1.0 because dimensions are missing
      expect(result.scale).toEqual({ x: 1, y: 1 });

      // Region used as-is:
      // x: 1620 + 280 = 1900 > 1280 = OUT OF BOUNDS!
      // y: 880 + 200 = 1080 > 720 = OUT OF BOUNDS!
      expect(result.outOfBounds).toEqual({ x: true, y: true });

      // This is why the stream is blank - drawImage draws nothing
      // when source coordinates exceed video bounds
    });
  });

  describe('clamped region (THE FIX)', () => {
    it('clamps out of bounds region to valid coordinates', () => {
      const calibration: CalibrationData = {
        region: { x: 1700, y: 900, width: 300, height: 200 },
        calibrationWidth: 1920,
        calibrationHeight: 1080,
      };

      const result = calculateCropRegion(calibration, 1920, 1080);

      // Scaled region is out of bounds
      expect(result.outOfBounds).toEqual({ x: true, y: true });

      // But clamped region is always valid
      const { clampedRegion } = result;
      expect(clampedRegion.x + clampedRegion.width).toBeLessThanOrEqual(1920);
      expect(clampedRegion.y + clampedRegion.height).toBeLessThanOrEqual(1080);
      expect(clampedRegion.x).toBeGreaterThanOrEqual(0);
      expect(clampedRegion.y).toBeGreaterThanOrEqual(0);
    });

    it('clamped region for the bug scenario gives partial but valid region', () => {
      const calibration: CalibrationData = {
        region: { x: 1620, y: 880, width: 280, height: 200 },
        // MISSING dimensions
      };

      const result = calculateCropRegion(calibration, 1280, 720);

      // Clamped region should be valid for 1280x720
      const { clampedRegion } = result;

      // Clamp keeps x as-is (1620) but clamps width to fit: maxWidth = 1280 - 1620 = negative!
      // So x gets clamped to max valid position, width becomes minimum (1)
      // The key guarantee: x + width <= videoWidth and y + height <= videoHeight
      expect(clampedRegion.x + clampedRegion.width).toBeLessThanOrEqual(1280);
      expect(clampedRegion.y + clampedRegion.height).toBeLessThanOrEqual(720);
      expect(clampedRegion.width).toBeGreaterThanOrEqual(1);
      expect(clampedRegion.height).toBeGreaterThanOrEqual(1);
    });
  });

  describe('test video scenario (503x268 region in bottom-right of 720p)', () => {
    it('calculates correct region for test video', () => {
      // User's test video: 1280x720, self-view 503x268 in bottom-right
      const calibration: CalibrationData = {
        region: {
          x: 1280 - 503, // 777
          y: 720 - 268, // 452
          width: 503,
          height: 268,
        },
        calibrationWidth: 1280,
        calibrationHeight: 720,
      };

      const result = calculateCropRegion(calibration, 1280, 720);

      expect(result.scaledRegion).toEqual({ x: 777, y: 452, width: 503, height: 268 });
      expect(result.outOfBounds).toEqual({ x: false, y: false });
      expect(result.warnings).toHaveLength(0);
    });

    it('handles test video region without calibration dimensions', () => {
      // Same region but missing calibration dimensions
      const calibration: CalibrationData = {
        region: { x: 777, y: 452, width: 503, height: 268 },
        // MISSING dimensions - simulates the bug
      };

      // If video happens to be same resolution, it works
      const result720p = calculateCropRegion(calibration, 1280, 720);
      expect(result720p.outOfBounds).toEqual({ x: false, y: false });

      // But if video is different resolution, it breaks
      const result1080p = calculateCropRegion(calibration, 1920, 1080);
      // Scale = 1.0, so same coordinates used
      // 777 + 503 = 1280 <= 1920 - X is fine
      // 452 + 268 = 720 <= 1080 - Y is fine
      // Actually this works by luck! The region is small enough
      expect(result1080p.outOfBounds).toEqual({ x: false, y: false });
    });
  });
});

describe('clampRegion', () => {
  it('returns unchanged region when already in bounds', () => {
    const region: CropRegion = { x: 100, y: 50, width: 300, height: 150 };
    const result = clampRegion(region, 1920, 1080);
    expect(result).toEqual(region);
  });

  it('clamps negative x to 0', () => {
    const region: CropRegion = { x: -50, y: 50, width: 300, height: 150 };
    const result = clampRegion(region, 1920, 1080);
    expect(result.x).toBe(0);
  });

  it('clamps negative y to 0', () => {
    const region: CropRegion = { x: 100, y: -30, width: 300, height: 150 };
    const result = clampRegion(region, 1920, 1080);
    expect(result.y).toBe(0);
  });

  it('clamps width when x + width exceeds video width', () => {
    const region: CropRegion = { x: 1700, y: 50, width: 300, height: 150 };
    const result = clampRegion(region, 1920, 1080);
    // maxWidth = 1920 - 1700 = 220
    expect(result.width).toBe(220);
  });

  it('clamps height when y + height exceeds video height', () => {
    const region: CropRegion = { x: 100, y: 950, width: 300, height: 200 };
    const result = clampRegion(region, 1920, 1080);
    // maxHeight = 1080 - 950 = 130
    expect(result.height).toBe(130);
  });

  it('ensures minimum size of 1x1', () => {
    const region: CropRegion = { x: 1920, y: 1080, width: 300, height: 200 };
    const result = clampRegion(region, 1920, 1080);
    // x clamped to 1919 (videoWidth - 1 would make width 1)
    // Actually: x stays 1920, maxWidth = 1920-1920 = 0, but we clamp to min 1
    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });
});

describe('needsRecalibration', () => {
  it('returns false for valid calibration', () => {
    const calibration: CalibrationData = {
      region: { x: 100, y: 50, width: 300, height: 150 },
      calibrationWidth: 1920,
      calibrationHeight: 1080,
    };

    const result = needsRecalibration(calibration, 1920, 1080);
    expect(result.needsRecal).toBe(false);
  });

  it('returns true when calibration dimensions are missing', () => {
    const calibration: CalibrationData = {
      region: { x: 100, y: 50, width: 300, height: 150 },
      // Missing dimensions
    };

    const result = needsRecalibration(calibration, 1920, 1080);
    expect(result.needsRecal).toBe(true);
    expect(result.reason).toContain('dimensions missing');
  });

  it('returns true for significant resolution mismatch', () => {
    const calibration: CalibrationData = {
      region: { x: 100, y: 50, width: 300, height: 150 },
      calibrationWidth: 1920,
      calibrationHeight: 1080,
    };

    // 8K video vs 1080p calibration (4x scale - clearly over threshold)
    const result = needsRecalibration(calibration, 7680, 4320);
    expect(result.needsRecal).toBe(true);
    expect(result.reason).toContain('Resolution mismatch');
  });

  it('returns true when region is mostly out of bounds', () => {
    const calibration: CalibrationData = {
      region: { x: 1800, y: 1000, width: 200, height: 150 },
      calibrationWidth: 1920,
      calibrationHeight: 1080,
    };

    // Smaller video - region will be way out of bounds
    const result = needsRecalibration(calibration, 1280, 720);
    expect(result.needsRecal).toBe(true);
    expect(result.reason).toContain('out of bounds');
  });
});
