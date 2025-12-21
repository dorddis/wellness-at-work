"""
Robust Wellness Detector v2 - Main Entry Point

Comprehensive wellness detection:
- Blink detection (slope-based with head motion gating)
- Yawn detection (MAR-based with duration tracking)
- Posture detection (distance, tilt, lean)
- Drowsiness detection (PERCLOS + yawn frequency)

Run this script to test the detector with your webcam.

Controls:
    q - Quit
    r - Reset all counters
    c - Change camera
    s - Print current stats
"""

import cv2
import json
import os
import sys
import time
from pathlib import Path

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from detector import RobustBlinkDetector
from visualization import DebugVisualizer
from constants import MIN_DETECTION_CONFIDENCE, MIN_LANDMARK_CONFIDENCE


# Configuration file for camera selection
CONFIG_FILE = Path(__file__).parent / "camera_config.json"


def load_camera_config() -> int:
    """Load saved camera index from config file."""
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r") as f:
                config = json.load(f)
                return config.get("camera_index", 0)
        except Exception:
            pass
    return 0


def save_camera_config(camera_index: int):
    """Save camera index to config file."""
    with open(CONFIG_FILE, "w") as f:
        json.dump({"camera_index": camera_index}, f)


def list_cameras(max_cameras: int = 5) -> list:
    """List available cameras by testing indices."""
    available = []
    for i in range(max_cameras):
        cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret and frame is not None:
                available.append(i)
            cap.release()
    return available


def select_camera() -> int:
    """Interactive camera selection with preview."""
    cameras = list_cameras()

    if not cameras:
        print("No cameras found!")
        return 0

    print(f"\nFound {len(cameras)} camera(s): {cameras}")
    print("Press SPACE to select current camera, any other key for next camera")

    for cam_idx in cameras:
        cap = cv2.VideoCapture(cam_idx, cv2.CAP_DSHOW)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        print(f"\nShowing Camera {cam_idx}...")

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Add camera info overlay
            cv2.putText(frame, f"Camera {cam_idx} - SPACE to select, other key for next",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            cv2.imshow("Camera Selection", frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord(' '):
                cap.release()
                cv2.destroyWindow("Camera Selection")
                save_camera_config(cam_idx)
                print(f"Selected Camera {cam_idx}")
                return cam_idx
            elif key != 255:  # Any other key
                break

        cap.release()

    cv2.destroyWindow("Camera Selection")

    # Default to first camera if no selection made
    save_camera_config(cameras[0])
    return cameras[0]


def download_model():
    """Download the face landmarker model if not present."""
    model_path = Path(__file__).parent / "face_landmarker.task"

    if model_path.exists():
        return str(model_path)

    print("Downloading face landmarker model...")

    import urllib.request
    url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

    urllib.request.urlretrieve(url, model_path)
    print(f"Model saved to {model_path}")

    return str(model_path)


def main():
    """Main entry point."""
    print("=" * 60)
    print("ROBUST WELLNESS DETECTOR v2")
    print("Blink | Yawn | Posture | Drowsiness")
    print("=" * 60)

    # Get or select camera
    camera_index = load_camera_config()
    print(f"\nUsing Camera {camera_index}")
    print("Press 'c' to change camera")

    # Download model if needed
    model_path = download_model()

    # Initialize MediaPipe Face Landmarker with confidence thresholds
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
        num_faces=1,
        min_face_detection_confidence=MIN_DETECTION_CONFIDENCE,
        min_face_presence_confidence=MIN_DETECTION_CONFIDENCE,
        min_tracking_confidence=MIN_LANDMARK_CONFIDENCE,
    )
    landmarker = vision.FaceLandmarker.create_from_options(options)
    print(f"Confidence thresholds: detection={MIN_DETECTION_CONFIDENCE}, tracking={MIN_LANDMARK_CONFIDENCE}")

    # Initialize detector and visualizer
    detector = RobustBlinkDetector()
    visualizer = DebugVisualizer()

    # Open camera
    cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)

    if not cap.isOpened():
        print(f"Error: Could not open camera {camera_index}")
        return

    print("\nControls:")
    print("  q - Quit")
    print("  r - Reset blink count")
    print("  c - Change camera")
    print("  s - Print stats")
    print("=" * 60)

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Error: Failed to read frame")
                break

            # Convert to RGB for MediaPipe
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

            # Detect face landmarks
            timestamp_ms = time.time() * 1000
            result = landmarker.detect(mp_image)

            if result.face_landmarks and len(result.face_landmarks) > 0:
                landmarks = result.face_landmarks[0]

                # Get frame dimensions
                frame_height, frame_width = frame.shape[:2]

                # Process through detector
                detection = detector.process_frame(landmarks, timestamp_ms, frame_width)

                # Render visualization
                display = visualizer.render(frame, detection, landmarks)

                # Print blink events
                if detection.blink_detected:
                    event = detection.blink_event
                    print(f"BLINK #{detection.total_blinks} detected! "
                          f"(duration: {event.duration_ms:.0f}ms, "
                          f"dip: {event.dip_magnitude:.3f})")

                # Print yawn events
                if detection.yawn.is_yawning and detection.yawn.yawn_duration_ms < 100:
                    # Only print once when yawn first detected
                    print(f"YAWN #{detection.yawn.yawn_count} detected! "
                          f"(MAR: {detection.yawn.mar:.2f})")

                # Print drowsiness changes
                if detection.drowsiness.drowsiness_level != 'alert':
                    if detection.frame_number % 30 == 0:  # Print every second
                        print(f"DROWSINESS: {detection.drowsiness.drowsiness_level.upper()} "
                              f"(PERCLOS: {detection.drowsiness.perclos:.1f}%, "
                              f"yawns: {detection.drowsiness.recent_yawns})")

                # Print posture warnings (every 2 seconds when issue persists)
                if detection.posture.has_issues and detection.frame_number % 60 == 0:
                    issues = []
                    if detection.posture.distance.status != 'optimal':
                        issues.append(f"distance: {detection.posture.distance.status}")
                    if detection.posture.tilt.is_tilted:
                        issues.append(f"tilt: {detection.posture.tilt.direction} ({detection.posture.tilt.angle_degrees:.1f} deg)")
                    if detection.posture.lean.is_leaning_forward:
                        issues.append("leaning forward")
                    print(f"POSTURE: {', '.join(issues)}")

                # Print rejections (for debugging)
                if detection.rejection_reason:
                    print(f"  [Rejected: {detection.rejection_reason}]")

            else:
                # No face detected
                display = frame.copy()
                cv2.putText(display, "No face detected", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

            # Show display
            cv2.imshow("Robust Wellness Detector v2", display)

            # Handle keyboard input
            key = cv2.waitKey(1) & 0xFF

            if key == ord('q'):
                break

            elif key == ord('r'):
                detector.reset()
                print("All counters reset (blinks, yawns, posture calibration)")

            elif key == ord('c'):
                cap.release()
                cv2.destroyAllWindows()
                camera_index = select_camera()
                cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                detector.reset()
                print(f"Switched to Camera {camera_index}")

            elif key == ord('s'):
                stats = detector.get_stats()
                print(f"\nStats: {stats}")

    except KeyboardInterrupt:
        print("\nInterrupted by user")

    finally:
        cap.release()
        cv2.destroyAllWindows()
        stats = detector.get_stats()
        print("\n" + "=" * 60)
        print("SESSION SUMMARY")
        print("=" * 60)
        print(f"  Blinks:   {stats['blink_count']}")
        print(f"  Yawns:    {stats['yawn_count']}")
        print(f"  Frames:   {stats['frame_count']}")
        print("=" * 60)


if __name__ == "__main__":
    main()
