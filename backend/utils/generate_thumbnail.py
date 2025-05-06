# backend/utils/generate_thumbnail.py

import subprocess

def generate_thumbnail(video_path, save_path, frame_time_sec=2):
    try:
        # Build ffmpeg command with rotation metadata handling
        command = [
            "ffmpeg",
            "-i", video_path,
            "-ss", str(frame_time_sec),
            "-vf", "auto-orient",  # auto-rotate based on metadata
            "-frames:v", "1",
            "-q:v", "2",
            save_path
        ]
        subprocess.run(command, check=True)
        print(f"✅ Thumbnail generated: {save_path}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Thumbnail generation failed: {e}")
        return False
