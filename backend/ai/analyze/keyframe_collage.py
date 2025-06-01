import os
import cv2
import numpy as np
import subprocess
import logging
import shutil

logger = logging.getLogger(__name__)

BASE_DISK_PATH = "/mnt/data"

def get_video_rotation(video_path):
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream_tags=rotate",
            "-of", "default=noprint_wrappers=1:nokey=1",
            video_path
        ]
        output = subprocess.check_output(cmd).decode().strip()
        return int(output) if output else 0
    except Exception as e:
        logger.warning(f"Rotation metadata not found or ffprobe failed: {e}")
        return 0

def rotate_frame_if_needed(frame, rotation):
    if rotation == 90:
        return cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
    elif rotation == 180:
        return cv2.rotate(frame, cv2.ROTATE_180)
    elif rotation == 270:
        return cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return frame

def export_keyframe_collages(video_path: str, rep_data: list, user_id: str = "anonymous", output_dir: str = os.path.join(BASE_DISK_PATH, "keyframe_collages")) -> list:
    """
    Extracts and saves keyframe collages to local disk and returns file paths.

    Rules:
    - 1–4 reps: return 1 collage of all reps
    - 5–7 reps: 2 collages (first 1 rep + final 4 reps)
    - 8+ reps: 2 collages (first 4 reps + last 4 reps)

    Returns:
        List of local collage image file paths
    """
    # Clean output dir
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Unable to open video: {video_path}")

    rotation = get_video_rotation(video_path)
    vid_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    vid_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_size = (216, 384) if vid_height > vid_width else (384, 216)

    total_reps = len(rep_data)
    collage_paths = []

    def build_collage(rep_slice, suffix):
        collage_height = frame_size[1] * len(rep_slice)
        collage_width = frame_size[0] * 3
        collage = np.zeros((collage_height, collage_width, 3), dtype=np.uint8)

        for i, rep in enumerate(rep_slice):
            for j, phase in enumerate(["start", "peak", "stop"]):
                frame_no = rep.get(f"{phase}_frame")
                if frame_no is not None:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
                    ret, frame = cap.read()
                    if not ret or frame is None:
                        logger.warning(f"Frame {frame_no} could not be read.")
                        continue
                    frame = rotate_frame_if_needed(frame, rotation)
                    resized = cv2.resize(frame, frame_size)
                    y = i * frame_size[1]
                    x = j * frame_size[0]
                    collage[y:y + frame_size[1], x:x + frame_size[0]] = resized

        filename = f"collage_{suffix}.jpg"
        local_path = os.path.join(output_dir, filename)
        cv2.imwrite(local_path, collage)
        logger.info(f"✅ Saved collage locally: {local_path}")
        collage_paths.append(local_path)

    # Logic based on rep count
    if total_reps <= 4:
        build_collage(rep_data, "full")
    elif total_reps <= 7:
        build_collage(rep_data[:1], "first1")
        build_collage(rep_data[-4:], "last4")
    else:
        build_collage(rep_data[:4], "first4")
        build_collage(rep_data[-4:], "last4")

    cap.release()
    return collage_paths
