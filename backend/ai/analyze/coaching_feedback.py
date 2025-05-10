# backend/ai/analyze/coaching_feedback.py

import os
import json
import re
import numpy as np
from openai import OpenAI
from dotenv import load_dotenv

# ✅ Load environment variables
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

IS_SUBPROCESS = os.getenv("GYMVID_MODE") == "subprocess"

def convert_numpy(obj):
    if isinstance(obj, np.generic):
        return obj.item()
    return obj

def extract_json_block(text):
    match = re.search(r"```json\s*(.*?)```", text, re.DOTALL)
    return match.group(1).strip() if match else text.strip()

def compress_rep_data(rep_data):
    return [
        {
            "rep": rep.get("rep"),
            "duration_sec": rep.get("duration_sec"),
            "estimated_RPE": rep.get("estimated_RPE"),
            "estimated_RIR": rep.get("estimated_RIR")
        }
        for rep in rep_data
    ]

def generate_feedback(video_data, rep_data):
    exercise_name = video_data.get("predicted_exercise", "an exercise")
    compressed_reps = compress_rep_data(rep_data)
    rep_data_serialized = json.dumps(compressed_reps, indent=2, default=convert_numpy)

    prompt = f"""
You are a highly experienced lifting coach. A user uploaded a video of themselves performing: {exercise_name}.

Here is the rep data:

{rep_data_serialized}

Please follow this exact format and return JSON only:

{{
  "coaching_feedback": {{
    "form_rating": integer (1–10),
    "observations": [
      {{
        "👀 Observation": "Start with an insight like 'It looks like you're...', etc. No emoji inside.",
        "🧠 Tip": "Give a helpful cue like 'Try to...', etc. No emoji inside.",
        "👉 Summary": "Encouraging 1–3 sentence summary. No emoji inside."
      }}
    ]
  }}
}}

Rules:
- Do NOT include emojis in the values — they are in the keys only.
- Do NOT mention injury or safety unless essential.
- Do NOT include any extra commentary or preamble — just JSON.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a professional lifting coach."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,
        )

        raw_text = response.choices[0].message.content
        if not IS_SUBPROCESS:
            print("🧠 Raw GPT Coaching Response:\n", raw_text)

        json_text = extract_json_block(raw_text)
        parsed = json.loads(json_text)
        return parsed["coaching_feedback"]

    except Exception as e:
        if not IS_SUBPROCESS:
            print("❌ Coaching GPT parsing error:", str(e))
        return {
            "form_rating": 0,
            "observations": [{
                "👀 Observation": "Unable to evaluate form due to error.",
                "🧠 Tip": "Try uploading a different video or check your form manually.",
                "👉 Summary": f"Something went wrong generating your feedback: {str(e)}"
            }]
        }
