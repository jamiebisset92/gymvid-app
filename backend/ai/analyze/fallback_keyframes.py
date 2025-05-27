import os
import cv2
import numpy as np

def export_static_keyframe_collage(video_path: str, output_dir: str = "fallback_collages") -> str:
    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if frame_count == 0:
        raise ValueError("Video contains no frames")

    frame_indices = [int((p / 100) * frame_count) for p in range(10, 100, 10)]
    frames = []

    for idx in frame_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            resized = cv2.resize(frame, (256, 256))
            frames.append(resized)

    cap.release()

    if len(frames) != 9:
        raise ValueError("Not enough frames extracted for fallback collage")

    collage_rows = []
    for i in range(0, 9, 3):
        row = np.hstack(frames[i:i + 3])
        collage_rows.append(row)

    collage = np.vstack(collage_rows)
    path = os.path.join(output_dir, "fallback_collage.jpg")
    cv2.imwrite(path, collage, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
    return path
