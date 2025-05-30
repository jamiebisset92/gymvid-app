import os
import base64
import json
import time
import openai
from dotenv import load_dotenv

# ✅ Load environment variables
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

def predict_exercise(image_path: str, model: str = "gpt-4o") -> dict:
    try:
        with open(image_path, "rb") as f:
            image_data = f.read()
            b64 = base64.b64encode(image_data).decode("utf-8")
    except Exception as e:
        print(f"❌ Error reading image file: {str(e)}")
        return {
            "movement": "Unknown",
            "equipment": "Unknown",
            "confidence": 0,
            "error": f"Failed to read image: {str(e)}"
        }

    print("📸 Sending image for prediction...")
    print(f"🖼️ Base64 size: {len(b64)} chars")
    print(f"🤖 GPT model: {model}")

    prompt = """
You are an expert fitness AI.

You are analyzing a 2x2 collage of keyframes from a gym video. Identify the most likely exercise being performed.

Your task:
- Determine the exact exercise name (e.g. "Conventional Deadlift", "Incline Barbell Press", "Seated Cable Row")
- Identify the type of equipment used
- Specify variation if clearly visible (e.g. Sumo, Romanian, Incline, Trap Bar, etc.)
- Estimate a confidence level from 0 to 100

⚠️ Format your response strictly as valid JSON — no commentary, no markdown:

{
  "equipment": one of ["Barbell", "Dumbbell", "Kettlebell", "Cable", "Pin-Loaded Machine", "Plate-Loaded Machine", "Bodyweight", "Resistance Band"],
  "movement_pattern": one of ["Push - Horizontal", "Push - Vertical", "Push - Incline", "Pull - Horizontal", "Pull - Vertical", "Squat", "Hinge", "Isolation", "Core", "Carry"],
  "variation": (if applicable — e.g. "Incline", "Seated", "Sumo", "Trap Bar", etc.),
  "movement": exact name of the lift (e.g. "Romanian Deadlift", "Incline Barbell Press", etc.),
  "confidence": 0–100
}
"""

    try:
        start = time.time()
        response = openai.ChatCompletion.create(
            model=model,
            temperature=0,
            max_tokens=500,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful AI fitness assistant."
                },
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

        message = response["choices"][0]["message"]["content"].strip()
        print(f"⏱️ GPT response time: {round(time.time() - start, 2)} sec")
        print("🧠 Raw GPT reply:", message)

        json_start = message.find('{')
        json_end = message.rfind('}') + 1

        if json_start == -1 or json_end <= json_start:
            raise ValueError("GPT did not return valid JSON")

        parsed = json.loads(message[json_start:json_end])

        # ✅ Ensure all expected fields are present
        parsed["movement"] = parsed.get("movement") or "Unknown"
        parsed["equipment"] = parsed.get("equipment") or "Unknown"
        parsed["confidence"] = parsed.get("confidence", 0)

        return parsed

    except json.JSONDecodeError as e:
        print("❌ JSON decode error:", str(e))
        return {
            "movement": "Unknown",
            "equipment": "Unknown",
            "confidence": 0,
            "error": f"Failed to parse JSON: {str(e)}"
        }

    except Exception as e:
        print("❌ OpenAI API error:", str(e))
        return {
            "movement": "Unknown",
            "equipment": "Unknown",
            "confidence": 0,
            "error": str(e)
        }
