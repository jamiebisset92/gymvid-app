import os
import base64
import json
import time
from dotenv import load_dotenv
from anthropic import Anthropic, HUMAN_PROMPT, AI_PROMPT

# ✅ Load API key
load_dotenv()
client = Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))

def predict_exercise(image_path: str, model: str = "claude-3-haiku-20240307") -> dict:
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    print("📸 Using 1 collage image for prediction.")
    print("🖼️ Image size (base64):", len(b64), "characters")
    print(f"🤖 Using Claude model: {model}")

    # ✅ Streaming prompt
    prompt = f"""
{HUMAN_PROMPT} You are a fitness AI analyzing gym exercise keyframes.

You must ALWAYS return a prediction in this strict JSON format:

{{
  "equipment": one of ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell", "Resistance Band", "Smith Machine"],
  "variation": (only if clearly visible, e.g. "Conventional", "Sumo", "Close Stance", "Wide Grip"),
  "movement": one of ["Deadlift", "Squat", "Lunge", "Hip Thrust", "Row", "Bench Press", "Shoulder Press", "Pull-up", "Chin-up"],
  "confidence": integer percentage from 0 to 100
}}

RULES:
- NEVER leave "movement" blank or missing.
- If unsure, GUESS the most likely movement based on visible clues.
- Only respond with the JSON block. No explanation or extra text.
- Always return valid JSON.

Analyze this image: data:image/jpeg;base64,{b64}
{AI_PROMPT}
"""

    try:
        stream = client.completions.create(
            model=model,
            max_tokens_to_sample=500,
            stream=True,
            prompt=prompt
        )

        content = ""
        for event in stream:
            if event.completion:
                content += event.completion

        print("🧠 Raw Claude response:", content)
        return json.loads(content.strip("`").strip())

    except Exception as e:
        print("❌ Claude Streaming Error:", str(e))
        return {
            "error": "Streaming failed or Claude could not return valid JSON.",
            "details": str(e)
        }
