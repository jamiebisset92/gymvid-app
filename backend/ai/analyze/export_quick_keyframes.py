import os
import cv2
import numpy as np

def export_quick_keyframes(video_path: str, output_path: str = "quick_collage.jpg") -> str:
    """
    Extracts 6 evenly spaced frames from the video and creates a horizontal collage.
    Fastest possible method using OpenCV (no pose detection).

    Args:
        video_path (str): Path to the input video.
        output_path (str): Path to save the collage image.

    Returns:
        str: Path to the saved collage image.
    """
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise ValueError(f"Failed to open video: {video_path}")

    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_indices = [
        int(total_frames * 0.15),
        int(total_frames * 0.30),
        int(total_frames * 0.45),
        int(total_frames * 0.60),
        int(total_frames * 0.75),
        int(total_frames * 0.90)
    ]

    frames = []
    for idx in frame_indices:
        capture.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = capture.read()
        if ret:
            resized = cv2.resize(frame, (256, 256))  # Optional: standardize size
            frames.append(resized)
        else:
            print(f"⚠️ Could not extract frame at index {idx}")

    capture.release()

    if not frames:
        raise ValueError("No frames were extracted successfully.")

    collage = np.hstack(frames)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cv2.imwrite(output_path, collage)
    return output_path
