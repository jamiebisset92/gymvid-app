import cv2
import numpy as np
import os
import mediapipe as mp
import logging

logger = logging.getLogger(__name__)

def is_visible(y_series, min_frames=10, min_movement=0.002):
    """Check if a landmark is visible with sufficient movement"""
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
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if fps == 0 or total_frames == 0:
        raise ValueError(f"Invalid video metadata: FPS={fps}, Total Frames={total_frames}")

    logger.info(f"Video analysis - FPS: {fps}, Total frames: {total_frames}")

    ret, test_frame = cap.read()
    if not ret:
        raise ValueError("Couldn't read video file.")
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    frame_height, frame_width = test_frame.shape[:2]
    mp_pose = mp.solutions.pose

    landmark_dict = {
        "left_wrist": mp_pose.PoseLandmark.LEFT_WRIST,
        "right_wrist": mp_pose.PoseLandmark.RIGHT_WRIST,
        "left_elbow": mp_pose.PoseLandmark.LEFT_ELBOW,
        "right_elbow": mp_pose.PoseLandmark.RIGHT_ELBOW,
        "left_shoulder": mp_pose.PoseLandmark.LEFT_SHOULDER,
        "right_shoulder": mp_pose.PoseLandmark.RIGHT_SHOULDER,
        "left_ankle": mp_pose.PoseLandmark.LEFT_ANKLE,
        "right_ankle": mp_pose.PoseLandmark.RIGHT_ANKLE,
        "left_knee": mp_pose.PoseLandmark.LEFT_KNEE,
        "right_knee": mp_pose.PoseLandmark.RIGHT_KNEE,
        "hip": mp_pose.PoseLandmark.LEFT_HIP,
        "head": mp_pose.PoseLandmark.NOSE
    }

    landmark_positions = {k: [] for k in landmark_dict}
    frames_processed = 0

    with mp_pose.Pose(
        static_image_mode=False,
        min_detection_confidence=0.3,
        min_tracking_confidence=0.3
    ) as pose:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(rgb_frame)

            if results.pose_landmarks:
                for name, lm in landmark_dict.items():
                    landmark_positions[name].append(results.pose_landmarks.landmark[lm].y)
            else:
                for name in landmark_dict:
                    landmark_positions[name].append(np.nan)

            frames_processed += 1

    cap.release()
    logger.info(f"Processed {frames_processed} frames")

    visible_landmarks = {}
    for name, y_list in landmark_positions.items():
        clean_y = [y for y in y_list if not np.isnan(y)]
        if is_visible(clean_y):
            visible_landmarks[name] = y_list
            logger.info(f"Landmark {name} is visible with {len(clean_y)} valid points")

    if not visible_landmarks:
        logger.warning("No visible landmarks detected with sufficient movement.")
        for name, y_list in landmark_positions.items():
            clean_y = [y for y in y_list if not np.isnan(y)]
            if len(clean_y) > 10:
                visible_landmarks[name] = y_list
                logger.info(f"Fallback: Using landmark {name} with minimal data")
                break

        if not visible_landmarks:
            raise ValueError("No usable landmarks detected in video.")

    total_displacements = {}
    for k, v in visible_landmarks.items():
        clean_v = [y for y in v if not np.isnan(y)]
        if len(clean_v) > 1:
            total_displacements[k] = np.sum(np.abs(np.diff(clean_v)))
        else:
            total_displacements[k] = 0

    best_landmark = max(total_displacements, key=total_displacements.get)
    raw_y = np.array(visible_landmarks[best_landmark])

    if np.any(np.isnan(raw_y)):
        nans = np.isnan(raw_y)
        x = np.arange(len(raw_y))
        raw_y[nans] = np.interp(x[nans], x[~nans], raw_y[~nans])

    logger.info(f"Best landmark: {best_landmark} with displacement: {total_displacements[best_landmark]:.4f}")
    logger.info(f"{best_landmark} stats – min: {np.min(raw_y):.4f}, max: {np.max(raw_y):.4f}, mean: {np.mean(raw_y):.4f}")

    return {
        "video_path": video_path,
        "fps": fps,
        "frame_height": frame_height,
        "frame_width": frame_width,
        "best_landmark": best_landmark,
        "raw_y": raw_y.tolist(),
        "raw_left_y": landmark_positions.get("left_wrist", []),
        "raw_right_y": landmark_positions.get("right_wrist", [])
    }
