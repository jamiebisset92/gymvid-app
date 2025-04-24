from pathlib import Path

# Define the new exercise_prediction.py script using structured JSON prompting
exercise_prediction_script = '''\
import os
import base64
import json
from openai import OpenAI

# ✅ Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def predict_exercise_from_keyframes(keyframe_dir: str):
    # ✅ Load keyframes as base64
    images = []
    for fname in sorted(os.listdir(keyframe_dir)):
        if fname.endswith(".jpg"):
            with open(os.path.join(keyframe_dir, fname), "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
                images.append({"name": fname, "data": b64})

    # ✅ GPT prompt with strict structure
    system_prompt = """You are a fitness AI analyzing gym exercise keyframes.

Your task is to identify the exercise being performed, and output your response using the following consistent naming structure:

{
  "equipment": one of ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell", "Resistance Band", "Smith Machine"],
  "variation": use terms like ["Conventional", "Sumo", "Close Stance", "Wide Stance", "Single Leg", "B-Stance", "Underhand Grip", "Overhand Grip", "Wide Grip", "Close Grip", "Standard"] only when relevant,
  "movement": one of ["Deadlift", "Squat", "Lunge", "Hip Thrust", "Row", "Bench Press", "Shoulder Press", "Pull-up", "Chin-up"],
  "estimated_weight_kg": estimated total loaded weight if visible, or null,
  "confidence": a percentage 0-100 of your confidence in the prediction
}

Your response must be valid JSON. Only include fields you are confident in. Do not include other text outside of the JSON block.
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
            "error": f"Failed to parse GPT response",
            "raw": response.choices[0].message.content.strip()
        }
'''

# Write the script to the appropriate location
output_path = Path("backend/ai/analyze/exercise_prediction.py")
output_path.parent.mkdir(parents=True, exist_ok=True)
output_path.write_text(exercise_prediction_script)
output_path
