import os
import base64
import json
import time
from dotenv import load_dotenv
from anthropic import Anthropic  # ✅ Correct import for 0.23.0+

# ✅ Load environment variables
load_dotenv()

# ✅ Initialize Claude client with correct class name
client = Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))

def predict_exercise(image_path: str, model: str = "claude-3-haiku-20240307") -> dict:
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    print("📸 Using 1 collage image for prediction.")
    print("🖼️ Image size (base64):", len(b64), "characters")
    print(f"🤖 Using Claude model: {model}")

    # ✅ Construct prompt
    prompt = f"""
You are a fitness AI analyzing gym exercise keyframes.

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
"""

    try:
        start = time.time()
        response = client.messages.create(
            model=model,
            max_tokens=500,
            temperature=0,
            system="You are a helpful AI fitness assistant.",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        message = response.content[0].text.strip("`").strip()
        print(f"⏱️ Claude call duration: {round(time.time() - start, 2)} seconds")
        print("🧠 Raw Claude response:", message)

        return json.loads(message)

    except Exception as e:
        print("❌ Claude API Error:", str(e))
        return {
            "error": "Claude failed or returned invalid JSON.",
            "details": str(e)
        }
