"""
Tunable parameters for robust slope-based blink detection.

All parameters are organized by component for easy tuning.
"""

# =============================================================================
# MediaPipe Face Landmarks
# =============================================================================

# Eye landmark indices (same as original blink_detector.py)
LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]

# Head tracking landmarks
NOSE_TIP_INDEX = 1
LEFT_FACE_CORNER_INDEX = 234   # Left cheek
RIGHT_FACE_CORNER_INDEX = 454  # Right cheek


# =============================================================================
# Slope Detection Parameters
# =============================================================================

# Slope thresholds (EAR change per millisecond)
# Negative slope = eyes closing, Positive slope = eyes opening
CLOSING_SLOPE_THRESHOLD = -0.0003  # Minimum negative slope to detect closing (was -0.0005, more sensitive)
OPENING_SLOPE_THRESHOLD = 0.0003   # Minimum positive slope to detect opening (was 0.0005, more sensitive)
SLOPE_NEAR_ZERO = 0.0002           # Slope magnitude considered "near zero" (was 0.0003, tighter)

# Derivative calculation
SLOPE_WINDOW_FRAMES = 3  # Number of frames for slope calculation (smooths noise)


# =============================================================================
# Timing Parameters
# =============================================================================

# Blink duration constraints (milliseconds)
MIN_BLINK_DURATION_MS = 75    # Fastest physiological blink
MAX_BLINK_DURATION_MS = 800   # Allow slower intentional blinks (was 400, increased for slow blinks)

# Cooldown after valid blink detection (prevents double-counting)
COOLDOWN_MS = 150

# State machine timeout (if stuck in CLOSING too long, abort)
CLOSING_TIMEOUT_MS = 500


# =============================================================================
# Head Motion Gating
# =============================================================================

# Head velocity threshold (face-widths per frame)
# If velocity exceeds this, suppress blink detection
HEAD_MOTION_THRESHOLD = 0.02  # 2% of face width per frame

# Smoothing for head position (reduces jitter)
HEAD_POSITION_SMOOTHING = 0.3  # EMA alpha (0 = no smoothing, 1 = no memory)


# =============================================================================
# Bilateral Verification
# =============================================================================

# Minimum ratio of left/right eye dip magnitudes
# 1.0 = perfect symmetry, 0.0 = one eye not blinking
BILATERAL_RATIO_MIN = 0.4  # At least 40% symmetry required (was 0.6, relaxed for glasses)

# Minimum dip magnitude from baseline
# Using percentage instead of absolute value for different eye shapes
MIN_DIP_PERCENTAGE = 0.08  # Must drop at least 8% of baseline EAR (was 0.12, lowered for small blinks)
MIN_DIP_ABSOLUTE = 0.012   # Also require minimum absolute drop (was 0.02, lowered for small blinks)


# =============================================================================
# Landmark Confidence
# =============================================================================

# Minimum confidence to process frame (reject low-quality detections)
MIN_DETECTION_CONFIDENCE = 0.7  # Face detection confidence threshold
MIN_LANDMARK_CONFIDENCE = 0.7   # Face landmark confidence threshold


# =============================================================================
# Baseline / Adaptive Thresholds
# =============================================================================

# EAR baseline tracking (running average when eyes are open)
BASELINE_ALPHA = 0.02  # EMA update rate (slow adaptation)
BASELINE_INIT_FRAMES = 30  # Frames to initialize baseline

# Consider eyes "open" if EAR > baseline * this factor
EYES_OPEN_FACTOR = 0.85

# Slow blink threshold detection (hybrid approach)
# When EAR drops below this factor of baseline, consider it a slow blink start
SLOW_BLINK_EAR_THRESHOLD = 0.75  # EAR < 75% of baseline = eyes closing slowly
SLOW_BLINK_RECOVERY_THRESHOLD = 0.85  # EAR > 85% of baseline = eyes opened again


# =============================================================================
# Camera / Frame Settings
# =============================================================================

# Target frame rate for calculations
TARGET_FPS = 30

# Frame timestamp tolerance for consistent timing
FRAME_TIME_MS = 1000 / TARGET_FPS  # ~33.3ms per frame


# =============================================================================
# Visualization / Debug
# =============================================================================

# Graph history length (frames to show in visualization)
GRAPH_HISTORY_FRAMES = 150  # ~5 seconds at 30fps

# Colors for visualization (BGR format for OpenCV)
COLOR_LEFT_EYE = (255, 0, 0)    # Blue
COLOR_RIGHT_EYE = (0, 255, 0)   # Green
COLOR_BLINK = (0, 0, 255)       # Red
COLOR_MOTION = (255, 255, 0)    # Cyan
COLOR_TEXT = (255, 255, 255)    # White
COLOR_YAWN = (0, 165, 255)      # Orange
COLOR_POSTURE = (255, 0, 255)   # Magenta
COLOR_DROWSY = (0, 0, 255)      # Red


# =============================================================================
# Posture Detection
# =============================================================================

# Landmark indices for posture detection
LEFT_EYE_OUTER_INDEX = 33      # Left eye outer corner
RIGHT_EYE_OUTER_INDEX = 263    # Right eye outer corner
CHIN_INDEX = 152               # Chin point
FOREHEAD_INDEX = 10            # Forehead center

# Distance detection (based on face width in pixels)
# These are relative thresholds - calibrated against user's baseline
DISTANCE_TOO_CLOSE_RATIO = 1.4   # Face >140% of baseline = too close
DISTANCE_TOO_FAR_RATIO = 0.6     # Face <60% of baseline = too far

# Fallback absolute thresholds (before calibration)
DISTANCE_TOO_CLOSE_PIXELS = 200  # pixels (face width)
DISTANCE_TOO_FAR_PIXELS = 80     # pixels (face width)
DISTANCE_OPTIMAL_PIXELS = 140    # pixels (target face width)

# Head tilt detection (degrees from horizontal)
TILT_THRESHOLD_DEGREES = 10      # Tilted if angle > 10 degrees

# Forward lean detection (nose-to-eye vertical ratio)
# When leaning forward, nose appears lower relative to eyes
LEAN_THRESHOLD = 0.15            # Normalized value, needs calibration
LEAN_BASELINE_FRAMES = 60        # Frames to establish baseline


# =============================================================================
# Yawn Detection (Mouth Aspect Ratio)
# =============================================================================

# Mouth landmark indices
MOUTH_UPPER_LIP_INDEX = 13       # Top of upper lip
MOUTH_LOWER_LIP_INDEX = 14       # Bottom of lower lip
MOUTH_LEFT_CORNER_INDEX = 61     # Left mouth corner
MOUTH_RIGHT_CORNER_INDEX = 291   # Right mouth corner

# Inner mouth landmarks (more accurate for mouth opening)
MOUTH_INNER_UPPER_INDEX = 13
MOUTH_INNER_LOWER_INDEX = 14
MOUTH_INNER_LEFT_INDEX = 78
MOUTH_INNER_RIGHT_INDEX = 308

# MAR thresholds
MAR_THRESHOLD = 0.5              # Mouth considered "open" above this (was 0.6, lowered for sensitivity)
YAWN_DURATION_MS = 1500          # Must be open for 1.5+ seconds to count as yawn (was 2000)
YAWN_COOLDOWN_MS = 3000          # Cooldown after detecting yawn


# =============================================================================
# Drowsiness Detection (PERCLOS)
# =============================================================================

# PERCLOS = Percentage of Eye Closure over time
PERCLOS_WINDOW_MS = 60000        # 1 minute sliding window
PERCLOS_CLOSED_THRESHOLD = 0.2   # EAR below this = eyes closed

# Drowsiness thresholds (percentage)
PERCLOS_ALERT = 15               # Below this = alert
PERCLOS_MILD = 20                # 15-20% = mild drowsiness
PERCLOS_MODERATE = 30            # 20-30% = moderate
# Above 30% = severe

# Yawn frequency thresholds
YAWN_HISTORY_WINDOW_MS = 300000  # 5 minute window for yawn counting
YAWN_MILD_COUNT = 1              # 1 yawn in 5 min = mild
YAWN_MODERATE_COUNT = 2          # 2 yawns = moderate
YAWN_SEVERE_COUNT = 3            # 3+ yawns = severe
