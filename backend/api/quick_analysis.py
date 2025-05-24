import os
import sys
import json
import base64
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import tempfile
from openai import OpenAI
from dotenv import load_dotenv

# ✅ Load environment and API client
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ✅ Add backend directory to path for imports
sys.path.append(os.path.abspath("."))

from backend.ai.analyze.video_analysis import analyze_video
from backend.ai.analyze.rep_detection import run_rep_detection_from_landmark_y

app = FastAPI()

# ✅ Route 1: Exercise Prediction
@app.post("/analyze/quick_exercise_prediction")
async def quick_exercise_prediction(video: UploadFile = File(...)):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(await video.read())
            video_path = tmp.name

        import cv2
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError("Unable to open video")

        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        interval = max(frame_count // 4, 1)
        keyframes = []

        for i in range(4):
            frame_index = min(i * interval, frame_count - 1)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
            ret, frame = cap.read()
            if ret:
                _, buffer = cv2.imencode('.jpg', frame)
                b64 = base64.b64encode(buffer).decode('utf-8')
                keyframes.append(b64)
        cap.release()

        system_prompt = """
You are a fitness AI analyzing gym exercise keyframes.

You must ALWAYS return a prediction in this strict JSON format:
{
  "movement": one of ["Deadlift", "Squat", "Lunge", "Hip Thrust", "Row", "Bench Press", "Shoulder Press", "Pull-up", "Chin-up"]
}

RULES:
- Only respond with the JSON block. No explanation.
- Always return valid JSON.
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Analyze the exercise shown in this collage and return your prediction."},
        ]
        for b64 in keyframes:
            messages.append({
                "role": "user",
                "content": [{"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}]
            })

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=500,
        )
        raw = response.choices[0].message.content.strip()
        return json.loads(raw)

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# ✅ Route 2: Rep Detection
@app.post("/analyze/quick_rep_detection")
async def quick_rep_detection(video: UploadFile = File(...)):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(await video.read())
            tmp_path = tmp.name

        video_data = analyze_video(tmp_path)
        rep_data = run_rep_detection_from_landmark_y(
            raw_y=video_data["raw_y"],
            fps=video_data["fps"],
            raw_x=video_data.get("raw_x"),
            raw_left_y=video_data.get("raw_left_y"),
            raw_right_y=video_data.get("raw_right_y"),
        )

        valid_reps = []
        for rep in rep_data:
            start = rep.get("start_frame")
            stop = rep.get("stop_frame")
            if start is not None and stop is not None and stop - start >= 2:
                valid_reps.append(rep)

        return {"rep_count": len(valid_reps)}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
