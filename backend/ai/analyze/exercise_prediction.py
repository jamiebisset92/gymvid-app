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

    print("📸 Sending 2x2 collage for prediction.")
    print("🖼️ Image path:", image_path)
    print("🖼️ Image size (bytes):", len(image_data))
    print("🖼️ Base64 size:", len(b64), "characters")
    print(f"🤖 Using Claude model: {model}")

    # ✅ Claude prompt - comprehensive with important guidelines
    prompt = """Look at this 2x2 grid of frames from an exercise video and identify what exercise is being performed.

Focus on:
- Equipment type (barbell, dumbbell, cable, machine, etc.)
- Body position (standing, lying, seated, inclined)
- Movement direction (pressing up/down, pulling, squatting)

Common mistakes to avoid:
- Don't confuse pressing movements (bench press, incline press) with pulling movements (deadlifts, rows)
- Pay attention to whether the person is lying down vs standing
- Look at the direction of movement (pushing away vs pulling towards)
- Notice the angle of the bench (flat vs incline vs decline)
- Check if the bar is in front (squat) or behind (good morning) the neck

Always return a single JSON object with this structure:

{
  "equipment": one of ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell", "Resistance Band", "Smith Machine"],
  "variation": (optional — e.g. "Conventional", "Sumo", "Incline", "Flat", "Decline", "Seated", "Standing"),
  "movement": name of the exercise (be specific - e.g. "Incline Barbell Press" not just "Press"),
  "confidence": integer 0–100
}

Return ONLY the JSON object, no other text."""

    try:
        start = time.time()
        
        # Use the proper format for Claude's vision API
        response = client.messages.create(
            model=model,
            max_tokens=500,
            temperature=0,
            system="You are an expert fitness coach. Identify exercises from video frames and respond only with valid JSON.",
            messages=[
                {
                    "role": "user", 
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": b64
                            }
                        }
                    ]
                }
            ]
        )

        message = response.content[0].text.strip()
        print(f"⏱️ Claude call duration: {round(time.time() - start, 2)} seconds")
        print("🧠 Raw Claude response:", message)
        
        # Try to extract JSON from the response
        # Sometimes Claude adds markdown or extra text
        json_start = message.find('{')
        json_end = message.rfind('}') + 1
        
        if json_start != -1 and json_end > json_start:
            json_str = message[json_start:json_end]
            result = json.loads(json_str)
            
            # Ensure we have a movement field
            if 'movement' not in result:
                print("⚠️ No 'movement' field in response, using equipment + variation")
                equipment = result.get('equipment', 'Unknown')
                variation = result.get('variation', '')
                result['movement'] = f"{variation} {equipment} Exercise".strip()
            
            return result
        else:
            raise ValueError("No valid JSON found in response")

    except json.JSONDecodeError as e:
        print(f"❌ JSON Parse Error: {str(e)}")
        print(f"❌ Failed to parse: {message}")
        return {
            "movement": "Unknown Exercise",
            "equipment": "Unknown",
            "confidence": 0,
            "error": f"JSON parse error: {str(e)}"
        }
    except Exception as e:
        print(f"❌ Claude API Error: {str(e)}")
        return {
            "movement": "Unknown Exercise", 
            "equipment": "Unknown",
            "confidence": 0,
            "error": str(e)
        }
