"""
Head motion tracking from facial landmarks.

Tracks head position using nose tip and face corners to detect movement.
Used to gate blink detection during head motion (which causes false EAR changes).
"""

from dataclasses import dataclass
from typing import Optional, Tuple
import math

from constants import (
    NOSE_TIP_INDEX,
    LEFT_FACE_CORNER_INDEX,
    RIGHT_FACE_CORNER_INDEX,
    HEAD_MOTION_THRESHOLD,
    HEAD_POSITION_SMOOTHING,
)


@dataclass
class HeadMotionResult:
    """Result of head motion analysis."""
    velocity: float           # Normalized velocity (face-widths per frame)
    is_moving: bool           # True if velocity exceeds threshold
    position: Tuple[float, float]  # Current (x, y) position
    face_width: float         # Current face width (for normalization)


class HeadMotionTracker:
    """
    Tracks head motion by monitoring facial landmark positions.

    Uses nose tip as primary position indicator, normalized by face width
    to be scale-invariant (works at different distances from camera).
    """

    def __init__(self, smoothing_alpha: float = HEAD_POSITION_SMOOTHING):
        self.smoothing_alpha = smoothing_alpha
        self.prev_position: Optional[Tuple[float, float]] = None
        self.smoothed_position: Optional[Tuple[float, float]] = None
        self.prev_face_width: Optional[float] = None

    def update(self, landmarks: list) -> HeadMotionResult:
        """
        Update head position and calculate velocity.

        Args:
            landmarks: List of MediaPipe NormalizedLandmark objects

        Returns:
            HeadMotionResult with velocity and motion flag
        """
        # Extract key landmarks
        nose = landmarks[NOSE_TIP_INDEX]
        left_corner = landmarks[LEFT_FACE_CORNER_INDEX]
        right_corner = landmarks[RIGHT_FACE_CORNER_INDEX]

        # Current position (nose tip)
        current_pos = (nose.x, nose.y)

        # Face width for normalization (distance between face corners)
        face_width = math.sqrt(
            (right_corner.x - left_corner.x) ** 2 +
            (right_corner.y - left_corner.y) ** 2
        )

        # Ensure face width is reasonable (avoid division issues)
        if face_width < 0.01:
            face_width = 0.1

        # Apply smoothing to position
        if self.smoothed_position is None:
            self.smoothed_position = current_pos
        else:
            self.smoothed_position = (
                self.smoothing_alpha * current_pos[0] +
                (1 - self.smoothing_alpha) * self.smoothed_position[0],
                self.smoothing_alpha * current_pos[1] +
                (1 - self.smoothing_alpha) * self.smoothed_position[1],
            )

        # Calculate velocity
        velocity = 0.0
        if self.prev_position is not None and self.prev_face_width is not None:
            # Distance moved
            dx = self.smoothed_position[0] - self.prev_position[0]
            dy = self.smoothed_position[1] - self.prev_position[1]
            distance = math.sqrt(dx * dx + dy * dy)

            # Normalize by face width (scale-invariant)
            avg_face_width = (face_width + self.prev_face_width) / 2
            velocity = distance / avg_face_width

        # Update state for next frame
        self.prev_position = self.smoothed_position
        self.prev_face_width = face_width

        # Check if moving
        is_moving = velocity > HEAD_MOTION_THRESHOLD

        return HeadMotionResult(
            velocity=velocity,
            is_moving=is_moving,
            position=self.smoothed_position,
            face_width=face_width,
        )

    def reset(self):
        """Reset tracking state. Call when face is lost."""
        self.prev_position = None
        self.smoothed_position = None
        self.prev_face_width = None
