import os
import base64
import json
import time
from openai import OpenAI
from anthropic import Anthropic
from dotenv import load_dotenv

# ✅ Load environment variables
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
claude = Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))

def predict_exercise(image_path: str, model: str = "gpt-4o") -> dict:
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

    try:
        start = time.time()

        if model.startswith("claude"):
            print("🤖 Using Claude model:", model)

            response = claude.messages.create(
                model=model,
                max_tokens=500,
                temperature=0.2,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": b64,
                                },
                            },
                            {
                                "type": "text",
                                "text": system_prompt + "\n\nAnalyze the exercise shown and return your prediction.",
                            },
                        ],
                    }
                ]
            )
            raw = response.content[0].text.strip()

        else:
            print("🤖 Using OpenAI model:", model)
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Analyze the exercise shown in this collage and return your prediction."},
                {"role": "user", "content": [{"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}]}
            ]

            response = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=500,
            )
            raw = response.choices[0].message.content.strip()

        duration = round(time.time() - start, 2)
        print(f"⏱️ Model call duration: {duration} seconds")
        print("🧠 Raw response:", raw)

        # ✅ Strip triple backticks if present
        if raw.startswith("```"):
            raw = raw.strip("`").strip("json").strip()

        return json.loads(raw)

    except Exception as e:
        print("❌ Prediction Error:", str(e))
        return {
            "error": "Prediction failed due to model error or formatting issue.",
            "details": str(e)
        }
