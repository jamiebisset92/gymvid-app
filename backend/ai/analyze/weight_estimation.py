from pathlib import Path

script_path = Path("gymvid-app/backend/ai/analyze/weight_estimation.py")

weight_estimation_script = '''\
import os
import base64
import json
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def estimate_weight_from_keyframes(keyframe_dir):
    images = []
    for fname in sorted(os.listdir(keyframe_dir)):
        if fname.endswith(".jpg"):
            with open(os.path.join(keyframe_dir, fname), "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
                images.append({"name": fname, "data": b64})

    messages = [
        {
            "role": "system",
            "content": "You are a fitness AI that analyzes gym lifting images to estimate the weight being lifted."
        },
        {
            "role": "user",
            "content": (
                "Look at these gym lifting images and estimate the total weight or resistance being used.\\n\\n"
                "You must support all equipment types: **Barbell, Dumbbells, Cable, Machines, and Kettlebells**.\\n\\n"
                "Use these guidelines:\\n"
                "- **Barbells**: Assume 20kg bar unless clearly marked otherwise.\\n"
                "- **Dumbbells**: If only one is visible, assume it's one-handed. If two, assume both used.\\n"
                "- **Cables**: Count visible stack markers or pins. Estimate total resistance (in kg).\\n"
                "- **Machines with Plates**: Only count visible plates. Do NOT include the machine's own weight.\\n"
                "- **Kettlebells**: Use color to estimate weight:\\n"
                "    - Pink = 4kg\\n"
                "    - Yellow = 8kg\\n"
                "    - Blue = 12kg\\n"
                "    - Red = 16kg\\n"
                "    - Grey = 20kg\\n"
                "    - Green = 24kg\\n"
                "    - Orange = 28kg\\n\\n"
                "Respond strictly in this format:\\n"
                "- Equipment: [Barbell, Dumbbells, Cable, Machine, Kettlebell, etc]\\n"
                "- Estimated Total Weight: XX kg\\n"
                "- Confidence: XX%"
            )
        }
    ]

    for img in images:
        messages.append({
            "role": "user",
            "content": [{"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img['data']}"}}]
        })

    print("🧠 Calling GPT for weight estimation...")
    response = client.chat.completions.create(
        model="gpt-4-vision-preview",
        messages=messages,
        max_tokens=300
    )

    raw_text = response.choices[0].message.content.strip()
    return {
        "raw_response": raw_text
    }
'''

script_path.write_text(weight_estimation_script)
script_path
