"""
Yawn detection using Mouth Aspect Ratio (MAR).

Similar to EAR (Eye Aspect Ratio) but for mouth.
Yawn = mouth open (high MAR) for extended duration.
"""

from dataclasses import dataclass
from typing import Optional
import math
import time

from constants import (
    MOUTH_UPPER_LIP_INDEX,
    MOUTH_LOWER_LIP_INDEX,
    MOUTH_LEFT_CORNER_INDEX,
    MOUTH_RIGHT_CORNER_INDEX,
    MAR_THRESHOLD,
    YAWN_DURATION_MS,
    YAWN_COOLDOWN_MS,
)


@dataclass
class YawnResult:
    """Result of yawn detection."""
    mar: float                  # Mouth Aspect Ratio (0-1+)
    is_mouth_open: bool         # MAR above threshold
    is_yawning: bool            # Mouth open for required duration
    yawn_duration_ms: float     # How long mouth has been open
    yawn_count: int             # Total yawns detected
    in_cooldown: bool           # Recently detected a yawn


def calculate_mar(landmarks: list) -> float:
    """
    Calculate Mouth Aspect Ratio.

    MAR = vertical_opening / horizontal_width

    Higher MAR = mouth more open.

    Args:
        landmarks: MediaPipe face landmarks

    Returns:
        MAR value (typically 0.1-0.3 closed, 0.5+ open wide)
    """
    upper_lip = landmarks[MOUTH_UPPER_LIP_INDEX]
    lower_lip = landmarks[MOUTH_LOWER_LIP_INDEX]
    left_corner = landmarks[MOUTH_LEFT_CORNER_INDEX]
    right_corner = landmarks[MOUTH_RIGHT_CORNER_INDEX]

    # Vertical mouth opening
    vertical_dist = math.sqrt(
        (upper_lip.x - lower_lip.x) ** 2 +
        (upper_lip.y - lower_lip.y) ** 2
    )

    # Horizontal mouth width
    horizontal_dist = math.sqrt(
        (left_corner.x - right_corner.x) ** 2 +
        (left_corner.y - right_corner.y) ** 2
    )

    # Avoid division by zero
    if horizontal_dist < 0.001:
        return 0.0

    return vertical_dist / horizontal_dist


class YawnDetector:
    """
    Detects yawns based on prolonged mouth opening.

    A yawn is detected when:
    - MAR exceeds threshold (mouth is open)
    - Stays open for YAWN_DURATION_MS or longer
    """

    def __init__(self):
        self.mouth_open_start: Optional[float] = None
        self.yawn_count: int = 0
        self.last_yawn_time: float = 0
        self.yawn_timestamps: list = []  # For drowsiness tracking

    def update(self, landmarks: list, timestamp_ms: Optional[float] = None) -> YawnResult:
        """
        Process frame and detect yawns.

        Args:
            landmarks: MediaPipe face landmarks
            timestamp_ms: Current timestamp in milliseconds

        Returns:
            YawnResult with MAR and yawn status
        """
        if timestamp_ms is None:
            timestamp_ms = time.time() * 1000

        mar = calculate_mar(landmarks)
        is_mouth_open = mar > MAR_THRESHOLD

        # Check cooldown
        in_cooldown = (timestamp_ms - self.last_yawn_time) < YAWN_COOLDOWN_MS

        yawn_duration_ms = 0
        is_yawning = False

        if is_mouth_open and not in_cooldown:
            # Mouth is open
            if self.mouth_open_start is None:
                self.mouth_open_start = timestamp_ms

            yawn_duration_ms = timestamp_ms - self.mouth_open_start

            # Check if qualifies as yawn
            if yawn_duration_ms >= YAWN_DURATION_MS:
                is_yawning = True

                # Count yawn once (when first detected)
                if yawn_duration_ms < YAWN_DURATION_MS + 100:  # Within 100ms of threshold
                    self.yawn_count += 1
                    self.last_yawn_time = timestamp_ms
                    self.yawn_timestamps.append(timestamp_ms)

        else:
            # Mouth closed or in cooldown
            self.mouth_open_start = None

        return YawnResult(
            mar=mar,
            is_mouth_open=is_mouth_open,
            is_yawning=is_yawning,
            yawn_duration_ms=yawn_duration_ms,
            yawn_count=self.yawn_count,
            in_cooldown=in_cooldown,
        )

    def get_yawn_timestamps(self) -> list:
        """Get list of yawn timestamps for drowsiness calculation."""
        return self.yawn_timestamps.copy()

    def get_recent_yawns(self, window_ms: float, current_time_ms: Optional[float] = None) -> int:
        """
        Count yawns within a time window.

        Args:
            window_ms: Time window in milliseconds
            current_time_ms: Current time (uses system time if None)

        Returns:
            Number of yawns in the window
        """
        if current_time_ms is None:
            current_time_ms = time.time() * 1000

        cutoff = current_time_ms - window_ms
        return sum(1 for t in self.yawn_timestamps if t > cutoff)

    def reset(self):
        """Reset detector state."""
        self.mouth_open_start = None
        self.yawn_count = 0
        self.last_yawn_time = 0
        self.yawn_timestamps = []
