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

# ✅ Subprocess mode check
IS_SUBPROCESS = os.getenv("GYMVID_MODE") == "subprocess"

# ✅ Safe conversion of NumPy types
def convert_numpy(obj):
    if isinstance(obj, np.generic):
        return obj.item()
    return obj

# ✅ Extract clean JSON from GPT block
def extract_json_block(text):
    match = re.search(r"```json\n(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()

# ✅ Generate coaching feedback
def generate_feedback(video_data, rep_data):
    exercise_name = video_data.get("predicted_exercise", "an exercise")
    rep_data_serialized = json.dumps(rep_data, indent=2, default=convert_numpy)

    prompt = f"""
You are a highly experienced lifting coach. A user has uploaded a video of themselves performing: {exercise_name}.

Here is the data extracted from their reps:

{rep_data_serialized}

Please follow this format and return JSON only:

{{
  "coaching_feedback": {{
    "form_rating": integer from 1 to 10 based on these guidelines:
      10 = textbook form
      9 = extremely good form – only 1 suggested point of improvement
      8 = good form – only 2 suggested points of improvement
      7 = ok form – 3 suggested points of improvement
      6 = fair form – 4 suggested points of improvement
      5 = bad form – VERY noticeable risk of injury (only if significant),

    "observations": [
      {{
        "observation": "👀 Start with an observation like 'I can see that...', 'It looks like you're...', etc.",
        "tip": "🧠 Follow with a coaching cue like 'Try and think about...', 'Next time, be sure to...', etc.",
        "summary": "👉 End with a 1–3 sentence summary that is encouraging, casual, and humanlike."
      }}
    ]
  }}
}}

Rules:
- Do NOT mention safety unless absolutely necessary.
- DO NOT fearmonger.
- Focus on performance benefits. E.g., instead of saying 'avoid injury', say 'this will help improve posture and allow more weight to be lifted.'
- Avoid repeating phrasing in tips or observations.
- Only provide advice that is necessary, not excessive.
- Do NOT include any text outside the JSON block.
"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a professional lifting coach."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=800,
    )

    try:
        raw_text = response.choices[0].message.content
        if not IS_SUBPROCESS:
            print("🧠 Raw GPT Coaching Response:\n", raw_text)

        json_text = extract_json_block(raw_text)
        parsed = json.loads(json_text)
        return parsed["coaching_feedback"]

    except Exception as e:
        return {
            "form_rating": 0,
            "observations": [{
                "observation": "👀 Unable to evaluate form due to error.",
                "tip": "🧠 Please try uploading a different video or check your form manually.",
                "summary": f"👉 Something went wrong generating your feedback: {str(e)}"
            }]
        }
