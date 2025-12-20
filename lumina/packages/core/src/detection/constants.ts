/**
 * MediaPipe Face Mesh landmark indices for eye detection
 * Reference: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker
 */

// Left eye landmarks (6 points for EAR calculation)
// [outer corner, upper outer, upper inner, inner corner, lower inner, lower outer]
export const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144] as const;

// Right eye landmarks (6 points for EAR calculation)
// [inner corner, upper inner, upper outer, outer corner, lower outer, lower inner]
export const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380] as const;

// Eye Aspect Ratio threshold - below this indicates closed eyes
export const EAR_THRESHOLD = 0.21;

// Consecutive frames required to confirm a blink
export const CONSEC_FRAMES = 2;

// MediaPipe confidence threshold for reliable detection
export const MIN_DETECTION_CONFIDENCE = 0.5;
export const MIN_TRACKING_CONFIDENCE = 0.5;

// Glasses detection: if confidence below this, use single-eye fallback
export const GLASSES_CONFIDENCE_THRESHOLD = 0.7;

// Blink rate thresholds (blinks per minute)
export const BLINK_RATE = {
  CRITICAL_LOW: 5,   // Very dry eyes, urgent
  LOW: 10,           // Below healthy range
  HEALTHY_MIN: 12,   // Healthy range starts
  HEALTHY_MAX: 20,   // Healthy range ends
  HIGH: 25,          // Possibly irritated
} as const;

// Alert cooldowns (milliseconds)
export const ALERT_COOLDOWN = {
  LOW_BLINK: 10 * 60 * 1000,      // 10 minutes
  CRITICAL_BLINK: 15 * 60 * 1000, // 15 minutes
  LONG_SESSION: 30 * 60 * 1000,   // 30 minutes
} as const;

// Session settings
export const SESSION = {
  AGGREGATION_INTERVAL: 60 * 1000,  // Aggregate every 60 seconds
  SYNC_INTERVAL: 5 * 60 * 1000,     // Sync every 5 minutes
  BASELINE_DURATION: 2 * 60 * 60 * 1000, // 2 hours for baseline calibration
  LONG_SESSION_THRESHOLD: 90 * 60 * 1000, // 90 minutes
} as const;
