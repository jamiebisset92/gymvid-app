import os
import cv2

def export_keyframes(video_path: str, rep_data: list, output_dir: str = "keyframes") -> list:
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
    if not cap.isOpened():
        raise ValueError(f"Unable to open video: {video_path}")

    for rep in rep_data:
        rep_number = rep.get("rep")
        for phase in ["start", "peak", "stop"]:
            frame_no = rep.get(f"{phase}_frame")
            if frame_no is not None:
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
                ret, frame = cap.read()
                if ret:
                    filename = f"rep{rep_number:02d}_{phase}.jpg"
                    out_path = os.path.join(output_dir, filename)
                    cv2.imwrite(out_path, frame)
                    saved_paths.append(out_path)
                else:
                    print(f"[⚠️] Failed to read frame {frame_no} for rep {rep_number} ({phase})")

    cap.release()
    return saved_paths
