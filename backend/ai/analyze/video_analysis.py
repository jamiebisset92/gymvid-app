import cv2
import numpy as np
import os
import json
import mediapipe as mp

def analyze_video(video_path: str) -> dict:
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")

    cap = cv2.VideoCapture(video_path)
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    ret, test_frame = cap.read()
    if not ret:
        raise ValueError("Couldn't read video")
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    frame_height, frame_width = test_frame.shape[:2]
    mp_pose = mp.solutions.pose
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
            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(image)
            if results.pose_landmarks:
                for name, lm in landmark_dict.items():
                    landmark_positions[name].append(results.pose_landmarks.landmark[lm].y)
    cap.release()

    total_displacements = {k: np.sum(np.abs(np.diff(v))) for k, v in landmark_positions.items() if len(v) > 1}
    best_landmark = max(total_displacements, key=total_displacements.get)
    raw_y = np.array(landmark_positions[best_landmark])

    return {
        "video_path": video_path,
        "fps": fps,
        "frame_height": frame_height,
        "frame_width": frame_width,
        "best_landmark": best_landmark,
        "raw_y": raw_y.tolist()
    }
