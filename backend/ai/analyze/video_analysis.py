import cv2
import numpy as np
import os
import mediapipe as mp

def is_visible(y_series, min_frames=10, min_movement=0.005):
    y_array = np.array(y_series)
    if len(y_array) < min_frames:
        return False
    movement_range = np.max(y_array) - np.min(y_array)
    return movement_range > min_movement

def analyze_video(video_path: str) -> dict:
    """
    Extracts pose landmarks from the input video and identifies the most active or available landmark.

    Args:
        video_path (str): Path to the input workout video.

    Returns:
        dict: Metadata including frame dimensions, FPS, best tracking landmark, and raw Y-axis data.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")

    cap = cv2.VideoCapture(video_path)
    fps = int(cap.get(cv2.CAP_PROP_FPS))

    ret, test_frame = cap.read()
    if not ret:
        raise ValueError("Couldn't read video file.")
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    frame_height, frame_width = test_frame.shape[:2]
    mp_pose = mp.solutions.pose

    # Define landmarks to track
    landmark_dict = {
        "left_wrist": mp_pose.PoseLandmark.LEFT_WRIST,
        "right_wrist": mp_pose.PoseLandmark.RIGHT_WRIST,
        "left_ankle": mp_pose.PoseLandmark.LEFT_ANKLE,
        "right_ankle": mp_pose.PoseLandmark.RIGHT_ANKLE,
        "hip": mp_pose.PoseLandmark.LEFT_HIP,
        "head": mp_pose.PoseLandmark.NOSE
    }

    landmark_positions = {k: [] for k in landmark_dict}

    with mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(rgb_frame)

            if results.pose_landmarks:
                for name, lm in landmark_dict.items():
                    landmark_positions[name].append(results.pose_landmarks.landmark[lm].y)

    cap.release()

    # Determine best available and visible landmark
    visible_landmarks = {
        name: y_list for name, y_list in landmark_positions.items()
        if is_visible(y_list)
    }

    if not visible_landmarks:
        raise ValueError("No visible landmarks detected with sufficient movement.")

    total_displacements = {
        k: np.sum(np.abs(np.diff(v))) for k, v in visible_landmarks.items()
    }
    best_landmark = max(total_displacements, key=total_displacements.get)
    raw_y = np.array(visible_landmarks[best_landmark])

    return {
        "video_path": video_path,
        "fps": fps,
        "frame_height": frame_height,
        "frame_width": frame_width,
        "best_landmark": best_landmark,
        "raw_y": raw_y.tolist(),
        "raw_left_y": landmark_positions["left_wrist"],
        "raw_right_y": landmark_positions["right_wrist"]
    }
