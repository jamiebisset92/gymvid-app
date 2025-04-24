from pathlib import Path

script_path = Path("backend/ai/analyze/keyframe_exporter.py")

keyframe_exporter_script = '''\
import os
import cv2

def export_keyframes(video_path, rep_data, output_dir="keyframes"):
    """
    Extracts and saves keyframes (start, peak, stop) for each rep.
    
    Args:
        video_path (str): Path to the video file.
        rep_data (list): List of dictionaries with rep timing information.
        output_dir (str): Directory to save keyframes.
        
    Returns:
        list: List of saved image file paths.
    """
    os.makedirs(output_dir, exist_ok=True)
    saved_paths = []

    cap = cv2.VideoCapture(video_path)

    for rep in rep_data:
        rep_number = rep["rep"]
        for phase in ["start", "peak", "stop"]:
            frame_no = rep.get(f"{phase}_frame")
            if frame_no is not None:
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
                ret, frame = cap.read()
                if ret:
                    out_path = os.path.join(output_dir, f"rep{rep_number:02d}_{phase}.jpg")
                    cv2.imwrite(out_path, frame)
                    saved_paths.append(out_path)

    cap.release()
    return saved_paths
'''

script_path.write_text(keyframe_exporter_script)
script_path
