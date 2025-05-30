import os
import subprocess
from PIL import Image, ExifTags
import numpy as np
import cv2

def export_evenly_spaced_collage(video_path: str, total_frames: int = 4, output_dir: str = "quick_collages") -> list:
    os.makedirs(output_dir, exist_ok=True)

    # Step 1: Use ffmpeg to extract evenly spaced frames
    output_template = os.path.join(output_dir, "frame_%03d.jpg")

    # Clear any existing frames
    for f in os.listdir(output_dir):
        if f.startswith("frame_") and f.endswith(".jpg"):
            os.remove(os.path.join(output_dir, f))

    ffmpeg_cmd = [
        "ffmpeg",
        "-i", video_path,
        "-vf", f"select='not(mod(n\,{int(get_frame_interval(video_path, total_frames))})')",
        "-vsync", "vfr",
        "-q:v", "1",
        output_template
    ]

    subprocess.run(ffmpeg_cmd, check=True, capture_output=True)

    # Step 2: Load frames using PIL and auto-rotate
    frame_paths = sorted([
        os.path.join(output_dir, f) for f in os.listdir(output_dir)
        if f.startswith("frame_") and f.endswith(".jpg")
    ])[:total_frames]

    if not frame_paths:
        raise ValueError("No frames were extracted by ffmpeg.")

    # Determine best frame size based on video orientation
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video file: {video_path}")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()

    if height > width:
        frame_size = (216, 384)  # Portrait
    else:
        frame_size = (384, 216)  # Landscape

    # Load and resize with PIL
    images = [load_and_autorotate_pil(f).resize(frame_size, Image.Resampling.LANCZOS) for f in frame_paths]

    # Step 3: Convert to OpenCV and create collage
    opencv_images = [cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR) for img in images]
    rows = 2
    cols = total_frames // 2
    row_images = [np.hstack(opencv_images[i*cols:(i+1)*cols]) for i in range(rows)]
    collage = np.vstack(row_images)

    # Step 4: Save final collage
    collage_path = os.path.join(output_dir, "quick_collage.jpg")
    cv2.imwrite(collage_path, collage, [int(cv2.IMWRITE_JPEG_QUALITY), 85])

    # Clean up temporary frames
    for f in frame_paths:
        os.remove(f)

    return [collage_path]


def get_frame_interval(video_path: str, total_frames: int) -> int:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video file: {video_path}")
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()
    if frame_count == 0:
        raise ValueError("Video contains no frames")
    return max(1, frame_count // (total_frames + 1))


def load_and_autorotate_pil(image_path: str) -> Image.Image:
    image = Image.open(image_path)
    try:
        for orientation in ExifTags.TAGS.keys():
            if ExifTags.TAGS[orientation] == "Orientation":
                break
        exif = image._getexif()
        if exif is not None:
            orientation_value = exif.get(orientation)
            if orientation_value == 3:
                image = image.rotate(180, expand=True)
            elif orientation_value == 6:
                image = image.rotate(270, expand=True)
            elif orientation_value == 8:
                image = image.rotate(90, expand=True)
    except Exception:
        pass
    return image
