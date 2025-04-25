import os
import json
import numpy as np
import sys
from openai import OpenAI
from dotenv import load_dotenv

# ✅ Load environment variables
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ✅ Detect subprocess
IS_SUBPROCESS = os.getenv("GYMVID_MODE") == "subprocess"

# ✅ Helper to safely convert NumPy types
def convert_numpy(obj):
    if isinstance(obj, np.generic):
        return obj.item()
    return obj

def generate_feedback(video_data, rep_data):
    exercise_name = video_data.get("predicted_exercise", "an exercise")

    # ✅ Safely serialize rep_data
    rep_data_serialized = json.dumps(rep_data, indent=2, default=convert_numpy)

    prompt = f"""
You are a highly experienced lifting coach. A user has uploaded a video of themselves performing: {exercise_name}.

Here is the data extracted from their reps:

{rep_data_serialized}

Please provide:
1. Overall summary and encouragement
2. Up to 3 technical tips based on the average rep performance
3. If necessary, a note on tempo or time under tension
4. A motivational closing line

Return the result in **JSON only** using this format:

{{
  "coaching_feedback": {{
    "summary": "...",
    "technical_tips": [
      "Tip 1...",
      "Tip 2...",
      "Tip 3..."
    ],
    "tempo_guidance": "...",
    "motivation": "..."
  }}
}}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a professional lifting coach."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
        )

        content = response.choices[0].message.content

        # ✅ Debug print to stdout or stderr
        debug_log = f"🧠 Raw GPT Coaching Response:\n{content}"
        if IS_SUBPROCESS:
            print(debug_log, file=sys.stderr)
        else:
            print(debug_log)

        parsed = json.loads(content)
        return parsed["coaching_feedback"]

    except Exception as e:
        return {
            "summary": "Feedback could not be generated.",
            "technical_tips": [],
            "tempo_guidance": "",
            "motivation": f"An error occurred: {str(e)}"
        }
