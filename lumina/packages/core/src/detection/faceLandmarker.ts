/**
 * MediaPipe FaceLandmarker wrapper for Electron/browser environment
 * Uses @mediapipe/tasks-vision for face landmark detection
 */

import {
  FaceLandmarker,
  FilesetResolver,
  FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';
import { MIN_DETECTION_CONFIDENCE, MIN_TRACKING_CONFIDENCE } from './constants';
import { BlinkDetector, BlinkDetectionResult, Point2D } from './blink';

export interface LandmarkerConfig {
  numFaces?: number;
  runningMode?: 'IMAGE' | 'VIDEO';
  delegate?: 'GPU' | 'CPU';
}

export interface FrameResult {
  blink: BlinkDetectionResult;
  rawLandmarks: Point2D[] | null;
  timestamp: number;
}

/**
 * MediaPipe FaceLandmarker manager
 * Handles initialization, processing, and cleanup
 */
export class FaceLandmarkerManager {
  private faceLandmarker: FaceLandmarker | null = null;
  private blinkDetector: BlinkDetector;
  private isInitialized = false;
  private lastVideoTime = -1;

  constructor() {
    this.blinkDetector = new BlinkDetector();
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
    } = config;

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
          confidence: 0,
        },
        rawLandmarks: null,
        timestamp,
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

    return {
      blink: blinkResult,
      rawLandmarks: landmarks,
      timestamp,
    };
  }

  /**
   * Get current blink count
   */
  getBlinkCount(): number {
    return this.blinkDetector.getBlinkCount();
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
  }
}

// Export singleton instance for convenience
export const faceLandmarkerManager = new FaceLandmarkerManager();
