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
You are a fitness AI that identifies exercises from video keyframes. You're looking at a 2x2 grid of frames from a single exercise video.

IMPORTANT: Look carefully at:
1. The equipment being used (barbell, dumbbells, cables, machine, etc.)
2. The body position (standing, lying, seated, inclined)
3. The movement pattern (pressing, pulling, squatting, etc.)
4. The muscle groups being targeted

Common mistakes to avoid:
- Don't confuse pressing movements (bench press, incline press) with pulling movements (deadlifts, rows)
- Pay attention to whether the person is lying down vs standing
- Look at the direction of movement (pushing away vs pulling towards)

Always return a single JSON object with this structure:

{{
  "equipment": one of ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell", "Resistance Band", "Smith Machine"],
  "variation": (optional — e.g. "Conventional", "Sumo", "Incline", "Flat", "Decline", "Seated", "Standing"),
  "movement": name of the exercise (be specific - e.g. "Incline Barbell Press" not just "Press"),
  "confidence": integer 0–100
}}

Analyze this image: data:image/jpeg;base64,{b64}
"""

    try:
        start = time.time()
        response = client.messages.create(
            model=model,
            max_tokens=500,
            temperature=0,
            system="You are an expert fitness coach with deep knowledge of weight training exercises.",
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
