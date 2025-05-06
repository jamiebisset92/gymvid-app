# backend/utils/generate_thumbnail.py

import cv2
import os

def generate_thumbnail(video_path, save_path, frame_time_sec=2):
    print(f"🔍 Generating thumbnail from: {video_path}")

    if not os.path.exists(video_path):
        print("❌ Video path does not exist.")
        return False

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("❌ Failed to open video:", video_path)
        return False

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    frame_num = int(frame_time_sec * fps)

    if frame_num >= total_frames:
        frame_num = 0

    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
    success, frame = cap.read()

    if success and frame is not None:
        cv2.imwrite(save_path, frame)
        print(f"✅ Thumbnail saved to: {save_path}")
        cap.release()
        return True

    print("❌ Failed to read frame at:", frame_num)
    cap.release()
    return False
