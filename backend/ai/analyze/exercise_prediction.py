import os
import base64
import json
import time
from dotenv import load_dotenv
from anthropic import Anthropic  # ✅ Correct import for 0.23.0+

# ✅ Load environment variables
load_dotenv()

# ✅ Initialize Claude client
client = Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))

def predict_exercise(image_path: str, model: str = "claude-3-haiku-20240307") -> dict:
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    print("📸 Sending 2x2 collage for prediction.")
    print("🖼️ Image size (base64):", len(b64), "characters")
    print(f"🤖 Using Claude model: {model}")

    # ✅ Claude prompt (expanded and clarified)
    prompt = f"""
You are a fitness AI that predicts the type of gym exercise being performed from a 2x2 collage of video keyframes.

You must ALWAYS respond with a single JSON object, strictly in this format:

{{
  "equipment": one of ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell", "Resistance Band", "Smith Machine"],
  "variation": (optional, include only if clearly visible, e.g. "Conventional", "Sumo", "Close Grip", "Incline", "Seated", "Standing"),
  "movement": one of [
    // Upper Body - Push
    "Bench Press", "Incline Press", "Shoulder Press", "Overhead Press", "Chest Fly", "Lateral Raise", "Front Raise", "Triceps Extension", "Push-up", "Dip",

    // Upper Body - Pull
    "Row", "Lat Pulldown", "Pull-up", "Chin-up", "Face Pull", "Rear Delt Fly", "Biceps Curl", "Hammer Curl",

    // Lower Body
    "Deadlift", "Romanian Deadlift", "Squat", "Lunge", "Leg Press", "Step-up", "Hip Thrust", "Glute Kickback", "Leg Extension", "Leg Curl", "Calf Raise",

    // Core
    "Crunch", "Sit-up", "Plank", "Leg Raise", "Russian Twist", "Cable Rotation"
  ],
  "confidence": integer from 0 to 100
}}

Rules:
- ALWAYS include "movement", even if it's a guess based on body position and equipment.
- If unsure between two options, choose the most likely one based on visible posture, angle, and setup.
- If a movement is not in the list but can be clearly identified, return the closest matching movement.
- Do not output any explanations, comments, or extra text — only valid JSON.
- Analyze this image: data:image/jpeg;base64,{b64}
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
