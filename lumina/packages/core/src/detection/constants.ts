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
// Set to 1 for fast blink detection (research shows 2-4 is typical)
export const CONSEC_FRAMES = 1;

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

// ============================================================================
// Robust Blink Detection Configuration
// Based on 2024-2025 research for improved accuracy with glasses/reflections
// ============================================================================

/**
 * EAR Calibration settings (Modified EAR algorithm)
 * @see https://peerj.com/articles/cs-943/
 */
export const EAR_CALIBRATION = {
  /** Duration of calibration period in milliseconds */
  CALIBRATION_DURATION_MS: 60_000,
  /** Minimum samples required for valid calibration */
  MIN_SAMPLES: 100,
  /** Percentile for typical open eye EAR */
  OPEN_EYE_PERCENTILE: 75,
  /** Percentile for typical closed eye EAR */
  CLOSED_EYE_PERCENTILE: 10,
  /** Fallback threshold if calibration fails */
  FALLBACK_THRESHOLD: 0.21,
} as const;

/**
 * Kalman filter configuration for EAR smoothing
 * @see https://www.researchgate.net/publication/378539734
 *
 * NOTE: Lower measurement noise = faster response to real changes
 * We use light smoothing to preserve fast blink detection
 */
export const KALMAN_CONFIG = {
  /** Process noise (Q) - expected EAR change between frames */
  PROCESS_NOISE: 0.05,
  /** Measurement noise (R) - lower = faster response, less smoothing */
  MEASUREMENT_NOISE: 0.02,
  /** Initial EAR estimate (typical open eye) */
  INITIAL_ESTIMATE: 0.3,
  /** Initial estimation error */
  INITIAL_ERROR: 1.0,
} as const;

/**
 * Spike detection for reflection artifacts
 *
 * NOTE: Real blinks cause EAR to drop from ~0.3 to ~0.1 (delta = 0.2)
 * We only filter EXTREME spikes (> 0.3) that are clearly artifacts
 */
export const SPIKE_DETECTION = {
  /** Maximum allowed EAR change per frame before considered a spike */
  MAX_EAR_DELTA: 0.30,
  /** Frames to wait after spike before trusting new values */
  RECOVERY_FRAMES: 1,
} as const;

/**
 * Per-eye quality tracking configuration
 */
export const EYE_QUALITY = {
  /** Number of frames for variance calculation window */
  VARIANCE_WINDOW: 10,
  /** Variance threshold below which eye is considered stable */
  QUALITY_THRESHOLD: 0.02,
} as const;

// ============================================================================
// Posture Detection Configuration
// Detects distance from screen, head tilt, and forward lean
// ============================================================================

/** Landmark indices for posture detection */
export const LEFT_EYE_OUTER_INDEX = 33;
export const RIGHT_EYE_OUTER_INDEX = 263;
export const NOSE_TIP_INDEX = 1;

/**
 * Posture detection thresholds
 */
export const POSTURE = {
  /** Ratio above which user is too close (face appears larger than baseline) */
  DISTANCE_TOO_CLOSE_RATIO: 1.4,
  /** Ratio below which user is too far (face appears smaller than baseline) */
  DISTANCE_TOO_FAR_RATIO: 0.6,
  /** Degrees of head tilt before considered an issue */
  TILT_THRESHOLD_DEGREES: 10,
  /** Nose-to-eye ratio deviation indicating forward lean */
  LEAN_THRESHOLD: 0.15,
  /** Frames needed for calibration baseline */
  BASELINE_FRAMES: 60,
  /** Absolute pixel thresholds (fallback before calibration) */
  DISTANCE_TOO_CLOSE_PIXELS: 200,
  DISTANCE_TOO_FAR_PIXELS: 80,
  DISTANCE_OPTIMAL_PIXELS: 140,
} as const;

// ============================================================================
// Yawn Detection Configuration
// Uses Mouth Aspect Ratio (MAR) similar to EAR for eyes
// ============================================================================

/** Landmark indices for mouth/yawn detection */
export const MOUTH_INDICES = {
  UPPER_LIP: 13,
  LOWER_LIP: 14,
  LEFT_CORNER: 61,
  RIGHT_CORNER: 291,
} as const;

/**
 * Yawn detection thresholds
 */
export const YAWN = {
  /** MAR threshold above which mouth is considered open */
  MAR_THRESHOLD: 0.5,
  /** Duration mouth must be open to count as yawn (ms) */
  DURATION_MS: 1500,
  /** Cooldown between yawn detections (ms) */
  COOLDOWN_MS: 3000,
} as const;

// ============================================================================
// Drowsiness Detection Configuration
// Combines PERCLOS (% eye closure) with yawn frequency
// ============================================================================

/**
 * Drowsiness detection thresholds
 */
export const DROWSINESS = {
  /** Time window for PERCLOS calculation (ms) */
  PERCLOS_WINDOW_MS: 60_000,
  /** EAR below this is considered "eyes closed" for PERCLOS */
  CLOSED_THRESHOLD: 0.2,
  /** Time window for counting yawns (ms) - 5 minutes */
  YAWN_WINDOW_MS: 300_000,
  /** PERCLOS percentage thresholds for drowsiness levels */
  LEVELS: {
    /** Below this = alert (healthy) */
    ALERT: 15,
    /** Above ALERT, below MILD = mild drowsiness */
    MILD: 20,
    /** Above MILD, below MODERATE = moderate drowsiness */
    MODERATE: 30,
    // Above MODERATE = severe drowsiness
  },
  /** Yawn count thresholds for drowsiness levels */
  YAWN_COUNTS: {
    /** 1+ yawns in window = mild */
    MILD: 1,
    /** 2+ yawns in window = moderate */
    MODERATE: 2,
    /** 3+ yawns in window = severe */
    SEVERE: 3,
  },
} as const;

// ============================================================================
// Alert Cooldowns for New Detection Types
// ============================================================================

export const WELLNESS_ALERT_COOLDOWN = {
  /** Cooldown for "too close" alerts */
  TOO_CLOSE: 10 * 60 * 1000,      // 10 minutes
  /** Cooldown for "too far" alerts */
  TOO_FAR: 10 * 60 * 1000,        // 10 minutes
  /** Cooldown for "head tilt" alerts */
  HEAD_TILT: 15 * 60 * 1000,      // 15 minutes
  /** Cooldown for mild drowsiness alerts */
  DROWSY_MILD: 20 * 60 * 1000,    // 20 minutes
  /** Cooldown for severe drowsiness alerts */
  DROWSY_SEVERE: 30 * 60 * 1000,  // 30 minutes
} as const;
