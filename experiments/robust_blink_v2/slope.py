"""
Slope (first derivative) calculation for EAR signal.

Detects blink phases by analyzing the rate of change of EAR over time.
"""

from collections import deque
from dataclasses import dataclass
from typing import Optional
import time

from constants import (
    SLOPE_WINDOW_FRAMES,
    CLOSING_SLOPE_THRESHOLD,
    OPENING_SLOPE_THRESHOLD,
    SLOPE_NEAR_ZERO,
)


@dataclass
class SlopeResult:
    """Result of slope calculation."""
    slope: float              # EAR change per millisecond
    is_closing: bool          # Significant negative slope
    is_opening: bool          # Significant positive slope
    is_at_minimum: bool       # Slope near zero (potential blink minimum)
    raw_ear: float            # Current EAR value
    timestamp_ms: float       # When this was calculated


class SlopeDetector:
    """
    Calculates first derivative of EAR signal to detect blink phases.

    Uses a sliding window to compute slope, which smooths out noise
    while still being responsive to rapid changes.
    """

    def __init__(self, window_size: int = SLOPE_WINDOW_FRAMES):
        self.window_size = window_size
        # Store (timestamp_ms, ear_value) tuples
        self.history: deque = deque(maxlen=window_size + 1)

    def update(self, ear: float, timestamp_ms: Optional[float] = None) -> SlopeResult:
        """
        Add new EAR value and calculate slope.

        Args:
            ear: Current Eye Aspect Ratio value
            timestamp_ms: Timestamp in milliseconds (uses current time if None)

        Returns:
            SlopeResult with slope value and phase detection flags
        """
        if timestamp_ms is None:
            timestamp_ms = time.time() * 1000

        self.history.append((timestamp_ms, ear))

        # Need at least 2 points to calculate slope
        if len(self.history) < 2:
            return SlopeResult(
                slope=0.0,
                is_closing=False,
                is_opening=False,
                is_at_minimum=False,
                raw_ear=ear,
                timestamp_ms=timestamp_ms,
            )

        # Calculate slope using oldest and newest points in window
        oldest_time, oldest_ear = self.history[0]
        newest_time, newest_ear = self.history[-1]

        dt = newest_time - oldest_time
        if dt <= 0:
            dt = 1  # Prevent division by zero

        slope = (newest_ear - oldest_ear) / dt

        # Classify the slope
        is_closing = slope < CLOSING_SLOPE_THRESHOLD
        is_opening = slope > OPENING_SLOPE_THRESHOLD
        is_at_minimum = abs(slope) < SLOPE_NEAR_ZERO and not is_closing and not is_opening

        return SlopeResult(
            slope=slope,
            is_closing=is_closing,
            is_opening=is_opening,
            is_at_minimum=is_at_minimum,
            raw_ear=ear,
            timestamp_ms=timestamp_ms,
        )

    def reset(self):
        """Clear history. Call when detection state resets."""
        self.history.clear()

    def get_slope_history(self) -> list:
        """Return list of (timestamp_ms, ear) tuples for debugging."""
        return list(self.history)
