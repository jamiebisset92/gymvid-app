import os
import base64
import json
import re
from openai import OpenAI
from dotenv import load_dotenv

# ✅ Load environment variables and initialize OpenAI client
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ✅ Extract structured JSON block from GPT response
def extract_json_block(text):
    match = re.search(r"```json\n(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()

# ✅ FIXED: Accept 2 arguments now
def estimate_weight_from_keyframes(keyframe_dir, movement_name=None):
    images = []
    for fname in sorted(os.listdir(keyframe_dir)):
        if fname.endswith(".jpg"):
            with open(os.path.join(keyframe_dir, fname), "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
                images.append({"name": fname, "data": b64})

    # ✅ GPT Prompt
    messages = [
        {
            "role": "system",
            "content": "You are a fitness AI that analyzes lifting images to estimate equipment type and total weight lifted."
        },
        {
            "role": "user",
            "content": """
Look at these gym lifting keyframes and estimate the total weight or resistance used.

You must support all equipment types: Barbell, Dumbbells, Cable, Machines, Kettlebells.

Guidelines:
- Barbells: Assume 20kg bar unless clearly marked otherwise.
- Dumbbells: If only one is visible, assume it's one-handed. If two, assume both used.
- Cables: Count visible pins or stack markers.
- Machines: Count visible plates only — ignore machine’s base weight.
- Kettlebells: Estimate based on color if visible (e.g. Red = 16kg, Blue = 12kg).

Respond using strict JSON format:
{
  "equipment": "Barbell",
  "estimated_weight_kg": 260,
  "confidence": 90
}
Do not include any explanation or extra text — only the JSON block.
"""
        }
    ]

    for img in images:
        messages.append({
            "role": "user",
            "content": [{"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img['data']}"}}]
        })

    print("🧠 Calling GPT for weight estimation...")
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=300
    )

    raw_text = response.choices[0].message.content.strip()
    print("📦 Raw GPT Response:\n", raw_text)

    try:
        json_text = extract_json_block(raw_text)
        return json.loads(json_text)
    except Exception as e:
        return {
            "error": "Failed to parse weight estimation",
            "raw_response": raw_text,
            "exception": str(e)
        }
