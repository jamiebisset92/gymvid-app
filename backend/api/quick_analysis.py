from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
import numpy as np
import tempfile
import os
import cv2

from backend.ai.analyze.exercise_prediction import predict_exercise

app = APIRouter()

# ✅ New utility: Extract collage from 4 evenly spaced frames, resized to 128x128, with JPEG compression

def export_evenly_spaced_collage(video_path: str, total_frames: int = 4, output_dir: str = "quick_collages") -> list:
    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Unable to open video: {video_path}")

    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    height, width = 192, 192
    collage_width = width * total_frames
    collage = 255 * np.ones((height, collage_width, 3), dtype=np.uint8)

    for i in range(total_frames):
        frame_index = int(frame_count * ((i + 1) / (total_frames + 1)))
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
        ret, frame = cap.read()
        if ret:
            resized = cv2.resize(frame, (width, height))
            collage[:, i * width:(i + 1) * width] = resized

    collage_path = os.path.join(output_dir, "quick_collage.jpg")
    cv2.imwrite(collage_path, collage, [cv2.IMWRITE_JPEG_QUALITY, 60])
    cap.release()

    return [collage_path]

@app.post("/quick_exercise_prediction")
async def quick_exercise_prediction(video: UploadFile = File(...)):
    try:
        # ✅ Save video to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(await video.read())
            tmp_path = tmp.name

        # ✅ Export a smaller collage using 4 evenly spaced frames
        collage_paths = export_evenly_spaced_collage(tmp_path, total_frames=4)
        print("✅ Collage paths:", collage_paths)

        if not collage_paths or not os.path.exists(collage_paths[0]):
            raise FileNotFoundError("Collage image not created or missing.")

        # ✅ Predict exercise from collage
        prediction = predict_exercise(collage_paths[0], model="claude-3-haiku-20240307")

        # ✅ Combine equipment and movement name for frontend use
        equipment = prediction.get("equipment", "").capitalize()
        movement = prediction.get("movement", "Unknown").capitalize()
        exercise_name = f"{equipment} {movement}".strip()

        return {"exercise_name": exercise_name}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
