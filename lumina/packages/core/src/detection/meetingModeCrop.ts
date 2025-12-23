/**
 * Meeting Mode Cropping Logic
 *
 * Pure functions for calculating crop regions during meeting mode.
 * Extracted from App.tsx for testability.
 */

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CalibrationData {
  region: CropRegion;
  calibrationWidth?: number;
  calibrationHeight?: number;
}

export interface CropResult {
  /** Scaled region based on video/calibration ratio */
  scaledRegion: CropRegion;
  /** Scale factors applied */
  scale: { x: number; y: number };
  /** Whether scaled coordinates exceed video bounds */
  outOfBounds: { x: boolean; y: boolean };
  /** Safe region clamped to video bounds - always valid for drawImage */
  clampedRegion: CropRegion;
  /** Warnings about issues (out of bounds, missing dimensions, etc.) */
  warnings: string[];
}

/**
 * Calculate the crop region for meeting mode screen capture.
 *
 * This function handles the coordinate scaling between:
 * - Calibration time (screenshot dimensions)
 * - Runtime (actual video stream dimensions)
 *
 * @param calibration - Stored calibration data with region and optional dimensions
 * @param videoWidth - Actual video stream width
 * @param videoHeight - Actual video stream height
 * @returns CropResult with scaled region, clamped region, and warnings
 */
export function calculateCropRegion(
  calibration: CalibrationData,
  videoWidth: number,
  videoHeight: number
): CropResult {
  const warnings: string[] = [];

  // Use calibration dimensions if available, otherwise fall back to video dimensions
  // IMPORTANT: If calibrationWidth/Height are undefined, scale will be 1.0
  // This can cause issues if calibration was done at different resolution
  const calWidth = calibration.calibrationWidth ?? videoWidth;
  const calHeight = calibration.calibrationHeight ?? videoHeight;

  if (calibration.calibrationWidth === undefined) {
    warnings.push(`calibrationWidth missing, using video width (${videoWidth})`);
  }
  if (calibration.calibrationHeight === undefined) {
    warnings.push(`calibrationHeight missing, using video height (${videoHeight})`);
  }

  // Calculate scale factors
  const scaleX = videoWidth / calWidth;
  const scaleY = videoHeight / calHeight;

  // Scale the region coordinates
  const scaledRegion: CropRegion = {
    x: Math.round(calibration.region.x * scaleX),
    y: Math.round(calibration.region.y * scaleY),
    width: Math.round(calibration.region.width * scaleX),
    height: Math.round(calibration.region.height * scaleY),
  };

  // Check if scaled region is out of bounds
  const outOfBoundsX = scaledRegion.x + scaledRegion.width > videoWidth;
  const outOfBoundsY = scaledRegion.y + scaledRegion.height > videoHeight;
  const outOfBoundsNegX = scaledRegion.x < 0;
  const outOfBoundsNegY = scaledRegion.y < 0;

  if (outOfBoundsX) {
    warnings.push(
      `X out of bounds: ${scaledRegion.x} + ${scaledRegion.width} = ${scaledRegion.x + scaledRegion.width} > ${videoWidth}`
    );
  }
  if (outOfBoundsY) {
    warnings.push(
      `Y out of bounds: ${scaledRegion.y} + ${scaledRegion.height} = ${scaledRegion.y + scaledRegion.height} > ${videoHeight}`
    );
  }
  if (outOfBoundsNegX) {
    warnings.push(`X is negative: ${scaledRegion.x}`);
  }
  if (outOfBoundsNegY) {
    warnings.push(`Y is negative: ${scaledRegion.y}`);
  }

  // Clamp region to valid bounds
  // This ensures drawImage always has valid coordinates
  const clampedRegion = clampRegion(scaledRegion, videoWidth, videoHeight);

  return {
    scaledRegion,
    scale: { x: scaleX, y: scaleY },
    outOfBounds: { x: outOfBoundsX || outOfBoundsNegX, y: outOfBoundsY || outOfBoundsNegY },
    clampedRegion,
    warnings,
  };
}

/**
 * Clamp a region to fit within video bounds.
 * Ensures the region is always valid for canvas drawImage.
 */
export function clampRegion(
  region: CropRegion,
  videoWidth: number,
  videoHeight: number
): CropRegion {
  // Clamp x and y to be within valid range [0, videoWidth-1] and [0, videoHeight-1]
  // This handles the case where x/y are completely outside the video bounds
  const x = Math.max(0, Math.min(region.x, videoWidth - 1));
  const y = Math.max(0, Math.min(region.y, videoHeight - 1));

  // Calculate max possible width/height from clamped position
  const maxWidth = videoWidth - x;
  const maxHeight = videoHeight - y;

  // Clamp width and height to not exceed bounds
  // Also ensure minimum size of 1 to avoid zero-dimension canvas
  const width = Math.max(1, Math.min(region.width, maxWidth));
  const height = Math.max(1, Math.min(region.height, maxHeight));

  return { x, y, width, height };
}

/**
 * Check if a calibration needs recalibration.
 * Returns true if calibration is likely to cause issues.
 */
export function needsRecalibration(
  calibration: CalibrationData,
  videoWidth: number,
  videoHeight: number
): { needsRecal: boolean; reason: string | null } {
  // Missing calibration dimensions is a warning sign
  if (calibration.calibrationWidth === undefined || calibration.calibrationHeight === undefined) {
    return {
      needsRecal: true,
      reason: 'Calibration dimensions missing - recalibrate for accurate tracking',
    };
  }

  // Check for significant scale mismatch (>50% difference)
  const scaleX = videoWidth / calibration.calibrationWidth;
  const scaleY = videoHeight / calibration.calibrationHeight;

  if (scaleX < 0.5 || scaleX > 2.0 || scaleY < 0.5 || scaleY > 2.0) {
    return {
      needsRecal: true,
      reason: `Resolution mismatch - calibrated at ${calibration.calibrationWidth}x${calibration.calibrationHeight}, now ${videoWidth}x${videoHeight}`,
    };
  }

  // Check if region would be mostly out of bounds
  const result = calculateCropRegion(calibration, videoWidth, videoHeight);
  const { scaledRegion, clampedRegion } = result;

  const originalArea = scaledRegion.width * scaledRegion.height;
  const clampedArea = clampedRegion.width * clampedRegion.height;

  // If clamped area is less than 50% of original, suggest recalibration
  if (clampedArea < originalArea * 0.5) {
    return {
      needsRecal: true,
      reason: 'Region significantly out of bounds - recalibrate for this display',
    };
  }

  return { needsRecal: false, reason: null };
}
