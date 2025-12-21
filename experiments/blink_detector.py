"""
Standalone Blink Detection Prototype
=====================================
Use this to tune parameters before integrating into the app.

Run: python -X utf8 blink_detector.py

Press 'q' to quit, 'r' to reset blink count, 'c' to change camera
"""

import cv2
import numpy as np
from collections import deque
import time
import urllib.request
import os
import json

# MediaPipe Tasks API
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import mediapipe as mp

# =============================================================================
# TUNABLE PARAMETERS - Adjust these to fix detection
# =============================================================================

EAR_THRESHOLD = 0.21          # Below this = eyes closed
CONSEC_FRAMES = 1             # Frames below threshold to count as blink
USE_KALMAN = False            # Enable/disable Kalman smoothing
KALMAN_PROCESS_NOISE = 0.05   # Higher = more responsive
KALMAN_MEASUREMENT_NOISE = 0.02  # Lower = faster response

# MediaPipe landmark indices for eyes
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]

# Config file for camera selection
CONFIG_FILE = "blink_config.json"

# =============================================================================
# Camera Selection
# =============================================================================

def get_available_cameras(max_cameras=10):
    """Detect available cameras."""
    available = []
    for i in range(max_cameras):
        cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)  # Use DirectShow on Windows
        if cap.isOpened():
            # Try to get camera name
            ret, _ = cap.read()
            if ret:
                available.append(i)
            cap.release()
    return available

def load_config():
    """Load saved configuration."""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {"camera_index": 0}

def save_config(config):
    """Save configuration."""
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f)

def select_camera():
    """Interactive camera selection."""
    print("\nScanning for available cameras...")
    cameras = get_available_cameras()

    if not cameras:
        print("No cameras found!")
        return 0

    config = load_config()
    saved_camera = config.get("camera_index", 0)

    print(f"\nAvailable cameras: {cameras}")
    print(f"Currently saved: Camera {saved_camera}")
    print("\nSelect a camera:")

    for i, cam_idx in enumerate(cameras):
        marker = " (saved)" if cam_idx == saved_camera else ""
        print(f"  [{i+1}] Camera {cam_idx}{marker}")

    print(f"  [Enter] Use saved camera ({saved_camera})")
    print(f"  [0] Scan and preview each camera")

    try:
        choice = input("\nYour choice: ").strip()

        if choice == "":
            return saved_camera
        elif choice == "0":
            # Preview each camera
            return preview_cameras(cameras)
        else:
            idx = int(choice) - 1
            if 0 <= idx < len(cameras):
                selected = cameras[idx]
                config["camera_index"] = selected
                save_config(config)
                print(f"Saved camera {selected} to config.")
                return selected
    except:
        pass

    return saved_camera

def preview_cameras(cameras):
    """Preview each camera to help user select."""
    print("\nPreviewing cameras. Press SPACE to select, any other key for next...")

    for cam_idx in cameras:
        print(f"\nOpening Camera {cam_idx}...")
        cap = cv2.VideoCapture(cam_idx, cv2.CAP_DSHOW)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        if not cap.isOpened():
            print(f"  Could not open camera {cam_idx}")
            continue

        while True:
            ret, frame = cap.read()
            if not ret:
                print(f"  Could not read from camera {cam_idx}")
                break

            # Add text overlay
            cv2.putText(frame, f"Camera {cam_idx}", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(frame, "SPACE=Select, Other=Next, Q=Cancel", (10, 60),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

            cv2.imshow("Camera Preview", frame)
            key = cv2.waitKey(1) & 0xFF

            if key == ord(' '):
                # Select this camera
                cap.release()
                cv2.destroyAllWindows()
                config = {"camera_index": cam_idx}
                save_config(config)
                print(f"Selected and saved Camera {cam_idx}")
                return cam_idx
            elif key == ord('q'):
                cap.release()
                cv2.destroyAllWindows()
                return load_config().get("camera_index", 0)
            elif key != 255:
                # Any other key = next camera
                break

        cap.release()

    cv2.destroyAllWindows()
    return load_config().get("camera_index", 0)

# =============================================================================
# Kalman Filter (optional smoothing)
# =============================================================================

class KalmanFilter1D:
    def __init__(self, process_noise=0.05, measurement_noise=0.02, initial=0.3):
        self.Q = process_noise
        self.R = measurement_noise
        self.estimate = initial
        self.error_cov = 1.0

    def update(self, measurement):
        if not np.isfinite(measurement):
            return self.estimate

        # Predict
        predicted_error = self.error_cov + self.Q

        # Update
        kalman_gain = predicted_error / (predicted_error + self.R)
        self.estimate = self.estimate + kalman_gain * (measurement - self.estimate)
        self.error_cov = (1 - kalman_gain) * predicted_error

        return self.estimate

    def reset(self):
        self.estimate = 0.3
        self.error_cov = 1.0

# =============================================================================
# EAR Calculation
# =============================================================================

def calculate_ear(eye_points):
    """Calculate Eye Aspect Ratio from 6 landmark points."""
    # Vertical distances
    A = np.linalg.norm(eye_points[1] - eye_points[5])  # Upper to lower (outer)
    B = np.linalg.norm(eye_points[2] - eye_points[4])  # Upper to lower (inner)

    # Horizontal distance
    C = np.linalg.norm(eye_points[0] - eye_points[3])  # Corner to corner

    if C == 0:
        return 0.0

    ear = (A + B) / (2.0 * C)
    return ear

def get_eye_points(landmarks, indices, w, h):
    """Extract eye landmark points from MediaPipe results."""
    points = []
    for idx in indices:
        lm = landmarks[idx]
        points.append(np.array([lm.x * w, lm.y * h]))
    return np.array(points)

# =============================================================================
# Download model if needed
# =============================================================================

def download_model():
    """Download the face landmarker model if not present."""
    model_path = "face_landmarker.task"
    if not os.path.exists(model_path):
        print("Downloading face landmarker model...")
        url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
        urllib.request.urlretrieve(url, model_path)
        print("Model downloaded!")
    return model_path

# =============================================================================
# Main Loop
# =============================================================================

def main():
    # Camera selection
    camera_index = select_camera()
    print(f"\nUsing Camera {camera_index}")

    # Download model
    model_path = download_model()

    # Initialize MediaPipe FaceLandmarker
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
        num_faces=1,
        min_face_detection_confidence=0.5,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        running_mode=vision.RunningMode.VIDEO
    )
    face_landmarker = vision.FaceLandmarker.create_from_options(options)

    # Initialize camera
    cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)

    if not cap.isOpened():
        print(f"Error: Could not open camera {camera_index}")
        return

    # State
    blink_count = 0
    frames_below_threshold = 0
    eyes_were_closed = False

    # Kalman filters
    left_kalman = KalmanFilter1D(KALMAN_PROCESS_NOISE, KALMAN_MEASUREMENT_NOISE)
    right_kalman = KalmanFilter1D(KALMAN_PROCESS_NOISE, KALMAN_MEASUREMENT_NOISE)

    # EAR history for graph
    ear_history = deque(maxlen=100)
    threshold_history = deque(maxlen=100)

    # FPS and timing
    prev_time = time.time()
    fps = 0
    frame_count = 0

    print("\n" + "="*60)
    print("BLINK DETECTOR PROTOTYPE")
    print("="*60)
    print(f"Camera: {camera_index}")
    print(f"EAR_THRESHOLD: {EAR_THRESHOLD}")
    print(f"CONSEC_FRAMES: {CONSEC_FRAMES}")
    print(f"USE_KALMAN: {USE_KALMAN}")
    print("="*60)
    print("Press 'q' to quit, 'r' to reset count, 'c' to change camera")
    print("="*60 + "\n")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("Failed to read frame")
            break

        frame_count += 1

        # Flip for mirror effect
        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]

        # Convert to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

        # Get timestamp in milliseconds
        timestamp_ms = int(time.time() * 1000)

        # Process frame
        results = face_landmarker.detect_for_video(mp_image, timestamp_ms)

        # Default values
        left_ear = 0.0
        right_ear = 0.0
        avg_ear = 0.0
        smoothed_ear = 0.0

        if results.face_landmarks and len(results.face_landmarks) > 0:
            landmarks = results.face_landmarks[0]

            # Get eye points
            left_points = get_eye_points(landmarks, LEFT_EYE, w, h)
            right_points = get_eye_points(landmarks, RIGHT_EYE, w, h)

            # Calculate EAR
            left_ear = calculate_ear(left_points)
            right_ear = calculate_ear(right_points)
            avg_ear = (left_ear + right_ear) / 2.0

            # Apply Kalman filter if enabled
            if USE_KALMAN:
                smoothed_left = left_kalman.update(left_ear)
                smoothed_right = right_kalman.update(right_ear)
                smoothed_ear = (smoothed_left + smoothed_right) / 2.0
            else:
                smoothed_ear = avg_ear

            # Blink detection
            if smoothed_ear < EAR_THRESHOLD:
                frames_below_threshold += 1
                eyes_were_closed = True
            else:
                if eyes_were_closed and frames_below_threshold >= CONSEC_FRAMES:
                    blink_count += 1
                    print(f"BLINK #{blink_count} detected! (frames below: {frames_below_threshold}, EAR: {smoothed_ear:.3f})")
                frames_below_threshold = 0
                eyes_were_closed = False

            # Draw eye landmarks
            for point in left_points:
                cv2.circle(frame, (int(point[0]), int(point[1])), 2, (0, 255, 0), -1)
            for point in right_points:
                cv2.circle(frame, (int(point[0]), int(point[1])), 2, (0, 255, 0), -1)

            # Draw eye contours
            cv2.polylines(frame, [left_points.astype(np.int32)], True, (0, 255, 0), 1)
            cv2.polylines(frame, [right_points.astype(np.int32)], True, (0, 255, 0), 1)

        # Update history
        ear_history.append(smoothed_ear)
        threshold_history.append(EAR_THRESHOLD)

        # Calculate FPS
        curr_time = time.time()
        fps = 1 / (curr_time - prev_time) if curr_time != prev_time else 0
        prev_time = curr_time

        # Draw EAR graph
        graph_h = 100
        graph_w = 200
        graph_x = w - graph_w - 10
        graph_y = 10

        # Graph background
        cv2.rectangle(frame, (graph_x, graph_y), (graph_x + graph_w, graph_y + graph_h), (40, 40, 40), -1)
        cv2.rectangle(frame, (graph_x, graph_y), (graph_x + graph_w, graph_y + graph_h), (100, 100, 100), 1)

        # Draw threshold line
        threshold_y = int(graph_y + graph_h - (EAR_THRESHOLD / 0.5) * graph_h)
        cv2.line(frame, (graph_x, threshold_y), (graph_x + graph_w, threshold_y), (0, 0, 255), 1)

        # Draw EAR history
        if len(ear_history) > 1:
            for i in range(1, len(ear_history)):
                x1 = graph_x + int((i-1) / 100 * graph_w)
                x2 = graph_x + int(i / 100 * graph_w)
                y1 = int(graph_y + graph_h - (ear_history[i-1] / 0.5) * graph_h)
                y2 = int(graph_y + graph_h - (ear_history[i] / 0.5) * graph_h)
                y1 = max(graph_y, min(graph_y + graph_h, y1))
                y2 = max(graph_y, min(graph_y + graph_h, y2))
                color = (0, 255, 0) if ear_history[i] >= EAR_THRESHOLD else (0, 165, 255)
                cv2.line(frame, (x1, y1), (x2, y2), color, 2)

        # Display info
        info_y = 30
        cv2.putText(frame, f"BLINKS: {blink_count}", (10, info_y),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 255), 2)

        info_y += 35
        cv2.putText(frame, f"EAR: {smoothed_ear:.3f}", (10, info_y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        info_y += 25
        cv2.putText(frame, f"L: {left_ear:.3f} R: {right_ear:.3f}", (10, info_y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        info_y += 25
        cv2.putText(frame, f"Threshold: {EAR_THRESHOLD}", (10, info_y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

        info_y += 25
        cv2.putText(frame, f"Consec: {CONSEC_FRAMES} | Kalman: {USE_KALMAN}", (10, info_y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        info_y += 25
        cv2.putText(frame, f"FPS: {fps:.1f} | Cam: {camera_index}", (10, info_y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        # Status indicator
        status_color = (0, 165, 255) if smoothed_ear < EAR_THRESHOLD else (0, 255, 0)
        status_text = "CLOSED" if smoothed_ear < EAR_THRESHOLD else "OPEN"
        cv2.putText(frame, status_text, (w - 100, h - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)

        # Show frame
        cv2.imshow("Blink Detector - Press 'q' to quit, 'c' to change camera", frame)

        # Handle keys
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('r'):
            blink_count = 0
            print("Blink count reset!")
        elif key == ord('c'):
            # Change camera
            cap.release()
            cv2.destroyAllWindows()
            camera_index = select_camera()
            cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_FPS, 30)
            print(f"Switched to camera {camera_index}")

    # Cleanup
    cap.release()
    cv2.destroyAllWindows()
    face_landmarker.close()

    print(f"\nTotal blinks detected: {blink_count}")

if __name__ == "__main__":
    main()
