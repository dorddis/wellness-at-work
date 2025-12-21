"""
Drowsiness detection using PERCLOS and yawn frequency.

PERCLOS = Percentage of Eye Closure
Standard metric used in driver fatigue detection systems.
"""

from dataclasses import dataclass
from typing import List, Tuple
from collections import deque
import time

from constants import (
    PERCLOS_WINDOW_MS,
    PERCLOS_CLOSED_THRESHOLD,
    PERCLOS_ALERT,
    PERCLOS_MILD,
    PERCLOS_MODERATE,
    YAWN_HISTORY_WINDOW_MS,
    YAWN_MILD_COUNT,
    YAWN_MODERATE_COUNT,
    YAWN_SEVERE_COUNT,
)


@dataclass
class DrowsinessResult:
    """Result of drowsiness detection."""
    perclos: float              # 0-100, percentage of time eyes closed
    drowsiness_level: str       # 'alert', 'mild', 'moderate', 'severe'
    is_drowsy: bool             # True if not 'alert'
    recent_yawns: int           # Yawns in tracking window
    ear_samples: int            # Number of EAR samples in window
    closed_samples: int         # Number of samples where eyes were closed


class DrowsinessDetector:
    """
    Detects drowsiness by combining PERCLOS and yawn frequency.

    PERCLOS = (frames with eyes closed) / (total frames) * 100

    Drowsiness levels:
    - alert: PERCLOS < 15% AND yawns < 1
    - mild: PERCLOS 15-20% OR 1 yawn
    - moderate: PERCLOS 20-30% OR 2 yawns
    - severe: PERCLOS > 30% OR 3+ yawns
    """

    def __init__(self, window_ms: float = PERCLOS_WINDOW_MS):
        self.window_ms = window_ms
        # Store (timestamp_ms, ear_value) tuples
        self.ear_history: deque = deque()
        # Store yawn timestamps
        self.yawn_history: deque = deque()

    def add_frame(
        self,
        ear: float,
        is_yawn: bool = False,
        timestamp_ms: float = None
    ):
        """
        Add a frame's EAR value to history.

        Args:
            ear: Eye Aspect Ratio for this frame
            is_yawn: True if a yawn was detected this frame
            timestamp_ms: Frame timestamp
        """
        if timestamp_ms is None:
            timestamp_ms = time.time() * 1000

        self.ear_history.append((timestamp_ms, ear))

        if is_yawn:
            self.yawn_history.append(timestamp_ms)

        # Prune old data
        self._prune_history(timestamp_ms)

    def _prune_history(self, current_time_ms: float):
        """Remove samples outside the window."""
        cutoff = current_time_ms - self.window_ms

        # Prune EAR history
        while self.ear_history and self.ear_history[0][0] < cutoff:
            self.ear_history.popleft()

        # Prune yawn history (uses longer window)
        yawn_cutoff = current_time_ms - YAWN_HISTORY_WINDOW_MS
        while self.yawn_history and self.yawn_history[0] < yawn_cutoff:
            self.yawn_history.popleft()

    def get_drowsiness(self, timestamp_ms: float = None) -> DrowsinessResult:
        """
        Calculate current drowsiness level.

        Args:
            timestamp_ms: Current timestamp

        Returns:
            DrowsinessResult with PERCLOS and drowsiness level
        """
        if timestamp_ms is None:
            timestamp_ms = time.time() * 1000

        self._prune_history(timestamp_ms)

        total_samples = len(self.ear_history)

        # Need minimum samples for reliable PERCLOS
        if total_samples < 30:  # ~1 second at 30fps
            return DrowsinessResult(
                perclos=0.0,
                drowsiness_level='alert',
                is_drowsy=False,
                recent_yawns=len(self.yawn_history),
                ear_samples=total_samples,
                closed_samples=0,
            )

        # Count closed frames
        closed_samples = sum(
            1 for _, ear in self.ear_history
            if ear < PERCLOS_CLOSED_THRESHOLD
        )

        # Calculate PERCLOS
        perclos = (closed_samples / total_samples) * 100

        # Count recent yawns
        recent_yawns = len(self.yawn_history)

        # Determine drowsiness level
        drowsiness_level = self._classify_drowsiness(perclos, recent_yawns)
        is_drowsy = drowsiness_level != 'alert'

        return DrowsinessResult(
            perclos=perclos,
            drowsiness_level=drowsiness_level,
            is_drowsy=is_drowsy,
            recent_yawns=recent_yawns,
            ear_samples=total_samples,
            closed_samples=closed_samples,
        )

    def _classify_drowsiness(self, perclos: float, yawn_count: int) -> str:
        """
        Classify drowsiness level based on PERCLOS and yawns.

        Uses OR logic - either metric can indicate drowsiness.
        """
        # Severe
        if perclos > PERCLOS_MODERATE or yawn_count >= YAWN_SEVERE_COUNT:
            return 'severe'

        # Moderate
        if perclos > PERCLOS_MILD or yawn_count >= YAWN_MODERATE_COUNT:
            return 'moderate'

        # Mild
        if perclos > PERCLOS_ALERT or yawn_count >= YAWN_MILD_COUNT:
            return 'mild'

        # Alert
        return 'alert'

    def reset(self):
        """Clear all history."""
        self.ear_history.clear()
        self.yawn_history.clear()

    def get_stats(self) -> dict:
        """Get current detector statistics."""
        return {
            "ear_samples": len(self.ear_history),
            "yawn_count": len(self.yawn_history),
            "window_ms": self.window_ms,
        }
