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

# ✅ Safely convert NumPy types
def convert_numpy(obj):
    if isinstance(obj, np.generic):
        return obj.item()
    return obj

# ✅ Extract valid JSON from GPT block
def extract_json_block(text):
    match = re.search(r"```json\s*(.*?)```", text, re.DOTALL)
    return match.group(1).strip() if match else text.strip()

# ✅ Simplify rep data to avoid token overload
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

# ✅ Main feedback generator
def generate_feedback(video_data, rep_data):
    exercise_name = video_data.get("predicted_exercise", "an exercise")
    compressed_reps = compress_rep_data(rep_data)
    rep_data_serialized = json.dumps(compressed_reps, indent=2, default=convert_numpy)

    prompt = f"""
You are a highly experienced lifting coach. A user has uploaded a video of themselves performing: {exercise_name}.

Here is the data extracted from their reps:

{rep_data_serialized}

Please return your response in the following JSON format — and use only plain text, no emojis or decorative characters:

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
        "observation": "Start with an insight like 'I can see that...', 'It looks like you're...', etc.",
        "tip": "Follow with a coaching cue like 'Try and think about...', 'Next time, be sure to...', etc.",
        "summary": "End with a short wrap-up (1–3 sentences) that feels encouraging and natural."
      }}
    ]
  }}
}}

Important:
- ❌ Do NOT include emojis in the output. We will add them in the frontend headers.
- ❌ Do NOT include any text or formatting outside of the JSON block.
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
                "observation": "Unable to evaluate form due to error.",
                "tip": "Please try uploading a different video or check your form manually.",
                "summary": f"Something went wrong generating your feedback: {str(e)}"
            }]
        }
