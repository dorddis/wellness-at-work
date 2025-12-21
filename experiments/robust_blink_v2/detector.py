"""
Robust Blink Detector - Main integration module.

Combines all components:
- Bilateral EAR calculation
- Slope detection
- Head motion gating
- State machine
- Posture detection
- Yawn detection
- Drowsiness detection

This is the main class to use for wellness detection.
"""

from dataclasses import dataclass
from typing import Optional, List
import time

from slope import SlopeDetector, SlopeResult
from head_motion import HeadMotionTracker, HeadMotionResult
from state_machine import BlinkStateMachine, BlinkPhase, BlinkEvent, StateMachineResult
from bilateral import BilateralVerifier, BilateralResult
from posture import PostureAnalyzer, PostureResult
from yawn import YawnDetector, YawnResult
from drowsiness import DrowsinessDetector, DrowsinessResult


@dataclass
class DetectionFrame:
    """Complete detection result for a single frame."""
    # Timestamps
    timestamp_ms: float
    frame_number: int

    # Eye metrics
    bilateral: BilateralResult
    avg_ear: float

    # Slope analysis
    slope: SlopeResult

    # Head motion
    head_motion: HeadMotionResult

    # State machine
    state: StateMachineResult
    phase_name: str

    # Blink detection
    blink_detected: bool
    blink_event: Optional[BlinkEvent]
    total_blinks: int

    # Posture detection
    posture: PostureResult

    # Yawn detection
    yawn: YawnResult

    # Drowsiness detection
    drowsiness: DrowsinessResult

    # Debug info
    rejection_reason: Optional[str]


class RobustBlinkDetector:
    """
    Robust blink detector using slope-based detection with head motion gating.

    Usage:
        detector = RobustBlinkDetector()

        for frame in camera_frames:
            landmarks = mediapipe.detect(frame)
            result = detector.process_frame(landmarks)
            if result.blink_detected:
                print(f"Blink #{result.total_blinks}")
    """

    def __init__(self):
        # Blink detection components
        self.bilateral = BilateralVerifier()
        self.slope_detector = SlopeDetector()
        self.head_motion = HeadMotionTracker()
        self.state_machine = BlinkStateMachine()

        # New wellness components
        self.posture_analyzer = PostureAnalyzer()
        self.yawn_detector = YawnDetector()
        self.drowsiness_detector = DrowsinessDetector()

        # Counters
        self.frame_count: int = 0
        self.blink_count: int = 0

        # Frame dimensions (updated on first frame)
        self.frame_width: int = 640

        # History for debugging/visualization
        self.recent_frames: List[DetectionFrame] = []
        self.max_history: int = 300  # ~10 seconds at 30fps

    def process_frame(
        self,
        landmarks: list,
        timestamp_ms: Optional[float] = None,
        frame_width: int = 640,
    ) -> DetectionFrame:
        """
        Process a single frame of face landmarks.

        Args:
            landmarks: List of MediaPipe NormalizedLandmark objects
            timestamp_ms: Frame timestamp in milliseconds (uses current time if None)
            frame_width: Width of the camera frame in pixels

        Returns:
            DetectionFrame with complete analysis
        """
        if timestamp_ms is None:
            timestamp_ms = time.time() * 1000

        self.frame_count += 1
        self.frame_width = frame_width

        # =====================================================================
        # BLINK DETECTION
        # =====================================================================

        # 1. Calculate bilateral EAR
        bilateral_result = self.bilateral.update(landmarks)

        # 2. Track head motion
        head_result = self.head_motion.update(landmarks)

        # 3. Calculate slope of average EAR
        slope_result = self.slope_detector.update(
            bilateral_result.avg_ear,
            timestamp_ms,
        )

        # 4. Update state machine
        effective_closing = slope_result.is_closing and bilateral_result.is_symmetric
        effective_opening = slope_result.is_opening and bilateral_result.is_symmetric

        if slope_result.is_closing and self.state_machine.phase == BlinkPhase.IDLE:
            self.bilateral.start_blink_tracking()

        state_result = self.state_machine.update(
            is_closing=effective_closing,
            is_opening=effective_opening,
            is_at_minimum=slope_result.is_at_minimum,
            current_ear=bilateral_result.avg_ear,
            timestamp_ms=timestamp_ms,
            head_is_moving=head_result.is_moving,
        )

        self.state_machine.set_baseline(bilateral_result.combined_baseline)

        blink_detected = state_result.blink_detected
        blink_event = state_result.blink_event
        rejection_reason = state_result.rejection_reason

        if blink_detected:
            self.blink_count += 1
            self.bilateral.end_blink_tracking()

        if rejection_reason and self.state_machine.phase == BlinkPhase.IDLE:
            self.bilateral.end_blink_tracking()

        # =====================================================================
        # POSTURE DETECTION
        # =====================================================================

        posture_result = self.posture_analyzer.update(landmarks, frame_width)

        # =====================================================================
        # YAWN DETECTION
        # =====================================================================

        yawn_result = self.yawn_detector.update(landmarks, timestamp_ms)

        # =====================================================================
        # DROWSINESS DETECTION
        # =====================================================================

        # Feed EAR and yawn data to drowsiness detector
        self.drowsiness_detector.add_frame(
            ear=bilateral_result.avg_ear,
            is_yawn=yawn_result.is_yawning,
            timestamp_ms=timestamp_ms,
        )
        drowsiness_result = self.drowsiness_detector.get_drowsiness(timestamp_ms)

        # =====================================================================
        # BUILD RESULT
        # =====================================================================

        result = DetectionFrame(
            timestamp_ms=timestamp_ms,
            frame_number=self.frame_count,
            bilateral=bilateral_result,
            avg_ear=bilateral_result.avg_ear,
            slope=slope_result,
            head_motion=head_result,
            state=state_result,
            phase_name=self.state_machine.get_phase_name(),
            blink_detected=blink_detected,
            blink_event=blink_event,
            total_blinks=self.blink_count,
            posture=posture_result,
            yawn=yawn_result,
            drowsiness=drowsiness_result,
            rejection_reason=rejection_reason,
        )

        # Store in history
        self.recent_frames.append(result)
        if len(self.recent_frames) > self.max_history:
            self.recent_frames.pop(0)

        return result

    def get_blink_count(self) -> int:
        """Get total number of blinks detected."""
        return self.blink_count

    def reset_count(self):
        """Reset blink counter to zero."""
        self.blink_count = 0

    def reset(self):
        """Full reset of all state."""
        self.bilateral.reset()
        self.slope_detector.reset()
        self.head_motion.reset()
        self.state_machine.reset()
        self.posture_analyzer.reset()
        self.yawn_detector.reset()
        self.drowsiness_detector.reset()
        self.frame_count = 0
        self.blink_count = 0
        self.recent_frames.clear()

    def get_stats(self) -> dict:
        """Get current detector statistics."""
        return {
            "frame_count": self.frame_count,
            "blink_count": self.blink_count,
            "yawn_count": self.yawn_detector.yawn_count,
            "current_phase": self.state_machine.get_phase_name(),
            "baseline_ear": self.bilateral.get_combined_baseline(),
            "calibrating": self.bilateral.calibrating,
            "posture_calibrated": self.posture_analyzer.is_calibrated(),
        }
