import os
import json
import re
import traceback
import numpy as np
from dotenv import load_dotenv
from anthropic import Anthropic
from backend.ai.analyze.keyframe_collage import export_keyframe_collages
from backend.ai.analyze.fallback_keyframes import export_static_keyframe_collage
from backend.utils.aws_utils import upload_file_to_s3
import logging

# ✅ Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ✅ Load environment variables and Claude client
load_dotenv()
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY")
client = Anthropic(api_key=CLAUDE_API_KEY) if CLAUDE_API_KEY else None
MODEL_NAME = os.getenv("GYMVID_AI_MODEL", "claude-3-haiku-20240307")
IS_SUBPROCESS = os.getenv("GYMVID_MODE") == "subprocess"

logger.info(f"Coaching feedback module initialized - Claude API Key present: {bool(CLAUDE_API_KEY)}, Model: {MODEL_NAME}")

# ----------------------
# 📊 Rep Data Formatting
# ----------------------
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


# -----------------------------
# 🎓 Claude Coaching Generator
# -----------------------------
def generate_feedback(video_path, user_id, video_data, rep_data) -> dict:
    logger.info(f"=== GENERATE_FEEDBACK CALLED ===")
    logger.info(f"video_path: {video_path}")
    logger.info(f"user_id: {user_id}")
    logger.info(f"video_data keys: {list(video_data.keys()) if video_data else 'None'}")
    logger.info(f"video_data: {video_data}")
    logger.info(f"rep_data length: {len(rep_data) if rep_data else 0}")
    logger.info(f"rep_data: {rep_data[:2] if rep_data else 'None'}...")

    try:
        if not video_path or not os.path.exists(video_path):
            raise ValueError("Video path invalid or doesn't exist")
        if not video_data:
            raise ValueError("video_data is None or empty")
        if not client:
            raise ValueError("Claude API key not configured")

        exercise_name = video_data.get("predicted_exercise", "an exercise")
        feedback_depth = video_data.get("feedback_depth", "standard")

        if rep_data:
            collage_paths = export_keyframe_collages(video_path, rep_data)
            total_tut, last_rpe = calculate_tut_and_rpe(rep_data)
            rep_summaries = compress_rep_data_for_gpt(rep_data, feedback_depth)
        else:
            collage_paths = [export_static_keyframe_collage(video_path)]
            total_tut, last_rpe = "N/A", "N/A"
            rep_summaries = ["Repetition data was not detected for this video."]

        collage_urls = []
        for path in collage_paths:
            s3_url = upload_file_to_s3(
                local_path=path,
                s3_key=f"collages/{user_id}/{os.path.basename(path)}"
            )
            collage_urls.append(s3_url)

        collage_descriptions = "\n".join([
            f"- Collage: {url}" for url in collage_urls
        ])

        summaries_text = "\n".join(rep_summaries)

        prompt = f"""
Human:
You're a professional lifting coach who provides clear, helpful, and friendly coaching feedback.

A user just submitted a set of **{exercise_name}**. Below are the summaries of each rep:
{summaries_text}

They also submitted keyframe collage images:
{collage_descriptions}

Please:
- Share a brief, general comment about their technique
- Offer up to 4 specific coaching observations with actionable tips (fewer if not needed)
- When relevant, reference the rep number (e.g. \"In rep 3, the bar path shifts forward...\")
- Use plain, confident language (avoid sounding robotic or over-enthusiastic)
- Keep it supportive — this is someone who wants to improve
- Return only a valid JSON object (no Markdown, no extra text)

Format:
{{
  "coaching_feedback": {{
    "form_rating": integer (1–10),
    "observations": [
      {{ "observation": "...", "tip": "..." }}
      // Up to 4 total
    ],
    "summary": "A closing note of encouragement or a reminder of what to focus on."
  }}
}}

A:
""".strip()

        response = client.messages.create(
            model=MODEL_NAME,
            max_tokens=1000,
            temperature=0.4,
            system="You are a world-class strength coach.",
            messages=[{"role": "user", "content": prompt}]
        )

        text = response.content[0].text
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise ValueError("No valid JSON found in Claude response")

        parsed = json.loads(match.group(0))
        result = parsed["coaching_feedback"]
        result["total_tut"] = total_tut
        result["rpe"] = last_rpe

        return result

    except Exception as e:
        logger.error(f"=== GENERATE_FEEDBACK ERROR ===")
        logger.error(f"Error: {str(e)}")
        logger.error(f"Traceback:\n{traceback.format_exc()}")

        return {
            "form_rating": 0,
            "rpe": None,
            "total_tut": None,
            "observations": [{
                "observation": "Unable to generate feedback due to a technical issue.",
                "tip": "Please try uploading a different video or try again later."
            }],
            "summary": "We hit a snag processing your feedback — but we're working on it!"
        }
