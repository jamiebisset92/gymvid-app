import os
import cv2
import math
import numpy as np


def export_keyframe_collages(video_path: str, rep_data: list, output_dir: str = "keyframe_collages") -> list:
    """
    Extracts and saves keyframe collages for exercise prediction and coaching feedback.

    Rules:
    - 1–4 reps: return 1 collage of all reps
    - 5–7 reps: return 1 collage of reps 1–4
    - 8+ reps: return 2 collages: reps 1–4 and last 4 reps

    Returns:
        List of saved collage file paths.
    """
    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Unable to open video: {video_path}")

    frame_size = (256, 256)  # (width, height)
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
                    if ret:
                        resized = cv2.resize(frame, frame_size)
                        y = i * frame_size[1]
                        x = j * frame_size[0]
                        collage[y:y + frame_size[1], x:x + frame_size[0]] = resized

        filename = f"collage_{suffix}.jpg"
        path = os.path.join(output_dir, filename)
        cv2.imwrite(path, collage)
        collage_paths.append(path)

    # Build collages based on rep count
    if total_reps <= 4:
        build_collage(rep_data, "full")
    elif total_reps <= 7:
        build_collage(rep_data[:4], "first4")
    else:
        build_collage(rep_data[:4], "first4")
        build_collage(rep_data[-4:], "last4")

    cap.release()
    return collage_paths
