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
            "movement": "Unknown Exercise",
            "equipment": "Unknown",
            "confidence": 0,
            "error": f"Failed to read image: {str(e)}"
        }

    print("📸 Sending image for prediction...")
    print(f"🖼️ Base64 size: {len(b64)} chars")
    print(f"🤖 GPT model: {model}")

    prompt = """
You are an expert fitness AI.

You are analyzing a 2x2 collage of gym video keyframes. Identify the most likely exercise being performed.

Your task:
- Determine the exact exercise name
- Identify the equipment used
- Specify variation if visible (e.g. Incline, Sumo, Romanian, etc.)
- Estimate confidence level (0–100)

⚠️ Always respond in **this strict JSON format** — no commentary:

{
  "equipment": one of ["Barbell", "Dumbbell", "Kettlebell", "Cable", "Pin-Loaded Machine", "Plate-Loaded Machine", "Bodyweight", "Resistance Band"],
  "movement_pattern": one of ["Push - Horizontal", "Push - Vertical", "Push - Incline", "Pull - Horizontal", "Pull - Vertical", "Squat", "Hinge", "Isolation", "Core", "Carry"],
  "variation": (if applicable — e.g. "Incline", "Seated", "Sumo", "Zercher", etc.),
  "movement": exact name like "Incline Barbell Press", "Romanian Deadlift", "Cable Face Pull", etc.,
  "confidence": 0–100
}

Analyze this image and reply with ONLY valid JSON.
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

        # ✅ Extract valid JSON object
        json_start = message.find('{')
        json_end = message.rfind('}') + 1

        if json_start == -1 or json_end <= json_start:
            raise ValueError("GPT did not return valid JSON")

        parsed = json.loads(message[json_start:json_end])

        # ✅ Auto-correct fallback
        if "movement" not in parsed:
            parsed["movement"] = f"{parsed.get('variation', '')} {parsed.get('equipment', '')} Exercise".strip()

        return parsed

    except json.JSONDecodeError as e:
        print("❌ JSON decode error:", str(e))
        return {
            "movement": "Unknown Exercise",
            "equipment": "Unknown",
            "confidence": 0,
            "error": f"Failed to parse JSON: {str(e)}"
        }

    except Exception as e:
        print("❌ OpenAI API error:", str(e))
        return {
            "movement": "Unknown Exercise",
            "equipment": "Unknown",
            "confidence": 0,
            "error": str(e)
        }
