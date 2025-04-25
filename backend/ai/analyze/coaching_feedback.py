import os
import json
import re
import numpy as np
from openai import OpenAI
from dotenv import load_dotenv

# ✅ Load environment variables
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ✅ Convert NumPy types for safe JSON serialization
def convert_numpy(obj):
    if isinstance(obj, np.generic):
        return obj.item()
    return obj

# ✅ Extract clean JSON from GPT response (even inside ```json ... ```)
def extract_json_block(text):
    match = re.search(r"```json\n(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()

# ✅ Main feedback generation function
def generate_feedback(video_data, rep_data):
    exercise_name = video_data.get("predicted_exercise", "an exercise")
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

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a professional lifting coach."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=500,
    )

    try:
        raw_text = response.choices[0].message.content
        print("🧠 Raw GPT Coaching Response:\n", raw_text)
        json_text = extract_json_block(raw_text)
        parsed = json.loads(json_text)
        return parsed["coaching_feedback"]
    except Exception as e:
        return {
            "summary": "Feedback could not be generated.",
            "technical_tips": [],
            "tempo_guidance": "",
            "motivation": f"An error occurred: {str(e)}"
        }
