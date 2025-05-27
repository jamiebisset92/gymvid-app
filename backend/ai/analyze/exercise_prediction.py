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

    # ✅ Claude prompt (short, strict, focused on key movements)
    prompt = f"""
You are a fitness AI that predicts the type of gym exercise being performed from a 2x2 collage of video keyframes.

You must ALWAYS respond with a single JSON object, strictly in this format:

{{
  "equipment": one of ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell", "Resistance Band", "Smith Machine"],
  "variation": (optional, include only if clearly visible, e.g. "Conventional", "Sumo", "Close Grip", "Incline"),
  "movement": one of ["Deadlift", "Squat", "Lunge", "Hip Thrust", "Row", "Bench Press", "Shoulder Press", "Pull-up", "Chin-up"],
  "confidence": integer from 0 to 100
}}

Rules:
- NEVER leave out "movement" – always guess based on pose and equipment.
- Use your best judgment. Be concise. No extra text or explanation.
- Output ONLY valid JSON. No Markdown, comments, or backticks.
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
