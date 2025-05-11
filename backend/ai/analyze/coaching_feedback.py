import os
import json
import re
import numpy as np
from openai import OpenAI
from dotenv import load_dotenv

# ✅ Load environment variables
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ✅ Subprocess flag
IS_SUBPROCESS = os.getenv("GYMVID_MODE") == "subprocess"

def convert_numpy(obj):
    if isinstance(obj, np.generic):
        return obj.item()
    return obj

def extract_json_block(text):
    match = re.search(r"```json\s*(.*?)```", text, re.DOTALL)
    return match.group(1).strip() if match else text.strip()

def compress_rep_data(rep_data):
    simplified = []
    for rep in rep_data:
        simplified.append({
            "rep": rep.get("rep"),
            "duration_sec": rep.get("duration_sec"),
            "estimated_RPE": rep.get("estimated_RPE"),
            "estimated_RIR": rep.get("estimated_RIR")
        })
    return simplified

def calculate_tut_and_rpe(rep_data):
    total_tut = sum([rep.get("duration_sec", 0) for rep in rep_data])
    last_rpe = rep_data[-1].get("estimated_RPE", None) if rep_data else None
    return round(total_tut, 2), last_rpe

def generate_feedback(video_data, rep_data):
    exercise_name = video_data.get("predicted_exercise", "an exercise")
    compressed_reps = compress_rep_data(rep_data)
    rep_data_serialized = json.dumps(compressed_reps, indent=2, default=convert_numpy)
    total_tut, last_rpe = calculate_tut_and_rpe(rep_data)

    prompt = f"""
You are a highly experienced lifting coach. A user has uploaded a video of themselves performing: {exercise_name}.

Here is the data extracted from their reps:

{rep_data_serialized}

Please return your response in the following JSON format — and use only plain text, no emojis or decorative characters:

{{
  "coaching_feedback": {{
    "form_rating": integer (1–10),
    "observations": [
      {{
        "observation": "Your first point here.",
        "tip": "Your tip for this observation."
      }},
      {{
        "observation": "Second insight here.",
        "tip": "Second coaching tip."
      }}
    ],
    "summary": "End with a short wrap-up that encourages the user and affirms their efforts."
  }}
}}

Rules:
- Do NOT include emojis. We'll handle that in the frontend.
- Avoid mentioning injury or safety unless critically necessary.
- Focus on cues that help improve performance and movement quality.
- Keep language encouraging, human, and efficient.
- ❌ Only return valid JSON. No markdown or explanation.
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

        result = parsed["coaching_feedback"]
        result["total_tut"] = total_tut
        result["rpe"] = last_rpe
        return result

    except Exception as e:
        if not IS_SUBPROCESS:
            print("❌ Coaching GPT parsing error:", str(e))
        return {
            "form_rating": 0,
            "rpe": None,
            "total_tut": None,
            "observations": [{
                "observation": "Unable to evaluate form due to error.",
                "tip": "Try uploading a different video or review your form manually."
            }],
            "summary": f"Something went wrong generating your feedback: {str(e)}"
        }
