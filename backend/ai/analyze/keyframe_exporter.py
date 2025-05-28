import os
import subprocess

def export_keyframes(video_path: str, rep_data: list, output_dir: str = "keyframes") -> list:
    """
    Extracts and saves keyframes (start, peak, stop) for each rep using ffmpeg.
    This ensures orientation metadata is respected, especially for vertical iPhone videos.
    
    Args:
        video_path (str): Path to the video file.
        rep_data (list): List of dictionaries with rep timing information.
        output_dir (str): Directory to save keyframes.
        
    Returns:
        list: List of saved image file paths.
    """
    os.makedirs(output_dir, exist_ok=True)
    saved_paths = []

    for rep in rep_data:
        rep_number = rep.get("rep")
        for phase in ["start", "peak", "stop"]:
            frame_no = rep.get(f"{phase}_frame")
            if frame_no is None:
                continue

            filename = f"rep{rep_number:02d}_{phase}.jpg"
            out_path = os.path.join(output_dir, filename)

            # Build ffmpeg command to extract the exact frame
            cmd = [
                "ffmpeg",
                "-i", video_path,
                "-vf", f"select='eq(n\\,{frame_no})'",
                "-vframes", "1",
                "-q:v", "2",  # quality setting (1 is best, 31 is worst)
                out_path,
                "-y"  # Overwrite if file exists
            ]

            try:
                subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
                saved_paths.append(out_path)
            except subprocess.CalledProcessError:
                print(f"[⚠️] Failed to export frame {frame_no} for rep {rep_number} ({phase})")

    return saved_paths
