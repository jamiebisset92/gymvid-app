import os
import base64
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def predict_exercise(image_path: str) -> dict:
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    print("📸 Using 1 collage image for prediction.")
    print("🖼️ Image size (base64):", len(b64), "characters")

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
        {"role": "user", "content": "Analyze the exercise shown in this collage and return your prediction."},
        {"role": "user", "content": [{"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}]}
    ]

    print("🧠 Sending request to GPT...")

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=500,
        )

        raw = response.choices[0].message.content.strip()
        print("🧠 Raw GPT response:", raw)

        # ✅ Strip triple backticks if present
        if raw.startswith("```"):
            raw = raw.strip("`").strip("json").strip()

        return json.loads(raw)

    except Exception as e:
        print("❌ GPT Error:", str(e))
        return {
            "error": "Prediction failed due to GPT error or format issue.",
            "details": str(e)
        }
