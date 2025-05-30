import os
import cv2
import numpy as np
import subprocess
import logging

logger = logging.getLogger(__name__)

def get_video_rotation(video_path):
    """
    Uses ffmpeg to detect rotation metadata (e.g., for iPhone videos).
    Returns rotation angle as int (0, 90, 180, 270).
    """
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

def export_keyframe_collages(video_path: str, rep_data: list, output_dir: str = "keyframe_collages") -> list:
    """
    Extracts and saves keyframe collages for exercise prediction and coaching feedback.

    Rules:
    - 1–4 reps: return 1 collage of all reps
    - 5–7 reps: return 2 collages (first 1 rep + final 4 reps)
    - 8+ reps: return 2 collages (first 4 reps + last 4 reps)

    Returns:
        List of saved collage file paths.
    """
    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Unable to open video: {video_path}")

    rotation = get_video_rotation(video_path)

    # ✅ Dynamically determine frame size based on orientation
    vid_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    vid_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if vid_height > vid_width:
        frame_size = (216, 384)  # Portrait
    else:
        frame_size = (384, 216)  # Landscape

    total_reps = len(rep_data)
    collage_paths = []

    def build_collage(rep_slice, suffix):
        collage_height = frame_size[1] * len(rep_slice)
        collage_width = frame_size[0] * 3  # 3 phases per rep
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
        path = os.path.join(output_dir, filename)
        cv2.imwrite(path, collage)
        collage_paths.append(path)
        logger.info(f"Saved collage: {path}")

    # Apply logic based on total rep count
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
