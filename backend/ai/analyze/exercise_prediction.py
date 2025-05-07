import os
import base64
import json
from openai import OpenAI
from dotenv import load_dotenv

# ✅ Load environment variables
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def predict_exercise(keyframe_dir: str) -> dict:
    # ✅ Load keyframes as base64
    images = []
    for fname in sorted(os.listdir(keyframe_dir)):
        if fname.endswith(".jpg"):
            with open(os.path.join(keyframe_dir, fname), "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
                images.append({"name": fname, "data": b64})

    # ✅ Trim to 3 evenly spaced keyframes
    MAX_IMAGES = 3
    if len(images) > MAX_IMAGES:
        step = max(len(images) // MAX_IMAGES, 1)
        images = [images[i] for i in range(0, len(images), step)][:MAX_IMAGES]

    print(f"📸 Using {len(images)} keyframes for prediction.")

    # ✅ System prompt for GPT
    system_prompt = """
You are a fitness AI analyzing gym exercise keyframes.

You must ALWAYS return a prediction in this strict JSON format:

{
  "equipment": one of ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell", "Resistance Band", "Smith Machine"],
  "variation": (only if clearly visible, e.g. "Conventional", "Sumo", "Close Stance", "Wide Grip"),
  "movement": one of ["Deadlift", "Squat", "Lunge", "Hip Thrust", "Row", "Bench Press", "Shoulder Press", "Pull-up", "Chin-up"],
  "confidence": integer percentage from 0 to 100
}

RULES:
- NEVER leave "movement" blank or missing.
- If unsure, GUESS the most likely movement based on visible clues.
- Only respond with the JSON block. No explanation or extra text.
- Always return valid JSON.
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "Analyze the exercise from these keyframes and return your prediction."}
    ]

    for img in images:
        messages.append({
            "role": "user",
            "content": [{"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img['data']}"}}]
        })

    print("🧠 Sending request to GPT...")

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=500,
        )
        raw = response.choices[0].message.content.strip()
        return json.loads(raw)

    except Exception as e:
        print("❌ GPT Error:", str(e))
        return {
            "error": "Prediction failed due to GPT error or rate limit.",
            "details": str(e)
        }
