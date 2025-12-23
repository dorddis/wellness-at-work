"""
Gaze tracking for detecting vertical eye movements (looking up/down).

Tracks iris position relative to eye opening to detect gaze shifts.
Used to gate blink detection - rapid look down/up causes EAR changes that
can be mistaken for blinks.

The key insight: When you look down, your iris moves toward the lower eyelid.
When you blink, your eyelids close over your iris - the iris doesn't move.
By tracking iris position, we can distinguish the two.
"""

from dataclasses import dataclass
from typing import Optional, List, Tuple
from collections import deque
import time

from constants import (
    # Iris landmarks
    LEFT_IRIS_CENTER_INDEX,
    RIGHT_IRIS_CENTER_INDEX,
    # Eyelid landmarks
    LEFT_UPPER_LID_INDEX,
    LEFT_LOWER_LID_INDEX,
    RIGHT_UPPER_LID_INDEX,
    RIGHT_LOWER_LID_INDEX,
    # Gaze tracking parameters
    GAZE_TRACKING_ENABLED,
    GAZE_VELOCITY_WINDOW_FRAMES,
    GAZE_VELOCITY_THRESHOLD,
    GAZE_DETECTION_WINDOW_MS,
    GAZE_MIN_DISPLACEMENT_THRESHOLD,
    GAZE_SMOOTHING_ALPHA,
    GAZE_MIN_EYE_OPENING,
)


@dataclass
class GazeResult:
    """Result of gaze tracking analysis."""
    # Raw iris ratios (0 = upper lid, 1 = lower lid, 0.5 = centered)
    left_iris_ratio: float
    right_iris_ratio: float
    avg_iris_ratio: float

    # Smoothed ratio (EMA applied)
    smoothed_iris_ratio: float

    # Velocity (change per frame, positive = looking down)
    velocity: float

    # Total displacement in detection window
    recent_displacement: float

    # Detection flags
    is_gaze_shift: bool      # True if rapid vertical movement detected
    is_reliable: bool        # False if eyes too closed for reliable tracking

    # Gaze direction for debugging
    gaze_direction: str      # "up", "center", or "down"


class GazeTracker:
    """
    Tracks vertical iris position to detect looking up/down movements.

    Algorithm:
    1. Calculate iris Y position relative to eye opening (0=top, 1=bottom)
    2. Apply EMA smoothing to reduce noise
    3. Track velocity (change between frames)
    4. Track total displacement over detection window
    5. Flag as gaze shift if velocity OR displacement exceeds threshold
    """

    def __init__(
        self,
        enabled: bool = GAZE_TRACKING_ENABLED,
        velocity_threshold: float = GAZE_VELOCITY_THRESHOLD,
        displacement_threshold: float = GAZE_MIN_DISPLACEMENT_THRESHOLD,
        smoothing_alpha: float = GAZE_SMOOTHING_ALPHA,
        min_eye_opening: float = GAZE_MIN_EYE_OPENING,
        velocity_window: int = GAZE_VELOCITY_WINDOW_FRAMES,
        detection_window_ms: float = GAZE_DETECTION_WINDOW_MS,
    ):
        self.enabled = enabled
        self.velocity_threshold = velocity_threshold
        self.displacement_threshold = displacement_threshold
        self.smoothing_alpha = smoothing_alpha
        self.min_eye_opening = min_eye_opening
        self.velocity_window = velocity_window
        self.detection_window_ms = detection_window_ms

        # State
        self.smoothed_ratio: float = 0.5  # Start centered
        self.prev_ratio: float = 0.5

        # History for velocity/displacement calculation
        # Each entry: (timestamp_ms, iris_ratio)
        self.history: deque = deque(maxlen=100)  # More than enough

        # Recent gaze shift flag (for hasRecentGazeShift)
        self.recent_gaze_shift: bool = False

    def update(
        self,
        landmarks: list,
        timestamp_ms: Optional[float] = None,
    ) -> GazeResult:
        """
        Update gaze tracking with new landmarks.

        Args:
            landmarks: List of MediaPipe NormalizedLandmark objects
            timestamp_ms: Frame timestamp in milliseconds

        Returns:
            GazeResult with iris tracking data
        """
        if timestamp_ms is None:
            timestamp_ms = time.time() * 1000

        # Return default result if disabled
        if not self.enabled:
            return GazeResult(
                left_iris_ratio=0.5,
                right_iris_ratio=0.5,
                avg_iris_ratio=0.5,
                smoothed_iris_ratio=0.5,
                velocity=0.0,
                recent_displacement=0.0,
                is_gaze_shift=False,
                is_reliable=False,
                gaze_direction="center",
            )

        # Calculate iris ratio for each eye
        left_ratio, left_reliable = self._calculate_iris_ratio(
            landmarks,
            LEFT_IRIS_CENTER_INDEX,
            LEFT_UPPER_LID_INDEX,
            LEFT_LOWER_LID_INDEX,
        )

        right_ratio, right_reliable = self._calculate_iris_ratio(
            landmarks,
            RIGHT_IRIS_CENTER_INDEX,
            RIGHT_UPPER_LID_INDEX,
            RIGHT_LOWER_LID_INDEX,
        )

        # Average both eyes
        avg_ratio = (left_ratio + right_ratio) / 2.0
        is_reliable = left_reliable and right_reliable

        # Apply EMA smoothing
        self.smoothed_ratio = (
            self.smoothing_alpha * avg_ratio +
            (1 - self.smoothing_alpha) * self.smoothed_ratio
        )

        # Calculate velocity (change from previous frame)
        velocity = self.smoothed_ratio - self.prev_ratio
        self.prev_ratio = self.smoothed_ratio

        # Add to history
        self.history.append((timestamp_ms, self.smoothed_ratio))

        # Calculate displacement over detection window
        recent_displacement = self._calculate_recent_displacement(timestamp_ms)

        # Detect gaze shift
        # Either high velocity (fast movement) OR large displacement (gradual movement)
        is_gaze_shift = False
        if is_reliable:
            high_velocity = abs(velocity) > self.velocity_threshold
            large_displacement = recent_displacement > self.displacement_threshold
            is_gaze_shift = high_velocity or large_displacement

        self.recent_gaze_shift = is_gaze_shift

        # Determine gaze direction for debugging
        gaze_direction = "center"
        if self.smoothed_ratio > 0.6:
            gaze_direction = "down"
        elif self.smoothed_ratio < 0.4:
            gaze_direction = "up"

        return GazeResult(
            left_iris_ratio=left_ratio,
            right_iris_ratio=right_ratio,
            avg_iris_ratio=avg_ratio,
            smoothed_iris_ratio=self.smoothed_ratio,
            velocity=velocity,
            recent_displacement=recent_displacement,
            is_gaze_shift=is_gaze_shift,
            is_reliable=is_reliable,
            gaze_direction=gaze_direction,
        )

    def _calculate_iris_ratio(
        self,
        landmarks: list,
        iris_index: int,
        upper_lid_index: int,
        lower_lid_index: int,
    ) -> Tuple[float, bool]:
        """
        Calculate iris Y position as ratio within eye opening.

        Returns:
            (ratio, is_reliable): ratio is 0-1 (0=top, 1=bottom),
                                  is_reliable is False if eye too closed
        """
        iris = landmarks[iris_index]
        upper_lid = landmarks[upper_lid_index]
        lower_lid = landmarks[lower_lid_index]

        # Eye opening (vertical distance between lids)
        eye_opening = lower_lid.y - upper_lid.y

        # Check if eye is open enough for reliable tracking
        if eye_opening < self.min_eye_opening:
            return 0.5, False  # Return centered when unreliable

        # Calculate ratio: where is iris between upper (0) and lower (1) lid?
        iris_ratio = (iris.y - upper_lid.y) / eye_opening

        # Clamp to 0-1 range (iris should always be between lids)
        iris_ratio = max(0.0, min(1.0, iris_ratio))

        return iris_ratio, True

    def _calculate_recent_displacement(self, current_ms: float) -> float:
        """
        Calculate total iris movement over detection window.

        Looks at max - min ratio within the window to catch
        oscillating movements (look down then up).
        """
        if len(self.history) < 2:
            return 0.0

        # Find entries within detection window
        window_start = current_ms - self.detection_window_ms
        recent_ratios = [
            ratio for ts, ratio in self.history
            if ts >= window_start
        ]

        if len(recent_ratios) < 2:
            return 0.0

        # Displacement = max - min (catches full movement range)
        return max(recent_ratios) - min(recent_ratios)

    def has_recent_gaze_shift(self) -> bool:
        """Check if a gaze shift was detected in the most recent update."""
        return self.recent_gaze_shift

    def get_gaze_direction(self) -> str:
        """Get current gaze direction as string."""
        if self.smoothed_ratio > 0.6:
            return "down"
        elif self.smoothed_ratio < 0.4:
            return "up"
        return "center"

    def is_enabled(self) -> bool:
        """Check if gaze tracking is enabled."""
        return self.enabled

    def reset(self):
        """Reset tracking state."""
        self.smoothed_ratio = 0.5
        self.prev_ratio = 0.5
        self.history.clear()
        self.recent_gaze_shift = False
