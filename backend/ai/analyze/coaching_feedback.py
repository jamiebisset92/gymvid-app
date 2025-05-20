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

# ✅ New: Compress raw rep data into coaching summaries
def compress_rep_data_for_gpt(rep_data: list, feedback_depth: str = "standard") -> list:
    summaries = []

    for rep in rep_data:
        rep_num = rep.get("rep")
        rpe = rep.get("estimated_RPE")
        stall = rep.get("velocity_stall", False)
        rom = rep.get("range_of_motion_cm")
        smooth = rep.get("smoothness_score")
        path = rep.get("path_deviation_cm")
        asym = rep.get("asymmetry_score")
        tempo = rep.get("tempo", {})
        concentric = tempo.get("concentric_sec", 0)
        eccentric = tempo.get("eccentric_sec", 0)

        summary = f"Rep {rep_num}:"

        if feedback_depth == "simple":
            if stall:
                summary += " Minor stall detected mid-rep."
            elif smooth and smooth < 85:
                summary += " Slightly inconsistent tempo."
            else:
                summary += " Solid execution with good control."

        elif feedback_depth == "standard":
            summary += f" RPE {rpe}, ROM {rom}cm, smoothness {smooth}/100."
            if stall:
                summary += " Sticking point mid-concentric."
            if path and path > 3.0:
                summary += f" Drifted laterally ({path}cm)."
            if asym is not None and asym < 85:
                summary += f" Asymmetry score low ({asym}/100)."

        elif feedback_depth == "advanced":
            summary += (
                f" Tempo – Concentric: {concentric:.2f}s, Eccentric: {eccentric:.2f}s. "
                f"ROM: {rom}cm. Smoothness: {smooth}/100. RPE: {rpe}. "
            )
            if stall:
                summary += "Velocity dipped (possible sticking point). "
            if path is not None:
                summary += f"Path deviation: {path}cm. "
            if asym is not None:
                summary += f"Asymmetry: {asym}/100."

        summaries.append(summary.strip())

    return summaries

def calculate_tut_and_rpe(rep_data):
    total_tut = sum([rep.get("duration_sec", 0) for rep in rep_data])
    last_rpe = rep_data[-1].get("estimated_RPE", None) if rep_data else None
    return round(total_tut, 2), last_rpe

# ✅ Main GPT feedback generator
def generate_feedback(video_data, rep_data):
    exercise_name = video_data.get("predicted_exercise", "an exercise")
    feedback_depth = video_data.get("feedback_depth", "standard")
    total_tut, last_rpe = calculate_tut_and_rpe(rep_data)

    # 🔄 Use compression layer
    rep_summaries = compress_rep_data_for_gpt(rep_data, feedback_depth)
    summaries_text = "\n".join(rep_summaries)

    prompt = f"""
You are a professional lifting coach. A user submitted a set of {exercise_name}.
They've also provided a keyframe image grid (3x5 layout: each row = one rep, left to right).

Here are the summarized rep observations:
{summaries_text}

Instructions:
- Identify 1 general form comment about the set
- Provide 2 specific, actionable coaching tips
- Return valid JSON (see format below)
- Use plain, confident language
- No emojis

Respond in this JSON format only:
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
    "summary": "Wrap up with encouragement or a focus area."
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
