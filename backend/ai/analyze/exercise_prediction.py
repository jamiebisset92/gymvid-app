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

    # ✅ Trim keyframes to reduce token usage
    MAX_IMAGES = 6
    if len(images) > MAX_IMAGES:
        step = len(images) // MAX_IMAGES
        images = images[::step][:MAX_IMAGES]

    print(f"📸 Using {len(images)} keyframes for prediction.")

    # ✅ Strong GPT prompt with enforced structure
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
- If unsure, GUESS the most likely movement based on the visible clues.
- It is better to make a reasonable guess than to skip fields or return invalid JSON.
- Only respond with the JSON block. No explanation, no extra text.
- Respond precisely, structured, and predict with your best judgment even if uncertain.
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
            max_tokens=500
        )
        raw_content = response.choices[0].message.content.strip()
        parsed_json = json.loads(raw_content)
        return parsed_json

    except Exception as e:
        return {
            "error": f"Failed to parse GPT response: {str(e)}",
            "raw": raw_content if 'raw_content' in locals() else "No content returned"
        }
