from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from backend.ai.analyze.exercise_prediction import predict_exercise

import os
import io
import cv2
import base64
import numpy as np
import tempfile
import traceback

router = APIRouter()


def generate_collage_from_video_bytes(video_bytes: bytes, total_frames: int = 4) -> bytes:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_vid:
        tmp_vid.write(video_bytes)
        tmp_vid.flush()
        video_path = tmp_vid.name

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Failed to open video stream")

    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if frame_count == 0:
        raise ValueError("Video contains no frames")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_size = (192, 256) if height > width else (256, 192)
    collage = np.zeros((frame_size[1]*2, frame_size[0]*2, 3), dtype=np.uint8)

    for i in range(total_frames):
        frame_index = int(frame_count * ((i + 1) / (total_frames + 1)))
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
        ret, frame = cap.read()
        if ret:
            resized = cv2.resize(frame, frame_size)
            row = i // 2
            col = i % 2
            y, x = row * frame_size[1], col * frame_size[0]
            collage[y:y + frame_size[1], x:x + frame_size[0]] = resized

    cap.release()
    os.remove(video_path)

    _, jpeg = cv2.imencode(".jpg", collage, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return jpeg.tobytes()


@router.post("/quick_exercise_prediction")
async def quick_exercise_prediction(video: UploadFile = File(...)):
    try:
        print("🎬 QUICK EXERCISE PREDICTION STARTED")

        if not video.filename:
            raise ValueError("No video file provided")

        video_bytes = await video.read()
        if not video_bytes:
            raise ValueError("Uploaded video is empty")

        # Generate collage in-memory
        collage_bytes = generate_collage_from_video_bytes(video_bytes)
        collage_b64 = base64.b64encode(collage_bytes).decode("utf-8")

        print("🖼️ Collage generated in-memory and encoded for GPT")

        # Run prediction
        prediction = predict_exercise(collage_b64, model="gpt-4o")

        if "error" in prediction:
            return {
                "exercise_name": "Unable to Detect: Enter Manually",
                "equipment": "Unknown",
                "variation": "",
                "confidence": 0,
                "prediction_details": prediction
            }

        return {
            "exercise_name": prediction.get("movement", "Unknown"),
            "equipment": prediction.get("equipment", "Unknown"),
            "variation": prediction.get("variation", ""),
            "confidence": prediction.get("confidence", 0),
            "prediction_details": prediction
        }

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error: {error_msg}")
        print(traceback.format_exc())
        return JSONResponse(status_code=200, content={
            "exercise_name": "Unable to Detect: Enter Manually",
            "equipment": "Unknown",
            "variation": "",
            "confidence": 0,
            "error": error_msg,
            "prediction_details": {"error": error_msg}
        })
