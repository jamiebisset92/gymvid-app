import os
import json
import traceback
import logging
from dotenv import load_dotenv
from openai import OpenAI

from backend.ai.analyze.keyframe_collage import export_keyframe_collages
from backend.ai.analyze.fallback_keyframes import export_static_keyframe_collage
from backend.utils.aws_utils import upload_file_to_s3

# ✅ Logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ✅ Load environment and init OpenAI
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MODEL_NAME = os.getenv("GYMVID_AI_MODEL", "gpt-4o")

client = OpenAI(api_key=OPENAI_API_KEY)
logger.info(f"Coaching module ready – OpenAI Model: {MODEL_NAME}")

def compress_rep_data_for_gpt(rep_data: list, feedback_depth: str = "standard") -> list:
    summaries = []
    for rep in rep_data:
        rep_num = rep.get("rep")
        rpe = rep.get("estimated_RPE")
        stall = rep.get("velocity_stall", False)
        rom = rep.get("range_of_motion_cm")
        smooth = min(rep.get("smoothness_score", 0), 100)
        path = rep.get("path_deviation_cm", 0)
        asym = rep.get("asymmetry_score", 100)
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

def generate_feedback(video_path, user_id, video_data, rep_data) -> dict:
    try:
        if not video_path or not os.path.exists(video_path):
            raise ValueError("Invalid or missing video path.")

        if not video_data:
            raise ValueError("No video_data provided.")

        exercise_name = video_data.get("predicted_exercise", "an exercise")
        feedback_depth = video_data.get("feedback_depth", "standard")

        if rep_data:
            collage_paths = export_keyframe_collages(video_path, rep_data)
            total_tut, last_rpe = calculate_tut_and_rpe(rep_data)
            rep_summaries = compress_rep_data_for_gpt(rep_data, feedback_depth)
        else:
            collage_paths = [export_static_keyframe_collage(video_path)]
            total_tut, last_rpe = "N/A", "N/A"
            rep_summaries = ["No reps were detected in this video."]

        collage_urls = []
        for path in collage_paths:
            s3_url = upload_file_to_s3(
                local_path=path,
                s3_key=f"collages/{user_id}/{os.path.basename(path)}"
            )
            collage_urls.append(s3_url)

        prompt = f"""
You're a professional lifting coach providing helpful, supportive feedback.

The user just submitted a set of **{exercise_name}**.

Here are their rep summaries:
{chr(10).join(rep_summaries)}

And their form keyframe image links:
{chr(10).join(collage_urls)}

Please:
- Review the **images** for posture, bar path, setup, and joint angles.
- Review the **rep data** for control, RPE, tempo, and consistency.

Then return feedback:
- 1 general comment on form (based on images)
- Up to 4 specific observations + tips
- A closing summary of what to improve or keep doing well

Return JSON only:
{{
  "coaching_feedback": {{
    "form_rating": integer (1–10),
    "observations": [
      {{ "observation": "...", "tip": "..." }}
    ],
    "summary": "..."
  }}
}}
""".strip()

        response = client.chat.completions.create(
            model=MODEL_NAME,
            temperature=0.4,
            max_tokens=1000,
            messages=[
                {"role": "system", "content": "You are a world-class strength coach."},
                {"role": "user", "content": prompt}
            ]
        )

        text = response.choices[0].message.content
        json_start = text.find('{')
        json_end = text.rfind('}')
        if json_start == -1 or json_end == -1:
            raise ValueError("No valid JSON response from GPT")

        parsed = json.loads(text[json_start:json_end + 1])
        result = parsed["coaching_feedback"]
        result["total_tut"] = total_tut
        result["rpe"] = last_rpe

        logger.info("✅ Coaching feedback successfully generated")
        return result

    except Exception as e:
        logger.error(f"❌ Error generating feedback: {e}")
        logger.debug(traceback.format_exc())
        return {
            "form_rating": 0,
            "rpe": None,
            "total_tut": None,
            "observations": [{
                "observation": "Unable to generate feedback due to a technical issue.",
                "tip": "Please try again later or reupload the video."
            }],
            "summary": "We hit a snag while analyzing your form. Thanks for your patience!"
        }
