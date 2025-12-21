"""
Bilateral verification for blink detection.

Ensures both eyes show the same blink pattern to filter out:
- Single-eye artifacts (glasses reflections, partial occlusion)
- Winks (intentional single-eye closure)
- Asymmetric noise
"""

from dataclasses import dataclass
from typing import Tuple
import math

from constants import (
    LEFT_EYE_INDICES,
    RIGHT_EYE_INDICES,
    BILATERAL_RATIO_MIN,
    BASELINE_ALPHA,
    BASELINE_INIT_FRAMES,
)


@dataclass
class EyeMetrics:
    """Metrics for a single eye."""
    ear: float              # Eye Aspect Ratio
    baseline: float         # Running baseline when open
    dip_from_baseline: float  # How much below baseline


@dataclass
class BilateralResult:
    """Result of bilateral analysis."""
    left_eye: EyeMetrics
    right_eye: EyeMetrics
    avg_ear: float          # Average of both eyes
    symmetry_ratio: float   # min(left, right) / max(left, right)
    is_symmetric: bool      # True if ratio >= threshold
    combined_baseline: float


def calculate_ear(landmarks: list, eye_indices: list) -> float:
    """
    Calculate Eye Aspect Ratio for one eye.

    EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)

    Where:
    - p1, p4 are horizontal corners
    - p2, p6 and p3, p5 are vertical pairs

    Args:
        landmarks: List of all face landmarks
        eye_indices: 6 indices for this eye [p1, p2, p3, p4, p5, p6]

    Returns:
        Eye Aspect Ratio (typically 0.2-0.4 when open, <0.2 when closed)
    """
    # Extract the 6 eye landmarks
    p1 = landmarks[eye_indices[0]]  # Outer corner
    p2 = landmarks[eye_indices[1]]  # Upper outer
    p3 = landmarks[eye_indices[2]]  # Upper inner
    p4 = landmarks[eye_indices[3]]  # Inner corner
    p5 = landmarks[eye_indices[4]]  # Lower inner
    p6 = landmarks[eye_indices[5]]  # Lower outer

    # Vertical distances
    vertical1 = math.sqrt((p2.x - p6.x) ** 2 + (p2.y - p6.y) ** 2)
    vertical2 = math.sqrt((p3.x - p5.x) ** 2 + (p3.y - p5.y) ** 2)

    # Horizontal distance
    horizontal = math.sqrt((p1.x - p4.x) ** 2 + (p1.y - p4.y) ** 2)

    # Avoid division by zero
    if horizontal < 0.001:
        return 0.0

    ear = (vertical1 + vertical2) / (2.0 * horizontal)
    return ear


class BilateralVerifier:
    """
    Tracks both eyes and verifies bilateral symmetry for blinks.

    Maintains separate baselines for each eye and requires both
    to show similar dip patterns for a valid blink.
    """

    def __init__(self):
        self.left_baseline: float = 0.3
        self.right_baseline: float = 0.3
        self.frame_count: int = 0
        self.calibrating: bool = True

        # Track min values during current blink for dip calculation
        self.left_min: float = 1.0
        self.right_min: float = 1.0
        self.tracking_blink: bool = False

    def update(self, landmarks: list) -> BilateralResult:
        """
        Calculate EAR for both eyes and check symmetry.

        Args:
            landmarks: List of MediaPipe face landmarks

        Returns:
            BilateralResult with metrics for both eyes
        """
        # Calculate EAR for each eye
        left_ear = calculate_ear(landmarks, LEFT_EYE_INDICES)
        right_ear = calculate_ear(landmarks, RIGHT_EYE_INDICES)
        avg_ear = (left_ear + right_ear) / 2

        self.frame_count += 1

        # Initialize baselines during calibration period
        if self.calibrating:
            if self.frame_count <= BASELINE_INIT_FRAMES:
                # Simple average during init
                alpha = 1.0 / self.frame_count
                self.left_baseline = (1 - alpha) * self.left_baseline + alpha * left_ear
                self.right_baseline = (1 - alpha) * self.right_baseline + alpha * right_ear
            else:
                self.calibrating = False

        # Update baselines (only when eyes appear open)
        if not self.calibrating:
            combined_baseline = (self.left_baseline + self.right_baseline) / 2
            if avg_ear > combined_baseline * 0.85:
                # Eyes are open, update baselines slowly
                self.left_baseline = (1 - BASELINE_ALPHA) * self.left_baseline + BASELINE_ALPHA * left_ear
                self.right_baseline = (1 - BASELINE_ALPHA) * self.right_baseline + BASELINE_ALPHA * right_ear

        # Calculate dips from baseline
        left_dip = self.left_baseline - left_ear
        right_dip = self.right_baseline - right_ear

        # Track minimums during blink
        if self.tracking_blink:
            self.left_min = min(self.left_min, left_ear)
            self.right_min = min(self.right_min, right_ear)

        # Calculate symmetry ratio
        if left_dip > 0 and right_dip > 0:
            symmetry_ratio = min(left_dip, right_dip) / max(left_dip, right_dip)
        elif left_dip <= 0 and right_dip <= 0:
            # Both eyes at or above baseline
            symmetry_ratio = 1.0
        else:
            # One eye dipping, other not
            symmetry_ratio = 0.0

        is_symmetric = symmetry_ratio >= BILATERAL_RATIO_MIN

        combined_baseline = (self.left_baseline + self.right_baseline) / 2

        return BilateralResult(
            left_eye=EyeMetrics(
                ear=left_ear,
                baseline=self.left_baseline,
                dip_from_baseline=left_dip,
            ),
            right_eye=EyeMetrics(
                ear=right_ear,
                baseline=self.right_baseline,
                dip_from_baseline=right_dip,
            ),
            avg_ear=avg_ear,
            symmetry_ratio=symmetry_ratio,
            is_symmetric=is_symmetric,
            combined_baseline=combined_baseline,
        )

    def start_blink_tracking(self):
        """Call when blink starts to track min values."""
        self.tracking_blink = True
        self.left_min = 1.0
        self.right_min = 1.0

    def end_blink_tracking(self) -> Tuple[float, float]:
        """
        Call when blink ends to get dip magnitudes.

        Returns:
            Tuple of (left_dip, right_dip) from baseline to minimum
        """
        self.tracking_blink = False
        left_dip = self.left_baseline - self.left_min
        right_dip = self.right_baseline - self.right_min
        return left_dip, right_dip

    def get_combined_baseline(self) -> float:
        """Get average baseline for both eyes."""
        return (self.left_baseline + self.right_baseline) / 2

    def reset(self):
        """Reset all state."""
        self.left_baseline = 0.3
        self.right_baseline = 0.3
        self.frame_count = 0
        self.calibrating = True
        self.left_min = 1.0
        self.right_min = 1.0
        self.tracking_blink = False
