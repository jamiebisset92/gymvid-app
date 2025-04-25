import os
import base64
import json
from openai import OpenAI

# ✅ Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def predict_exercise(keyframe_dir: str) -> dict:
    # ✅ Load keyframes as base64
    images = []
    for fname in sorted(os.listdir(keyframe_dir)):
        if fname.endswith(".jpg"):
            with open(os.path.join(keyframe_dir, fname), "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
                images.append({"name": fname, "data": b64})

    # ✅ GPT prompt with enforced structure
    system_prompt = """
You are a fitness AI analyzing gym exercise keyframes.

Return your prediction in this exact JSON format:

{
  "equipment": one of ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell", "Resistance Band", "Smith Machine"],
  "variation": only if clearly visible (e.g. "Conventional", "Sumo", "Close Stance", "Wide Grip", etc),
  "movement": one of ["Deadlift", "Squat", "Lunge", "Hip Thrust", "Row", "Bench Press", "Shoulder Press", "Pull-up", "Chin-up"],
  "estimated_weight_kg": number or null,
  "confidence": integer percentage from 0 to 100
}

Do not include anything outside of the JSON block. Be brief and structured.
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

    # ✅ GPT call
    response = client.chat.completions.create(
        model="gpt-4-vision-preview",
        messages=messages,
        max_tokens=500
    )

    try:
        parsed_json = json.loads(response.choices[0].message.content.strip())
        return parsed_json
    except Exception as e:
        return {
            "error": "Failed to parse GPT response",
            "raw": response.choices[0].message.content.strip()
        }
