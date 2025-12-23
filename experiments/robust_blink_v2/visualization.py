"""
Real-time visualization for wellness detection debugging.

Displays:
- Camera feed with eye and mouth landmarks
- EAR graph over time
- MAR graph (Mouth Aspect Ratio)
- Slope graph
- Head velocity indicator
- State machine phase
- Blink/Yawn events
- Posture and Drowsiness status
"""

import cv2
import numpy as np
from collections import deque
from typing import List, Optional

from constants import (
    GRAPH_HISTORY_FRAMES,
    COLOR_LEFT_EYE,
    COLOR_RIGHT_EYE,
    COLOR_BLINK,
    COLOR_MOTION,
    COLOR_TEXT,
    COLOR_YAWN,
    COLOR_POSTURE,
    COLOR_DROWSY,
    LEFT_EYE_INDICES,
    RIGHT_EYE_INDICES,
    MOUTH_UPPER_LIP_INDEX,
    MOUTH_LOWER_LIP_INDEX,
    MOUTH_LEFT_CORNER_INDEX,
    MOUTH_RIGHT_CORNER_INDEX,
    CLOSING_SLOPE_THRESHOLD,
    OPENING_SLOPE_THRESHOLD,
    HEAD_MOTION_THRESHOLD,
    MAR_THRESHOLD,
    # Iris landmarks for gaze visualization
    LEFT_IRIS_CENTER_INDEX,
    RIGHT_IRIS_CENTER_INDEX,
    GAZE_VELOCITY_THRESHOLD,
)
from detector import DetectionFrame


class DebugVisualizer:
    """
    Real-time visualization for debugging blink detection.

    Creates a composite display with:
    - Main camera view with landmarks
    - EAR time series graph
    - Slope time series graph
    - Status panel
    """

    def __init__(self, history_length: int = GRAPH_HISTORY_FRAMES):
        self.history_length = history_length

        # Data history for graphs
        self.ear_history: deque = deque(maxlen=history_length)
        self.left_ear_history: deque = deque(maxlen=history_length)
        self.right_ear_history: deque = deque(maxlen=history_length)
        self.slope_history: deque = deque(maxlen=history_length)
        self.velocity_history: deque = deque(maxlen=history_length)
        self.blink_markers: deque = deque(maxlen=history_length)

        # New: MAR and yawn history
        self.mar_history: deque = deque(maxlen=history_length)
        self.yawn_markers: deque = deque(maxlen=history_length)

        # Gaze tracking history
        self.gaze_ratio_history: deque = deque(maxlen=history_length)
        self.gaze_shift_markers: deque = deque(maxlen=history_length)

        # Graph dimensions
        self.graph_width = 400
        self.graph_height = 100  # Slightly smaller to fit more graphs

    def update(self, frame: DetectionFrame):
        """Add new frame data to history."""
        self.ear_history.append(frame.avg_ear)
        self.left_ear_history.append(frame.bilateral.left_eye.ear)
        self.right_ear_history.append(frame.bilateral.right_eye.ear)
        self.slope_history.append(frame.slope.slope * 1000)  # Scale for visibility
        self.velocity_history.append(frame.head_motion.velocity)
        self.blink_markers.append(1.0 if frame.blink_detected else 0.0)

        # New: MAR and yawn
        self.mar_history.append(frame.yawn.mar)
        self.yawn_markers.append(1.0 if frame.yawn.is_yawning else 0.0)

        # Gaze tracking
        self.gaze_ratio_history.append(frame.gaze.smoothed_iris_ratio)
        self.gaze_shift_markers.append(1.0 if frame.gaze.is_gaze_shift else 0.0)

    def draw_landmarks(self, image: np.ndarray, landmarks: list) -> np.ndarray:
        """Draw eye and mouth landmarks on the image."""
        h, w = image.shape[:2]

        # Draw left eye (blue)
        for idx in LEFT_EYE_INDICES:
            lm = landmarks[idx]
            x, y = int(lm.x * w), int(lm.y * h)
            cv2.circle(image, (x, y), 2, COLOR_LEFT_EYE, -1)

        # Draw right eye (green)
        for idx in RIGHT_EYE_INDICES:
            lm = landmarks[idx]
            x, y = int(lm.x * w), int(lm.y * h)
            cv2.circle(image, (x, y), 2, COLOR_RIGHT_EYE, -1)

        # Draw mouth landmarks (orange)
        mouth_indices = [
            MOUTH_UPPER_LIP_INDEX,
            MOUTH_LOWER_LIP_INDEX,
            MOUTH_LEFT_CORNER_INDEX,
            MOUTH_RIGHT_CORNER_INDEX,
        ]
        for idx in mouth_indices:
            lm = landmarks[idx]
            x, y = int(lm.x * w), int(lm.y * h)
            cv2.circle(image, (x, y), 2, COLOR_YAWN, -1)

        # Draw iris centers (cyan - for gaze tracking)
        for idx in [LEFT_IRIS_CENTER_INDEX, RIGHT_IRIS_CENTER_INDEX]:
            lm = landmarks[idx]
            x, y = int(lm.x * w), int(lm.y * h)
            cv2.circle(image, (x, y), 3, (255, 255, 0), -1)  # Cyan

        return image

    def draw_graph(
        self,
        data: deque,
        title: str,
        y_min: float,
        y_max: float,
        threshold_lines: Optional[List[float]] = None,
        color: tuple = (255, 255, 255),
    ) -> np.ndarray:
        """Draw a time series graph."""
        graph = np.zeros((self.graph_height, self.graph_width, 3), dtype=np.uint8)

        # Background
        graph[:] = (30, 30, 30)

        # Draw threshold lines
        if threshold_lines:
            for thresh in threshold_lines:
                y = int(self.graph_height - (thresh - y_min) / (y_max - y_min) * self.graph_height)
                y = max(0, min(self.graph_height - 1, y))
                cv2.line(graph, (0, y), (self.graph_width, y), (60, 60, 60), 1)

        # Draw zero line for slope graph
        if y_min < 0 < y_max:
            y_zero = int(self.graph_height - (0 - y_min) / (y_max - y_min) * self.graph_height)
            cv2.line(graph, (0, y_zero), (self.graph_width, y_zero), (80, 80, 80), 1)

        # Draw data
        if len(data) > 1:
            points = []
            for i, val in enumerate(data):
                x = int(i * self.graph_width / self.history_length)
                y = int(self.graph_height - (val - y_min) / (y_max - y_min) * self.graph_height)
                y = max(0, min(self.graph_height - 1, y))
                points.append((x, y))

            # Draw line
            for i in range(len(points) - 1):
                cv2.line(graph, points[i], points[i + 1], color, 1)

        # Draw blink markers
        for i, marker in enumerate(self.blink_markers):
            if marker > 0:
                x = int(i * self.graph_width / self.history_length)
                cv2.line(graph, (x, 0), (x, self.graph_height), COLOR_BLINK, 2)

        # Title
        cv2.putText(graph, title, (5, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.4, COLOR_TEXT, 1)

        return graph

    def draw_status_panel(self, frame: DetectionFrame) -> np.ndarray:
        """Draw status information panel with all metrics."""
        panel = np.zeros((300, self.graph_width, 3), dtype=np.uint8)  # Increased for gaze
        panel[:] = (20, 20, 20)

        y = 18
        line_height = 18

        # === BLINK SECTION ===
        cv2.putText(panel, f"Blinks: {frame.total_blinks}  |  EAR: {frame.avg_ear:.3f}",
                    (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.45, COLOR_TEXT, 1)
        y += line_height

        # Phase indicator
        phase_colors = {
            "IDLE": (128, 128, 128),
            "CLOSING": (0, 165, 255),
            "MINIMUM": (0, 255, 255),
            "OPENING": (0, 255, 0),
            "COOLDOWN": (255, 0, 255),
        }
        phase_color = phase_colors.get(frame.phase_name, COLOR_TEXT)
        cv2.putText(panel, f"Phase: {frame.phase_name}", (10, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, phase_color, 1)
        y += line_height

        # Divider
        cv2.line(panel, (10, y), (self.graph_width - 10, y), (60, 60, 60), 1)
        y += 8

        # === YAWN SECTION ===
        yawn_color = COLOR_YAWN if frame.yawn.is_yawning else COLOR_TEXT
        yawn_status = "YAWNING!" if frame.yawn.is_yawning else ("open" if frame.yawn.is_mouth_open else "closed")
        cv2.putText(panel, f"Yawns: {frame.yawn.yawn_count}  |  MAR: {frame.yawn.mar:.2f} ({yawn_status})",
                    (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.45, yawn_color, 1)
        y += line_height

        # Divider
        cv2.line(panel, (10, y), (self.graph_width - 10, y), (60, 60, 60), 1)
        y += 8

        # === POSTURE SECTION ===
        posture = frame.posture

        # Distance
        dist_color = COLOR_POSTURE if posture.distance.status != 'optimal' else (0, 255, 0)
        cv2.putText(panel, f"Distance: {posture.distance.status.upper()} ({posture.distance.ratio_to_baseline:.2f}x)",
                    (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, dist_color, 1)
        y += line_height

        # Tilt
        tilt_color = COLOR_POSTURE if posture.tilt.is_tilted else (0, 255, 0)
        cv2.putText(panel, f"Head Tilt: {posture.tilt.angle_degrees:.1f} deg ({posture.tilt.direction})",
                    (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, tilt_color, 1)
        y += line_height

        # Lean
        lean_color = COLOR_POSTURE if posture.lean.is_leaning_forward else (0, 255, 0)
        lean_status = "LEANING" if posture.lean.is_leaning_forward else "OK"
        cv2.putText(panel, f"Forward Lean: {lean_status}",
                    (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, lean_color, 1)
        y += line_height

        # Divider
        cv2.line(panel, (10, y), (self.graph_width - 10, y), (60, 60, 60), 1)
        y += 8

        # === DROWSINESS SECTION ===
        drowsiness = frame.drowsiness
        drowsy_colors = {
            'alert': (0, 255, 0),       # Green
            'mild': (0, 255, 255),      # Yellow
            'moderate': (0, 165, 255),  # Orange
            'severe': (0, 0, 255),      # Red
        }
        drowsy_color = drowsy_colors.get(drowsiness.drowsiness_level, COLOR_TEXT)
        cv2.putText(panel, f"Drowsiness: {drowsiness.drowsiness_level.upper()}",
                    (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, drowsy_color, 2)
        y += line_height

        cv2.putText(panel, f"PERCLOS: {drowsiness.perclos:.1f}%  |  Recent yawns: {drowsiness.recent_yawns}",
                    (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, COLOR_TEXT, 1)
        y += line_height

        # Divider
        cv2.line(panel, (10, y), (self.graph_width - 10, y), (60, 60, 60), 1)
        y += 8

        # === HEAD MOTION ===
        motion_color = COLOR_MOTION if frame.head_motion.is_moving else COLOR_TEXT
        motion_status = "MOVING" if frame.head_motion.is_moving else "stable"
        cv2.putText(panel, f"Head Motion: {motion_status} ({frame.head_motion.velocity:.3f})",
                    (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, motion_color, 1)
        y += line_height

        # === GAZE TRACKING ===
        gaze_color = (255, 255, 0) if frame.gaze.is_gaze_shift else COLOR_TEXT  # Cyan when shifting
        gaze_dir = frame.gaze.gaze_direction
        gaze_status = "SHIFT!" if frame.gaze.is_gaze_shift else gaze_dir
        cv2.putText(panel, f"Gaze: {gaze_status} (ratio={frame.gaze.smoothed_iris_ratio:.2f}, v={frame.gaze.velocity:.3f})",
                    (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, gaze_color, 1)

        return panel

    def draw_mar_graph(self) -> np.ndarray:
        """Draw MAR graph with yawn markers."""
        graph = np.zeros((self.graph_height, self.graph_width, 3), dtype=np.uint8)
        graph[:] = (30, 30, 30)

        y_min, y_max = 0, 1.0

        # Draw threshold line
        y_thresh = int(self.graph_height - (MAR_THRESHOLD - y_min) / (y_max - y_min) * self.graph_height)
        cv2.line(graph, (0, y_thresh), (self.graph_width, y_thresh), (60, 60, 60), 1)

        # Draw data
        if len(self.mar_history) > 1:
            points = []
            for i, val in enumerate(self.mar_history):
                x = int(i * self.graph_width / self.history_length)
                y = int(self.graph_height - (val - y_min) / (y_max - y_min) * self.graph_height)
                y = max(0, min(self.graph_height - 1, y))
                points.append((x, y))

            for i in range(len(points) - 1):
                cv2.line(graph, points[i], points[i + 1], COLOR_YAWN, 1)

        # Draw yawn markers
        for i, marker in enumerate(self.yawn_markers):
            if marker > 0:
                x = int(i * self.graph_width / self.history_length)
                cv2.line(graph, (x, 0), (x, self.graph_height), COLOR_YAWN, 2)

        # Title
        cv2.putText(graph, "MAR (mouth)", (5, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.4, COLOR_TEXT, 1)

        return graph

    def draw_gaze_graph(self) -> np.ndarray:
        """Draw gaze ratio graph with gaze shift markers."""
        graph = np.zeros((self.graph_height, self.graph_width, 3), dtype=np.uint8)
        graph[:] = (30, 30, 30)

        y_min, y_max = 0, 1.0

        # Draw center line (0.5 = looking straight)
        y_center = int(self.graph_height / 2)
        cv2.line(graph, (0, y_center), (self.graph_width, y_center), (80, 80, 80), 1)

        # Draw threshold lines for "up" (0.4) and "down" (0.6)
        y_up = int(self.graph_height - (0.4 - y_min) / (y_max - y_min) * self.graph_height)
        y_down = int(self.graph_height - (0.6 - y_min) / (y_max - y_min) * self.graph_height)
        cv2.line(graph, (0, y_up), (self.graph_width, y_up), (60, 60, 60), 1)
        cv2.line(graph, (0, y_down), (self.graph_width, y_down), (60, 60, 60), 1)

        # Draw data
        if len(self.gaze_ratio_history) > 1:
            points = []
            for i, val in enumerate(self.gaze_ratio_history):
                x = int(i * self.graph_width / self.history_length)
                y = int(self.graph_height - (val - y_min) / (y_max - y_min) * self.graph_height)
                y = max(0, min(self.graph_height - 1, y))
                points.append((x, y))

            for i in range(len(points) - 1):
                cv2.line(graph, points[i], points[i + 1], (255, 255, 0), 1)  # Cyan

        # Draw gaze shift markers
        for i, marker in enumerate(self.gaze_shift_markers):
            if marker > 0:
                x = int(i * self.graph_width / self.history_length)
                cv2.line(graph, (x, 0), (x, self.graph_height), (0, 200, 200), 2)

        # Title
        cv2.putText(graph, "Gaze (iris ratio)", (5, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.4, COLOR_TEXT, 1)
        # Labels
        cv2.putText(graph, "up", (self.graph_width - 25, y_up + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (100, 100, 100), 1)
        cv2.putText(graph, "down", (self.graph_width - 35, y_down + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (100, 100, 100), 1)

        return graph

    def render(self, camera_frame: np.ndarray, detection: DetectionFrame, landmarks: list) -> np.ndarray:
        """
        Render complete debug visualization.

        Args:
            camera_frame: Raw camera frame (BGR)
            detection: Detection result for this frame
            landmarks: Face landmarks

        Returns:
            Composite image with camera + graphs + status
        """
        self.update(detection)

        # Draw landmarks on camera frame
        display_frame = camera_frame.copy()
        display_frame = self.draw_landmarks(display_frame, landmarks)

        # Add blink indicator on camera frame
        if detection.blink_detected:
            cv2.putText(display_frame, "BLINK!", (50, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.5, COLOR_BLINK, 3)

        # Add yawn indicator on camera frame
        if detection.yawn.is_yawning:
            cv2.putText(display_frame, "YAWN!", (50, 100),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.5, COLOR_YAWN, 3)

        # Add posture warnings on camera frame
        if detection.posture.has_issues:
            y_pos = 150
            if detection.posture.distance.status != 'optimal':
                cv2.putText(display_frame, f"{detection.posture.distance.status.upper()}!",
                            (50, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.8, COLOR_POSTURE, 2)
                y_pos += 35
            if detection.posture.tilt.is_tilted:
                cv2.putText(display_frame, "HEAD TILTED!",
                            (50, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.8, COLOR_POSTURE, 2)

        # Draw graphs
        ear_graph = self.draw_graph(
            self.ear_history,
            "EAR (avg)",
            y_min=0.1,
            y_max=0.45,
            threshold_lines=[0.21],
            color=(255, 255, 255),
        )

        mar_graph = self.draw_mar_graph()

        slope_graph = self.draw_graph(
            self.slope_history,
            "Slope (EAR/ms * 1000)",
            y_min=-3,
            y_max=3,
            threshold_lines=[CLOSING_SLOPE_THRESHOLD * 1000, OPENING_SLOPE_THRESHOLD * 1000],
            color=(0, 255, 255),
        )

        velocity_graph = self.draw_graph(
            self.velocity_history,
            "Head Velocity",
            y_min=0,
            y_max=0.1,
            threshold_lines=[HEAD_MOTION_THRESHOLD],
            color=COLOR_MOTION,
        )

        gaze_graph = self.draw_gaze_graph()

        # Status panel
        status_panel = self.draw_status_panel(detection)

        # Combine graphs vertically
        graphs = np.vstack([ear_graph, mar_graph, slope_graph, velocity_graph, gaze_graph, status_panel])

        # Resize camera frame to match graphs height
        target_height = graphs.shape[0]
        scale = target_height / camera_frame.shape[0]
        new_width = int(camera_frame.shape[1] * scale)
        display_frame = cv2.resize(display_frame, (new_width, target_height))

        # Combine horizontally
        composite = np.hstack([display_frame, graphs])

        return composite
