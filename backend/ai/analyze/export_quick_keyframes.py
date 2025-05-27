import os
import cv2
import numpy as np

def export_evenly_spaced_collage(video_path: str, output_dir: str = "quick_collages") -> list:
    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video file: {video_path}")

    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if frame_count == 0:
        raise ValueError("Video contains no frames")

    # Grab 4 evenly spaced frames at 20%, 40%, 60%, 80%
    percentages = [0.2, 0.4, 0.6, 0.8]
    selected_frames = []
    for p in percentages:
        frame_no = int(p * frame_count)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
        ret, frame = cap.read()
        if ret:
            selected_frames.append(cv2.resize(frame, (256, 256)))

    cap.release()

    if len(selected_frames) < 4:
        raise ValueError("Could not extract enough keyframes for collage")

    # Build 2x2 collage: [0,1] top row, [2,3] bottom row
    top_row = np.hstack([selected_frames[0], selected_frames[1]])
    bottom_row = np.hstack([selected_frames[2], selected_frames[3]])
    collage = np.vstack([top_row, bottom_row])

    collage_path = os.path.join(output_dir, "quick_collage.jpg")
    success = cv2.imwrite(collage_path, collage, [int(cv2.IMWRITE_JPEG_QUALITY), 50])
    if not success:
        raise IOError("Failed to write collage image")

    return [collage_path]
