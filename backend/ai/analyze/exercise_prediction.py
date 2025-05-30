import os
import base64
import json
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

def predict_exercise(image_path: str, model: str = "gpt-4o") -> dict:
    try:
        with open(image_path, "rb") as f:
            image_data = f.read()
            b64 = base64.b64encode(image_data).decode("utf-8")
    except Exception as e:
        return {
            "movement": "Unknown",
            "equipment": "Unknown",
            "confidence": 0,
            "error": f"Failed to read image: {str(e)}"
        }

    prompt = """
You are an expert fitness AI analyzing a 2x2 collage of gym keyframes showing a person performing an exercise.

Focus closely on:
- The angle of the bench or platform (incline, flat, or decline)
- The position of the lifter’s torso relative to the ground
- The direction of the range of motion (vertical, horizontal, incline)
- The equipment being used (e.g. barbell, dumbbell, cable)

Important: If the bench backrest is tilted upward at any visible angle, classify this as an incline press — not flat.

Return your analysis in strict JSON format only:

{
  "equipment": one of ["Barbell", "Dumbbell", "Kettlebell", "Cable", "Pin-Loaded Machine", "Plate-Loaded Machine", "Bodyweight", "Resistance Band"],
  "movement_pattern": one of ["Push - Horizontal", "Push - Vertical", "Push - Incline", "Pull - Horizontal", "Pull - Vertical", "Squat", "Hinge", "Isolation", "Core", "Carry"],
  "variation": (if applicable — e.g. "Incline", "Seated", "Sumo", etc.),
  "movement": exact name like "Incline Barbell Press", "Romanian Deadlift", etc.,
  "confidence": 0–100
}
"""

    try:
        start = time.time()
        response = client.chat.completions.create(
            model=model,
            temperature=0,
            max_tokens=500,
            messages=[
                { "role": "system", "content": "You are a helpful AI fitness assistant." },
                {
                    "role": "user",
                    "content": [
                        { "type": "text", "text": prompt },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{b64}"
                            }
                        }
                    ]
                }
            ]
        )

        message = response.choices[0].message.content.strip()
        json_start = message.find('{')
        json_end = message.rfind('}') + 1
        parsed = json.loads(message[json_start:json_end])

        parsed["movement"] = parsed.get("movement") or "Unknown"
        parsed["equipment"] = parsed.get("equipment") or "Unknown"
        parsed["variation"] = parsed.get("variation", "")
        parsed["confidence"] = parsed.get("confidence", 0)

        return parsed

    except Exception as e:
        return {
            "movement": "Can't Identify: Please Input Manually",
            "equipment": "",
            "confidence": 0,
            "error": str(e)
        }
