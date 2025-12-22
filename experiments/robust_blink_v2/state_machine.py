"""
Blink phase state machine.

Tracks the progression through blink phases:
IDLE -> CLOSING -> MINIMUM -> OPENING -> (BLINK detected) -> COOLDOWN -> IDLE

This pattern-based approach is more robust than threshold-based detection.
"""

from enum import Enum, auto
from dataclasses import dataclass
from typing import Optional
import time

from constants import (
    MIN_BLINK_DURATION_MS,
    MAX_BLINK_DURATION_MS,
    COOLDOWN_MS,
    CLOSING_TIMEOUT_MS,
    MIN_DIP_PERCENTAGE,
    MIN_DIP_ABSOLUTE,
    SLOW_BLINK_EAR_THRESHOLD,
    SLOW_BLINK_RECOVERY_THRESHOLD,
)


class BlinkPhase(Enum):
    """States in the blink detection state machine."""
    IDLE = auto()       # Waiting for blink to start
    CLOSING = auto()    # Eyes closing (negative slope detected)
    MINIMUM = auto()    # At minimum EAR (slope near zero)
    OPENING = auto()    # Eyes opening (positive slope detected)
    COOLDOWN = auto()   # Just detected a blink, waiting before next


@dataclass
class BlinkEvent:
    """Represents a detected blink."""
    timestamp_ms: float
    duration_ms: float
    min_ear: float
    dip_magnitude: float  # How much EAR dropped from baseline


@dataclass
class StateMachineResult:
    """Result from state machine update."""
    phase: BlinkPhase
    blink_detected: bool
    blink_event: Optional[BlinkEvent]
    rejection_reason: Optional[str]  # Why blink was rejected (for debugging)


class BlinkStateMachine:
    """
    State machine for detecting blinks based on slope patterns.

    Transitions:
    - IDLE -> CLOSING: When negative slope detected
    - CLOSING -> MINIMUM: When slope becomes near-zero
    - CLOSING -> IDLE: Timeout or motion detected (abort)
    - MINIMUM -> OPENING: When positive slope detected
    - OPENING -> COOLDOWN: When slope stabilizes (blink complete!)
    - COOLDOWN -> IDLE: After cooldown period
    """

    def __init__(self):
        self.phase = BlinkPhase.IDLE
        self.phase_start_ms: float = 0
        self.closing_start_ms: float = 0
        self.baseline_ear: float = 0.3  # Will be updated externally
        self.min_ear_in_blink: float = 1.0
        self.last_blink_ms: float = 0
        self.prev_ear: float = 0.3  # Track previous EAR for threshold crossing detection
        self.is_slow_blink: bool = False  # Track if current blink is slow (threshold-based)

    def update(
        self,
        is_closing: bool,
        is_opening: bool,
        is_at_minimum: bool,
        current_ear: float,
        timestamp_ms: Optional[float] = None,
        head_is_moving: bool = False,
    ) -> StateMachineResult:
        """
        Update state machine with new slope information.

        Args:
            is_closing: True if significant negative slope
            is_opening: True if significant positive slope
            is_at_minimum: True if slope is near zero
            current_ear: Current EAR value
            timestamp_ms: Current timestamp in milliseconds
            head_is_moving: True if head motion detected (suppresses detection)

        Returns:
            StateMachineResult with current phase and any detected blink
        """
        if timestamp_ms is None:
            timestamp_ms = time.time() * 1000

        blink_detected = False
        blink_event = None
        rejection_reason = None

        # Track minimum EAR during blink
        if self.phase in (BlinkPhase.CLOSING, BlinkPhase.MINIMUM, BlinkPhase.OPENING):
            self.min_ear_in_blink = min(self.min_ear_in_blink, current_ear)

        # Calculate threshold-based triggers for slow blinks
        slow_blink_threshold = self.baseline_ear * SLOW_BLINK_EAR_THRESHOLD
        slow_recovery_threshold = self.baseline_ear * SLOW_BLINK_RECOVERY_THRESHOLD
        ear_below_threshold = current_ear < slow_blink_threshold
        ear_above_recovery = current_ear > slow_recovery_threshold

        # State transitions
        if self.phase == BlinkPhase.IDLE:
            # Trigger on slope (fast blink) OR threshold crossing (slow blink)
            start_blink = False
            if is_closing and not head_is_moving:
                start_blink = True
                self.is_slow_blink = False
            elif ear_below_threshold and not head_is_moving:
                # Slow blink: EAR dropped below threshold without significant slope
                start_blink = True
                self.is_slow_blink = True

            if start_blink:
                # Start of potential blink
                self.phase = BlinkPhase.CLOSING
                self.phase_start_ms = timestamp_ms
                self.closing_start_ms = timestamp_ms
                self.min_ear_in_blink = current_ear

        elif self.phase == BlinkPhase.CLOSING:
            if head_is_moving:
                # Abort - head motion detected
                self.phase = BlinkPhase.IDLE
                rejection_reason = "head_motion_during_closing"

            elif timestamp_ms - self.closing_start_ms > CLOSING_TIMEOUT_MS:
                # Timeout - eyes stayed closed too long (not a blink)
                self.phase = BlinkPhase.IDLE
                rejection_reason = "closing_timeout"

            elif is_at_minimum or is_opening:
                # Reached minimum point
                self.phase = BlinkPhase.MINIMUM
                self.phase_start_ms = timestamp_ms

        elif self.phase == BlinkPhase.MINIMUM:
            if head_is_moving:
                self.phase = BlinkPhase.IDLE
                rejection_reason = "head_motion_at_minimum"

            elif is_opening:
                # Eyes starting to open (fast blink via slope)
                self.phase = BlinkPhase.OPENING
                self.phase_start_ms = timestamp_ms

            elif self.is_slow_blink and ear_above_recovery:
                # Slow blink: EAR recovered above threshold
                self.phase = BlinkPhase.OPENING
                self.phase_start_ms = timestamp_ms

            elif is_closing:
                # Still closing, stay in minimum
                pass

        elif self.phase == BlinkPhase.OPENING:
            if head_is_moving:
                self.phase = BlinkPhase.IDLE
                rejection_reason = "head_motion_during_opening"

            # Complete blink when:
            # - Fast blink: slope stabilizes (neither opening nor closing)
            # - Slow blink: EAR recovered above threshold and slope is not strongly closing
            blink_complete = False
            if not is_opening and not is_closing:
                blink_complete = True
            elif self.is_slow_blink and ear_above_recovery and not is_closing:
                blink_complete = True

            if blink_complete:
                # Blink complete! Calculate metrics
                duration_ms = timestamp_ms - self.closing_start_ms
                dip_magnitude = self.baseline_ear - self.min_ear_in_blink

                # Only validate dip magnitude (not duration - a blink is a blink)
                min_dip_required = self.baseline_ear * MIN_DIP_PERCENTAGE
                if dip_magnitude < min_dip_required or dip_magnitude < MIN_DIP_ABSOLUTE:
                    rejection_reason = f"shallow_dip_{dip_magnitude:.3f}_need_{min_dip_required:.3f}"
                    self.phase = BlinkPhase.IDLE
                else:
                    # Valid blink! (duration tracked but not used for rejection)
                    blink_detected = True
                    blink_event = BlinkEvent(
                        timestamp_ms=timestamp_ms,
                        duration_ms=duration_ms,
                        min_ear=self.min_ear_in_blink,
                        dip_magnitude=dip_magnitude,
                    )
                    self.phase = BlinkPhase.COOLDOWN
                    self.phase_start_ms = timestamp_ms
                    self.last_blink_ms = timestamp_ms

        elif self.phase == BlinkPhase.COOLDOWN:
            if timestamp_ms - self.phase_start_ms > COOLDOWN_MS:
                self.phase = BlinkPhase.IDLE

        return StateMachineResult(
            phase=self.phase,
            blink_detected=blink_detected,
            blink_event=blink_event,
            rejection_reason=rejection_reason,
        )

    def set_baseline(self, baseline_ear: float):
        """Update the baseline EAR (called by detector when calibrated)."""
        self.baseline_ear = baseline_ear

    def reset(self):
        """Reset to initial state."""
        self.phase = BlinkPhase.IDLE
        self.phase_start_ms = 0
        self.closing_start_ms = 0
        self.min_ear_in_blink = 1.0
        self.prev_ear = 0.3
        self.is_slow_blink = False

    def get_phase_name(self) -> str:
        """Get current phase name as string."""
        return self.phase.name
