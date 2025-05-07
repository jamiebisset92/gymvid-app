import subprocess
import os

def generate_thumbnail(video_path, save_path, frame_time_sec=2):
    try:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)

        cmd = [
            "ffmpeg",
            "-ss", str(frame_time_sec),
            "-i", video_path,
            "-frames:v", "1",
            "-vf", "scale=-1:360",  # Optional: resize thumbnail
            "-y",  # Overwrite without asking
            save_path
        ]

        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        if result.returncode == 0 and os.path.exists(save_path):
            print(f"✅ Thumbnail saved to {save_path}")
            return True
        else:
            print(f"❌ ffmpeg error:\n{result.stderr.decode()}")
            return False

    except Exception as e:
        print(f"❌ Thumbnail generation failed: {e}")
        return False
