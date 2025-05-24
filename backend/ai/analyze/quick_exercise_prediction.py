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

app = FastAPI()

@app.post("/analyze/quick_exercise_prediction")
async def quick_exercise_prediction(video: UploadFile = File(...)):
    try:
        # ✅ Save uploaded video
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(await video.read())
            video_path = tmp.name

        # ✅ Extract still frames at intervals
        import cv2
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError("Unable to open video")

        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_sec = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000
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

        # ✅ Compose GPT prompt
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