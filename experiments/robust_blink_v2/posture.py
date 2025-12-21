"""
Posture detection using facial landmarks.

Detects:
- Distance from screen (too close / optimal / too far)
- Head tilt (left / right)
- Forward lean
"""

from dataclasses import dataclass
from typing import Optional
import math

from constants import (
    LEFT_EYE_OUTER_INDEX,
    RIGHT_EYE_OUTER_INDEX,
    NOSE_TIP_INDEX,
    DISTANCE_TOO_CLOSE_RATIO,
    DISTANCE_TOO_FAR_RATIO,
    DISTANCE_TOO_CLOSE_PIXELS,
    DISTANCE_TOO_FAR_PIXELS,
    DISTANCE_OPTIMAL_PIXELS,
    TILT_THRESHOLD_DEGREES,
    LEAN_THRESHOLD,
    LEAN_BASELINE_FRAMES,
)


@dataclass
class DistanceResult:
    """Result of distance detection."""
    status: str  # 'too_close', 'optimal', 'too_far'
    face_width_pixels: float
    baseline_width: float
    ratio_to_baseline: float


@dataclass
class TiltResult:
    """Result of head tilt detection."""
    angle_degrees: float
    is_tilted: bool
    direction: str  # 'left', 'right', 'neutral'


@dataclass
class LeanResult:
    """Result of forward lean detection."""
    nose_to_eye_ratio: float
    baseline_ratio: float
    is_leaning_forward: bool


@dataclass
class PostureResult:
    """Combined posture analysis result."""
    distance: DistanceResult
    tilt: TiltResult
    lean: LeanResult
    has_issues: bool  # True if any posture issue detected


class DistanceDetector:
    """
    Detects distance from screen based on face width.

    Larger face = closer to screen.
    Uses calibration baseline for relative comparison.
    """

    def __init__(self):
        self.baseline_width: Optional[float] = None
        self.calibration_samples: list = []
        self.calibrated = False

    def update(self, landmarks: list, frame_width: int) -> DistanceResult:
        """
        Calculate face width and determine distance status.

        Args:
            landmarks: MediaPipe face landmarks
            frame_width: Width of camera frame in pixels
        """
        # Get eye outer corners
        left_eye = landmarks[LEFT_EYE_OUTER_INDEX]
        right_eye = landmarks[RIGHT_EYE_OUTER_INDEX]

        # Calculate face width in pixels
        face_width = abs(right_eye.x - left_eye.x) * frame_width

        # Calibrate baseline during first frames
        if not self.calibrated:
            self.calibration_samples.append(face_width)
            if len(self.calibration_samples) >= 60:  # 2 seconds at 30fps
                self.baseline_width = sum(self.calibration_samples) / len(self.calibration_samples)
                self.calibrated = True

        # Use baseline if calibrated, else use absolute thresholds
        if self.baseline_width:
            ratio = face_width / self.baseline_width

            if ratio > DISTANCE_TOO_CLOSE_RATIO:
                status = 'too_close'
            elif ratio < DISTANCE_TOO_FAR_RATIO:
                status = 'too_far'
            else:
                status = 'optimal'

            return DistanceResult(
                status=status,
                face_width_pixels=face_width,
                baseline_width=self.baseline_width,
                ratio_to_baseline=ratio,
            )
        else:
            # Fallback to absolute thresholds
            if face_width > DISTANCE_TOO_CLOSE_PIXELS:
                status = 'too_close'
            elif face_width < DISTANCE_TOO_FAR_PIXELS:
                status = 'too_far'
            else:
                status = 'optimal'

            return DistanceResult(
                status=status,
                face_width_pixels=face_width,
                baseline_width=DISTANCE_OPTIMAL_PIXELS,
                ratio_to_baseline=face_width / DISTANCE_OPTIMAL_PIXELS,
            )

    def reset(self):
        """Reset calibration."""
        self.baseline_width = None
        self.calibration_samples = []
        self.calibrated = False


class TiltDetector:
    """
    Detects head tilt (left/right rotation).

    Measures angle between eye corners and horizontal.
    """

    def update(self, landmarks: list) -> TiltResult:
        """
        Calculate head tilt angle.

        Args:
            landmarks: MediaPipe face landmarks
        """
        left_eye = landmarks[LEFT_EYE_OUTER_INDEX]
        right_eye = landmarks[RIGHT_EYE_OUTER_INDEX]

        # Calculate angle from horizontal
        delta_y = right_eye.y - left_eye.y
        delta_x = right_eye.x - left_eye.x

        angle_rad = math.atan2(delta_y, delta_x)
        angle_deg = angle_rad * (180 / math.pi)

        # Determine if tilted
        is_tilted = abs(angle_deg) > TILT_THRESHOLD_DEGREES

        if angle_deg > TILT_THRESHOLD_DEGREES:
            direction = 'right'
        elif angle_deg < -TILT_THRESHOLD_DEGREES:
            direction = 'left'
        else:
            direction = 'neutral'

        return TiltResult(
            angle_degrees=angle_deg,
            is_tilted=is_tilted,
            direction=direction,
        )


class LeanDetector:
    """
    Detects forward lean.

    When leaning forward, nose appears lower relative to eyes
    (nose-to-eye vertical distance increases).
    """

    def __init__(self):
        self.baseline_ratio: Optional[float] = None
        self.calibration_samples: list = []
        self.calibrated = False

    def update(self, landmarks: list) -> LeanResult:
        """
        Calculate nose-to-eye ratio for lean detection.

        Args:
            landmarks: MediaPipe face landmarks
        """
        nose = landmarks[NOSE_TIP_INDEX]
        left_eye = landmarks[LEFT_EYE_OUTER_INDEX]
        right_eye = landmarks[RIGHT_EYE_OUTER_INDEX]

        # Eye center
        eye_center_y = (left_eye.y + right_eye.y) / 2
        eye_center_x = (left_eye.x + right_eye.x) / 2

        # Face height approximation (distance from eye center to nose)
        face_height = abs(nose.y - eye_center_y)

        # Normalize by face width to be scale-invariant
        face_width = abs(right_eye.x - left_eye.x)
        if face_width < 0.01:
            face_width = 0.1

        # Nose-to-eye ratio (higher = leaning forward)
        ratio = face_height / face_width

        # Calibrate baseline
        if not self.calibrated:
            self.calibration_samples.append(ratio)
            if len(self.calibration_samples) >= LEAN_BASELINE_FRAMES:
                self.baseline_ratio = sum(self.calibration_samples) / len(self.calibration_samples)
                self.calibrated = True

        # Compare to baseline
        if self.baseline_ratio:
            deviation = ratio - self.baseline_ratio
            is_leaning = deviation > LEAN_THRESHOLD
        else:
            is_leaning = False

        return LeanResult(
            nose_to_eye_ratio=ratio,
            baseline_ratio=self.baseline_ratio or ratio,
            is_leaning_forward=is_leaning,
        )

    def reset(self):
        """Reset calibration."""
        self.baseline_ratio = None
        self.calibration_samples = []
        self.calibrated = False


class PostureAnalyzer:
    """
    Combined posture analysis.

    Integrates distance, tilt, and lean detection.
    """

    def __init__(self):
        self.distance_detector = DistanceDetector()
        self.tilt_detector = TiltDetector()
        self.lean_detector = LeanDetector()

    def update(self, landmarks: list, frame_width: int = 640) -> PostureResult:
        """
        Analyze all posture metrics.

        Args:
            landmarks: MediaPipe face landmarks
            frame_width: Camera frame width in pixels
        """
        distance = self.distance_detector.update(landmarks, frame_width)
        tilt = self.tilt_detector.update(landmarks)
        lean = self.lean_detector.update(landmarks)

        # Any posture issue?
        has_issues = (
            distance.status != 'optimal' or
            tilt.is_tilted or
            lean.is_leaning_forward
        )

        return PostureResult(
            distance=distance,
            tilt=tilt,
            lean=lean,
            has_issues=has_issues,
        )

    def reset(self):
        """Reset all calibration."""
        self.distance_detector.reset()
        self.lean_detector.reset()

    def is_calibrated(self) -> bool:
        """Check if calibration is complete."""
        return (
            self.distance_detector.calibrated and
            self.lean_detector.calibrated
        )
