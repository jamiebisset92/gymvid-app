import os
import cv2
from moviepy.editor import VideoFileClip
import argparse

def extract_frames(video_path, output_folder, interval_ms=500):
    os.makedirs(output_folder, exist_ok=True)
    
    print(f"🎥 Loading video: {video_path}")
    clip = VideoFileClip(video_path)
    duration = clip.duration  # in seconds
    fps = clip.fps
    total_frames = int(duration * fps)

    print(f"⏱ Duration: {duration:.2f}s | FPS: {fps:.2f} | Total frames: {total_frames}")
    
    frame_interval = interval_ms / 1000  # Convert ms to seconds
    current_time = 0
    frame_count = 0

    while current_time < duration:
        frame = clip.get_frame(current_time)
        frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

        filename = os.path.join(output_folder, f"frame_{frame_count:04d}.jpg")
        cv2.imwrite(filename, frame_bgr)
        print(f"✅ Saved {filename}")

        current_time += frame_interval
        frame_count += 1

    print(f"\n🎉 Done. Saved {frame_count} frames to '{output_folder}'")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("video_path", help="Path to input video file")
    parser.add_argument("output_folder", help="Directory to save extracted frames")
    parser.add_argument("--interval", type=int, default=500, help="Interval between frames (ms)")
    
    args = parser.parse_args()
    extract_frames(args.video_path, args.output_folder, args.interval)
