import os
import cv2
import numpy as np

def export_evenly_spaced_collage(video_path: str, total_frames: int = 4, output_dir: str = "quick_collages") -> list:
    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video file: {video_path}")

    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if frame_count == 0:
        raise ValueError("Video contains no frames")

    selected_frames = []
    for i in range(1, total_frames + 1):
        frame_no = int((i / (total_frames + 1)) * frame_count)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
        ret, frame = cap.read()
        if ret:
            selected_frames.append(frame)

    cap.release()

    if not selected_frames:
        raise ValueError("No frames could be extracted")

    # Create a 2x2 collage (for 4 keyframes)
    rows = 2
    cols = total_frames // 2
    resized = [cv2.resize(f, (256, 256)) for f in selected_frames]
    row_images = [np.hstack(resized[i*cols:(i+1)*cols]) for i in range(rows)]
    collage = np.vstack(row_images)
    collage_path = os.path.join(output_dir, "quick_collage.jpg")
    cv2.imwrite(collage_path, collage, [int(cv2.IMWRITE_JPEG_QUALITY), 50])

    return [collage_path]
