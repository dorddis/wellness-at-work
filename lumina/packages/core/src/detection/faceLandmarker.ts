/**
 * MediaPipe FaceLandmarker wrapper for Electron/browser environment
 * Uses @mediapipe/tasks-vision for face landmark detection
 *
 * Enhanced with automatic EAR calibration for per-user threshold optimization.
 */

import {
  FaceLandmarker,
  FilesetResolver,
  FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';
import { MIN_DETECTION_CONFIDENCE, MIN_TRACKING_CONFIDENCE, EAR_CALIBRATION } from './constants';
import { BlinkDetector, BlinkDetectionResult, Point2D } from './blink';
import { EARCalibrator, CalibrationState, EARCalibration } from './ear-calibrator';

export interface LandmarkerConfig {
  numFaces?: number;
  runningMode?: 'IMAGE' | 'VIDEO';
  delegate?: 'GPU' | 'CPU';
  /** Disable automatic EAR calibration (use fixed threshold) */
  disableCalibration?: boolean;
  /** Existing calibration to load (from storage) */
  existingCalibration?: EARCalibration;
}

export interface CalibrationInfo {
  state: CalibrationState;
  progress: number;
  threshold: number;
  isCalibrated: boolean;
}

export interface FrameResult {
  blink: BlinkDetectionResult;
  rawLandmarks: Point2D[] | null;
  timestamp: number;
  /** Calibration status and progress */
  calibration: CalibrationInfo;
}

/**
 * MediaPipe FaceLandmarker manager
 * Handles initialization, processing, cleanup, and EAR calibration
 */
export class FaceLandmarkerManager {
  private faceLandmarker: FaceLandmarker | null = null;
  private blinkDetector: BlinkDetector;
  private earCalibrator: EARCalibrator | null = null;
  private isInitialized = false;
  private lastVideoTime = -1;
  private useCalibration: boolean;

  constructor() {
    // Use enhanced detection with Kalman filter, spike detection, and eye quality tracking
    this.blinkDetector = BlinkDetector.createEnhanced();
    this.useCalibration = true;
  }

  /**
   * Initialize the FaceLandmarker model
   * Must be called before processing frames
   */
  async initialize(config: LandmarkerConfig = {}): Promise<void> {
    if (this.isInitialized) {
      console.warn('FaceLandmarker already initialized');
      return;
    }

    const {
      numFaces = 1,
      runningMode = 'VIDEO',
      delegate = 'GPU',
      disableCalibration = false,
      existingCalibration,
    } = config;

    this.useCalibration = !disableCalibration;

    // Initialize EAR calibrator if enabled
    if (this.useCalibration) {
      this.earCalibrator = new EARCalibrator({
        calibrationDurationMs: EAR_CALIBRATION.CALIBRATION_DURATION_MS,
        minSamples: EAR_CALIBRATION.MIN_SAMPLES,
        openEyePercentile: EAR_CALIBRATION.OPEN_EYE_PERCENTILE,
        closedEyePercentile: EAR_CALIBRATION.CLOSED_EYE_PERCENTILE,
        fallbackThreshold: EAR_CALIBRATION.FALLBACK_THRESHOLD,
      });

      // Load existing calibration if provided
      if (existingCalibration) {
        this.earCalibrator.loadCalibration(existingCalibration);
        this.blinkDetector.setThreshold(existingCalibration.threshold);
      }
    }

    // Load WASM files from CDN
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
    );

    // Create FaceLandmarker instance
    this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate,
      },
      runningMode,
      numFaces,
      minFaceDetectionConfidence: MIN_DETECTION_CONFIDENCE,
      minTrackingConfidence: MIN_TRACKING_CONFIDENCE,
      outputFaceBlendshapes: false, // Not needed for blink detection
      outputFacialTransformationMatrixes: false,
    });

    this.isInitialized = true;
  }

  /**
   * Get current calibration info
   */
  private getCalibrationInfo(): CalibrationInfo {
    if (!this.earCalibrator) {
      return {
        state: 'calibrated',
        progress: 1,
        threshold: this.blinkDetector.getThreshold(),
        isCalibrated: true,
      };
    }

    return {
      state: this.earCalibrator.getState(),
      progress: this.earCalibrator.getProgress(),
      threshold: this.earCalibrator.getThreshold(),
      isCalibrated: this.earCalibrator.isCalibrated(),
    };
  }

  /**
   * Process a video frame and return blink detection results
   *
   * @param videoElement HTMLVideoElement with webcam feed
   * @returns Frame processing result with blink detection
   */
  processVideoFrame(videoElement: HTMLVideoElement): FrameResult | null {
    if (!this.faceLandmarker || !this.isInitialized) {
      console.error('FaceLandmarker not initialized. Call initialize() first.');
      return null;
    }

    const timestamp = performance.now();

    // Skip if same frame (video not progressed)
    if (videoElement.currentTime === this.lastVideoTime) {
      return null;
    }
    this.lastVideoTime = videoElement.currentTime;

    // Run face landmark detection
    const result: FaceLandmarkerResult = this.faceLandmarker.detectForVideo(
      videoElement,
      timestamp
    );

    // No face detected
    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
      return {
        blink: {
          isBlink: false,
          leftEAR: 0,
          rightEAR: 0,
          avgEAR: 0,
          smoothedEAR: 0,
          confidence: 0,
          threshold: this.blinkDetector.getThreshold(),
        },
        rawLandmarks: null,
        timestamp,
        calibration: this.getCalibrationInfo(),
      };
    }

    // Convert landmarks to Point2D format
    const landmarks: Point2D[] = result.faceLandmarks[0].map((lm) => ({
      x: lm.x,
      y: lm.y,
    }));

    // Get detection confidence (use average of all landmarks' visibility if available)
    // MediaPipe landmarks have z value which can indicate depth/confidence
    const confidence = result.faceLandmarks[0].reduce(
      (acc, lm) => acc + (lm.visibility ?? 1),
      0
    ) / result.faceLandmarks[0].length;

    // Run blink detection
    const blinkResult = this.blinkDetector.detect(landmarks, confidence);

    // Feed EAR to calibrator if enabled and not yet calibrated
    if (this.earCalibrator && !this.earCalibrator.isCalibrated()) {
      const newThreshold = this.earCalibrator.addSample(blinkResult.smoothedEAR);

      // Update detector threshold if calibration just completed
      if (this.earCalibrator.isCalibrated()) {
        this.blinkDetector.setThreshold(newThreshold);
      }
    }

    return {
      blink: blinkResult,
      rawLandmarks: landmarks,
      timestamp,
      calibration: this.getCalibrationInfo(),
    };
  }

  /**
   * Get current blink count
   */
  getBlinkCount(): number {
    return this.blinkDetector.getBlinkCount();
  }

  /**
   * Get current EAR threshold
   */
  getThreshold(): number {
    return this.blinkDetector.getThreshold();
  }

  /**
   * Get EAR calibrator (for persistence)
   */
  getCalibrator(): EARCalibrator | null {
    return this.earCalibrator;
  }

  /**
   * Export calibration for persistence
   */
  exportCalibration(): EARCalibration | null {
    return this.earCalibrator?.exportCalibration() ?? null;
  }

  /**
   * Force recalibration (e.g., if lighting changed significantly)
   */
  recalibrate(): void {
    if (this.earCalibrator) {
      this.earCalibrator.recalibrate();
    }
  }

  /**
   * Reset blink counter
   */
  resetBlinkCount(): void {
    this.blinkDetector.reset();
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if calibrated
   */
  isCalibrated(): boolean {
    return this.earCalibrator?.isCalibrated() ?? true;
  }

  /**
   * Cleanup resources
   * IMPORTANT: Must be called when done to prevent memory leaks
   */
  async close(): Promise<void> {
    if (this.faceLandmarker) {
      this.faceLandmarker.close();
      this.faceLandmarker = null;
    }
    this.isInitialized = false;
    this.lastVideoTime = -1;
    this.blinkDetector.reset();
    this.earCalibrator?.reset();
  }
}

// Export singleton instance for convenience
export const faceLandmarkerManager = new FaceLandmarkerManager();
