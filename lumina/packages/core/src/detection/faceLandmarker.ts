/**
 * MediaPipe FaceLandmarker wrapper for Electron/browser environment
 * Uses @mediapipe/tasks-vision for face landmark detection
 *
 * Enhanced with:
 * - Robust slope-based blink detection (more accurate for mini blinks)
 * - Automatic EAR calibration for per-user threshold optimization
 * - Posture detection (distance, tilt, lean)
 * - Yawn detection (MAR-based)
 * - Drowsiness detection (PERCLOS + yawn frequency)
 */

import {
  FaceLandmarker,
  FilesetResolver,
  FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';
import { MIN_DETECTION_CONFIDENCE, MIN_TRACKING_CONFIDENCE, EAR_CALIBRATION } from './constants';
import { BlinkDetectionResult, Point2D } from './blink';
import { RobustBlinkDetector, RobustBlinkResult } from './robust-blink-detector';
import { BlinkPhase } from './blink-state-machine';
import { EARCalibrator, CalibrationState, EARCalibration } from './ear-calibrator';
import { PostureAnalyzer, PostureResult } from './posture';
import { YawnDetector, YawnResult } from './yawn';
import { DrowsinessDetector, DrowsinessResult } from './drowsiness';

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
  /** Blink detection result */
  blink: BlinkDetectionResult;
  /** Posture analysis result */
  posture: PostureResult | null;
  /** Yawn detection result */
  yawn: YawnResult | null;
  /** Drowsiness detection result */
  drowsiness: DrowsinessResult | null;
  /** Raw face landmarks (478 points) */
  rawLandmarks: Point2D[] | null;
  /** Frame timestamp (performance.now) */
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
  private robustBlinkDetector: RobustBlinkDetector;
  private earCalibrator: EARCalibrator | null = null;
  private postureAnalyzer: PostureAnalyzer;
  private yawnDetector: YawnDetector;
  private drowsinessDetector: DrowsinessDetector;
  private isInitialized = false;
  private lastVideoTime = -1;
  private useCalibration: boolean;
  private frameWidth: number = 640;

  constructor() {
    // Use robust slope-based detection for better mini blink accuracy
    this.robustBlinkDetector = new RobustBlinkDetector();
    this.postureAnalyzer = new PostureAnalyzer();
    this.yawnDetector = new YawnDetector();
    this.drowsinessDetector = new DrowsinessDetector();
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
        // Note: RobustBlinkDetector uses bilateral baseline instead of manual threshold
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
        threshold: this.robustBlinkDetector.getThreshold(),
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
   * Process a video/canvas frame and return detection results
   *
   * @param frameSource HTMLVideoElement (webcam) or HTMLCanvasElement (screen capture crop)
   * @param frameWidth Optional frame width for posture calculation
   * @returns Frame processing result with all detections
   */
  processVideoFrame(
    frameSource: HTMLVideoElement | HTMLCanvasElement,
    frameWidth?: number
  ): FrameResult | null {
    if (!this.faceLandmarker || !this.isInitialized) {
      console.error('FaceLandmarker not initialized. Call initialize() first.');
      return null;
    }

    const timestamp = performance.now();

    // Update frame width if provided
    if (frameWidth) {
      this.frameWidth = frameWidth;
    }

    // Skip if same frame (video not progressed) - only for video elements
    // Canvas elements don't have currentTime, so we always process them
    if (frameSource instanceof HTMLVideoElement) {
      if (frameSource.currentTime === this.lastVideoTime) {
        return null;
      }
      this.lastVideoTime = frameSource.currentTime;
    }

    // Run face landmark detection
    // MediaPipe's detectForVideo accepts HTMLVideoElement, HTMLCanvasElement, and ImageData
    const result: FaceLandmarkerResult = this.faceLandmarker.detectForVideo(
      frameSource,
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
          threshold: this.robustBlinkDetector.getThreshold(),
        },
        posture: null,
        yawn: null,
        drowsiness: null,
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

    // Run robust slope-based blink detection
    const robustResult = this.robustBlinkDetector.detect(landmarks, confidence, timestamp);

    // Debug logging removed - was causing "process is not defined" error in browser
    // To debug blink detection, temporarily add console.logs here

    // Convert to BlinkDetectionResult format for compatibility
    const blinkResult: BlinkDetectionResult = {
      isBlink: robustResult.isBlink,
      leftEAR: robustResult.leftEar,
      rightEAR: robustResult.rightEar,
      avgEAR: robustResult.avgEar,
      smoothedEAR: robustResult.smoothedEar,
      confidence: robustResult.confidence,
      threshold: robustResult.threshold,
    };

    // Feed EAR to calibrator if enabled and not yet calibrated
    if (this.earCalibrator && !this.earCalibrator.isCalibrated()) {
      this.earCalibrator.addSample(blinkResult.smoothedEAR);
    }

    // Run posture detection
    const postureResult = this.postureAnalyzer.update(landmarks, this.frameWidth);

    // Run yawn detection
    const yawnResult = this.yawnDetector.update(landmarks, timestamp);

    // Feed data to drowsiness detector
    this.drowsinessDetector.addFrame(
      blinkResult.avgEAR,
      yawnResult.isYawning,
      timestamp
    );
    const drowsinessResult = this.drowsinessDetector.getDrowsiness(timestamp);

    return {
      blink: blinkResult,
      posture: postureResult,
      yawn: yawnResult,
      drowsiness: drowsinessResult,
      rawLandmarks: landmarks,
      timestamp,
      calibration: this.getCalibrationInfo(),
    };
  }

  /**
   * Get current blink count
   */
  getBlinkCount(): number {
    return this.robustBlinkDetector.getBlinkCount();
  }

  /**
   * Get current EAR threshold
   */
  getThreshold(): number {
    return this.robustBlinkDetector.getThreshold();
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
    this.robustBlinkDetector.resetCount();
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
   * Get yawn count
   */
  getYawnCount(): number {
    return this.yawnDetector.yawnCount;
  }

  /**
   * Get posture analyzer (for calibration status)
   */
  getPostureAnalyzer(): PostureAnalyzer {
    return this.postureAnalyzer;
  }

  /**
   * Check if posture is calibrated
   */
  isPostureCalibrated(): boolean {
    return this.postureAnalyzer.isCalibrated();
  }

  /**
   * Reset all detectors
   */
  resetAll(): void {
    this.robustBlinkDetector.reset();
    this.postureAnalyzer.reset();
    this.yawnDetector.reset();
    this.drowsinessDetector.reset();
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
    this.robustBlinkDetector.reset();
    this.earCalibrator?.reset();
    this.postureAnalyzer.reset();
    this.yawnDetector.reset();
    this.drowsinessDetector.reset();
  }

  /**
   * Get the robust blink detector for advanced diagnostics
   */
  getRobustBlinkDetector(): RobustBlinkDetector {
    return this.robustBlinkDetector;
  }
}

// Export singleton instance for convenience
export const faceLandmarkerManager = new FaceLandmarkerManager();
