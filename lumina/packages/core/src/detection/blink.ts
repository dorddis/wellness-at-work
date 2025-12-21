/**
 * Blink detection using Eye Aspect Ratio (EAR) algorithm
 *
 * EAR = (|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|)
 *
 * Where p1-p6 are the 6 eye landmarks:
 * p1: outer corner, p2: upper outer, p3: upper inner
 * p4: inner corner, p5: lower inner, p6: lower outer
 *
 * Enhanced with:
 * - Kalman filtering for noise reduction
 * - Spike detection for reflection artifacts
 * - Per-eye quality tracking
 * - Dynamic threshold from calibration
 */

import {
  LEFT_EYE_INDICES,
  RIGHT_EYE_INDICES,
  EAR_THRESHOLD,
  CONSEC_FRAMES,
  KALMAN_CONFIG,
  SPIKE_DETECTION,
  EYE_QUALITY,
} from './constants';
import { KalmanFilter1D, KalmanConfig } from './kalman';
import { SpikeDetector, SpikeDetectorConfig } from './spike-detector';
import { EyeQualityTracker, EyeQualityConfig, PreferredEye } from './eye-quality';

export interface Point2D {
  x: number;
  y: number;
}

export interface EyeQualityInfo {
  preferredEye: PreferredEye;
  leftVariance: number;
  rightVariance: number;
  leftStable: boolean;
  rightStable: boolean;
}

export interface BlinkDetectionResult {
  isBlink: boolean;
  leftEAR: number;
  rightEAR: number;
  avgEAR: number;
  /** Kalman-filtered EAR (smoothed) */
  smoothedEAR: number;
  confidence: number;
  /** Eye quality information (if tracking enabled) */
  qualityInfo?: EyeQualityInfo;
  /** Whether this frame was detected as a spike */
  spikeDetected?: boolean;
  /** Current threshold being used */
  threshold: number;
}

export interface BlinkDetectorConfig {
  /** Custom EAR threshold (overrides default 0.21) */
  threshold?: number;
  /** Enable Kalman filter for EAR smoothing. Default: true */
  useKalmanFilter?: boolean;
  /** Enable spike detection. Default: true */
  useSpikeDetection?: boolean;
  /** Enable per-eye quality tracking. Default: true */
  useEyeQualityTracking?: boolean;
  /** Kalman filter configuration */
  kalmanConfig?: KalmanConfig;
  /** Spike detector configuration */
  spikeConfig?: SpikeDetectorConfig;
  /** Eye quality tracker configuration */
  eyeQualityConfig?: EyeQualityConfig;
}

// Default: enhancements disabled for backward compatibility
// Enable via config or use BlinkDetector.createEnhanced() for full features
const DEFAULT_CONFIG: Required<Omit<BlinkDetectorConfig, 'threshold' | 'kalmanConfig' | 'spikeConfig' | 'eyeQualityConfig'>> = {
  useKalmanFilter: false,
  useSpikeDetection: false,
  useEyeQualityTracking: false,
};

/**
 * Calculate Euclidean distance between two 2D points
 */
export function euclideanDistance(p1: Point2D, p2: Point2D): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculate Eye Aspect Ratio for a set of 6 eye landmarks
 *
 * @param landmarks Array of 6 points: [outer, upperOuter, upperInner, inner, lowerInner, lowerOuter]
 * @returns EAR value (lower = more closed)
 */
export function calculateEAR(landmarks: Point2D[]): number {
  if (landmarks.length !== 6) {
    throw new Error('EAR calculation requires exactly 6 landmarks');
  }

  // Vertical distances
  const A = euclideanDistance(landmarks[1], landmarks[5]); // upper outer to lower outer
  const B = euclideanDistance(landmarks[2], landmarks[4]); // upper inner to lower inner

  // Horizontal distance
  const C = euclideanDistance(landmarks[0], landmarks[3]); // outer corner to inner corner

  // Avoid division by zero
  if (C === 0) return 0;

  return (A + B) / (2.0 * C);
}

/**
 * Extract eye landmarks from MediaPipe face landmarks
 */
export function extractEyeLandmarks(
  faceLandmarks: Point2D[],
  eyeIndices: readonly number[]
): Point2D[] {
  return eyeIndices.map(index => faceLandmarks[index]);
}

/**
 * Blink detector class with frame-by-frame state tracking
 *
 * Enhanced with Kalman filtering, spike detection, and per-eye quality tracking
 * for improved accuracy with glasses and variable lighting.
 */
export class BlinkDetector {
  /**
   * Create an enhanced detector with all features enabled
   * (Kalman filtering, spike detection, eye quality tracking)
   */
  static createEnhanced(config?: Omit<BlinkDetectorConfig, 'useKalmanFilter' | 'useSpikeDetection' | 'useEyeQualityTracking'>): BlinkDetector {
    return new BlinkDetector({
      ...config,
      useKalmanFilter: true,
      useSpikeDetection: true,
      useEyeQualityTracking: true,
    });
  }

  // Core state
  private frameCounter = 0;
  private blinkCount = 0;
  private lastEAR = 1.0;
  private isEyeClosed = false;

  // Configuration
  private threshold: number;
  private readonly useKalmanFilter: boolean;
  private readonly useSpikeDetection: boolean;
  private readonly useEyeQualityTracking: boolean;

  // Enhancement components
  private kalmanFilter: KalmanFilter1D | null = null;
  private spikeDetector: SpikeDetector | null = null;
  private eyeQualityTracker: EyeQualityTracker | null = null;

  constructor(config?: BlinkDetectorConfig) {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    this.threshold = config?.threshold ?? EAR_THRESHOLD;
    this.useKalmanFilter = cfg.useKalmanFilter;
    this.useSpikeDetection = cfg.useSpikeDetection;
    this.useEyeQualityTracking = cfg.useEyeQualityTracking;

    // Initialize enhancement components
    if (this.useKalmanFilter) {
      this.kalmanFilter = new KalmanFilter1D({
        processNoise: KALMAN_CONFIG.PROCESS_NOISE,
        measurementNoise: KALMAN_CONFIG.MEASUREMENT_NOISE,
        initialEstimate: KALMAN_CONFIG.INITIAL_ESTIMATE,
        initialError: KALMAN_CONFIG.INITIAL_ERROR,
        ...config?.kalmanConfig,
      });
    }

    if (this.useSpikeDetection) {
      this.spikeDetector = new SpikeDetector({
        maxDelta: SPIKE_DETECTION.MAX_EAR_DELTA,
        recoveryFrames: SPIKE_DETECTION.RECOVERY_FRAMES,
        ...config?.spikeConfig,
      });
    }

    if (this.useEyeQualityTracking) {
      this.eyeQualityTracker = new EyeQualityTracker({
        windowSize: EYE_QUALITY.VARIANCE_WINDOW,
        qualityThreshold: EYE_QUALITY.QUALITY_THRESHOLD,
        ...config?.eyeQualityConfig,
      });
    }
  }

  /**
   * Update threshold dynamically (from calibrator)
   */
  setThreshold(threshold: number): void {
    if (Number.isFinite(threshold) && threshold > 0 && threshold < 1) {
      this.threshold = threshold;
    }
  }

  /**
   * Get current threshold
   */
  getThreshold(): number {
    return this.threshold;
  }

  /**
   * Process a single frame and detect blinks
   *
   * @param faceLandmarks Array of 478 MediaPipe face landmarks
   * @param confidence Detection confidence (0-1)
   * @returns Blink detection result
   */
  detect(faceLandmarks: Point2D[], confidence: number): BlinkDetectionResult {
    // Extract eye landmarks
    const leftEyeLandmarks = extractEyeLandmarks(faceLandmarks, LEFT_EYE_INDICES);
    const rightEyeLandmarks = extractEyeLandmarks(faceLandmarks, RIGHT_EYE_INDICES);

    // Calculate EAR for each eye
    const leftEAR = calculateEAR(leftEyeLandmarks);
    const rightEAR = calculateEAR(rightEyeLandmarks);

    // Track eye quality if enabled
    let qualityInfo: EyeQualityInfo | undefined;
    if (this.eyeQualityTracker) {
      this.eyeQualityTracker.addFrame(leftEAR, rightEAR);
      const quality = this.eyeQualityTracker.getQuality();
      qualityInfo = {
        preferredEye: quality.preferredEye,
        leftVariance: quality.leftVariance,
        rightVariance: quality.rightVariance,
        leftStable: quality.leftStable,
        rightStable: quality.rightStable,
      };
    }

    // Select best EAR based on eye quality
    let avgEAR: number;
    if (this.eyeQualityTracker) {
      avgEAR = this.eyeQualityTracker.getBestEAR(leftEAR, rightEAR);
    } else {
      // Fallback to simple average
      avgEAR = (leftEAR + rightEAR) / 2.0;
    }

    // Apply spike detection if enabled
    let spikeDetected = false;
    if (this.spikeDetector) {
      const spikeResult = this.spikeDetector.process(avgEAR);
      spikeDetected = spikeResult.isSpike;
      if (spikeDetected) {
        // Use last valid EAR instead of spiked value
        avgEAR = spikeResult.ear;
      }
    }

    // Apply Kalman filter if enabled
    let smoothedEAR = avgEAR;
    if (this.kalmanFilter) {
      smoothedEAR = this.kalmanFilter.update(avgEAR);
    }

    // Use smoothed EAR for blink detection (if Kalman enabled)
    const earForDetection = this.kalmanFilter ? smoothedEAR : avgEAR;

    // Blink detection logic using current threshold
    let isBlink = false;

    if (earForDetection < this.threshold) {
      this.frameCounter++;
      this.isEyeClosed = true;
    } else {
      // Eyes opened after being closed
      if (this.frameCounter >= CONSEC_FRAMES && this.isEyeClosed) {
        this.blinkCount++;
        isBlink = true;
      }
      this.frameCounter = 0;
      this.isEyeClosed = false;
    }

    this.lastEAR = smoothedEAR;

    return {
      isBlink,
      leftEAR,
      rightEAR,
      avgEAR,
      smoothedEAR,
      confidence,
      qualityInfo,
      spikeDetected,
      threshold: this.threshold,
    };
  }

  /**
   * Get total blink count since detector was created/reset
   */
  getBlinkCount(): number {
    return this.blinkCount;
  }

  /**
   * Get current EAR value (smoothed if Kalman enabled)
   */
  getCurrentEAR(): number {
    return this.lastEAR;
  }

  /**
   * Check if eyes are currently closed
   */
  isCurrentlyEyeClosed(): boolean {
    return this.isEyeClosed;
  }

  /**
   * Get eye quality tracker (for advanced diagnostics)
   */
  getEyeQualityTracker(): EyeQualityTracker | null {
    return this.eyeQualityTracker;
  }

  /**
   * Reset blink counter and all component state
   */
  reset(): void {
    this.frameCounter = 0;
    this.blinkCount = 0;
    this.lastEAR = 1.0;
    this.isEyeClosed = false;

    // Reset enhancement components
    this.kalmanFilter?.reset();
    this.spikeDetector?.reset();
    this.eyeQualityTracker?.reset();
  }
}
