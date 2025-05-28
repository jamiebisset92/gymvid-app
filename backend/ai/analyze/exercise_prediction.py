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

    # ✅ Claude prompt (expanded and flexible)
    prompt = f"""
You are a fitness AI that identifies the most likely exercise being performed in a 2x2 collage of lifting keyframes.

Always return a single JSON object with this structure:

{{
  "equipment": one of ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell", "Resistance Band", "Smith Machine"],
  "variation": (optional — e.g. "Conventional", "Sumo", "Incline", "Seated", "Zercher", "Zottman", etc.),
  "movement": name of the most likely exercise (even if it's not common),
  "confidence": integer 0–100
}}

Guidelines:
- If the exercise is common (like Bench Press, Squat, Deadlift), name it clearly.
- If the movement is less common or hybrid, return the **closest recognized name** (e.g. Zottman Curl → "Biceps Curl", Zercher Squat → "Squat (Zercher variation)").
- Use "variation" to give extra context when posture, grip, angle, or setup is unique.
- Don't output explanations or extra text — just valid JSON.
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
