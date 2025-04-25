import os
import json
from openai import OpenAI
from dotenv import load_dotenv

# ✅ Load environment variables
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_feedback(video_data, rep_data):
    exercise_name = video_data.get("predicted_exercise", "an exercise")

    prompt = f"""
You are a highly experienced lifting coach. A user has uploaded a video of themselves performing: {exercise_name}.

Here is the data extracted from their reps:

{json.dumps(rep_data, indent=2)}

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
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a professional lifting coach."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=500,
    )

    try:
        content = response.choices[0].message.content
        parsed = json.loads(content)
        return parsed["coaching_feedback"]
    except Exception as e:
        return {
            "summary": "Feedback could not be generated.",
            "technical_tips": [],
            "tempo_guidance": "",
            "motivation": f"An error occurred: {str(e)}"
        }
