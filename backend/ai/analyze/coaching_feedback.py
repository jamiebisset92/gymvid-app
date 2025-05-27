import os
import json
import re
import traceback
import numpy as np
from dotenv import load_dotenv
from anthropic import Anthropic
from backend.ai.analyze.keyframe_collage import export_keyframe_collages
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
    logger.info(f"rep_data: {rep_data[:2] if rep_data else 'None'}...")  # Log first 2 reps
    
    try:
        # Validate inputs
        if not video_path or not os.path.exists(video_path):
            logger.error(f"Video path invalid or doesn't exist: {video_path}")
            raise ValueError(f"Video path invalid or doesn't exist: {video_path}")
            
        if not video_data:
            logger.error("video_data is None or empty")
            raise ValueError("video_data is None or empty")
            
        if not rep_data or len(rep_data) == 0:
            logger.warning("rep_data is empty - no reps detected")
            raise ValueError("No reps detected in the video")
            
        if not client:
            logger.error("Claude client not initialized - API key missing")
            raise ValueError("Claude API key not configured")
        
        # Step 1: Collage Generation
        logger.info("Step 1: Starting collage generation...")
        collage_paths = export_keyframe_collages(video_path, rep_data)
        logger.info(f"Collage paths generated: {collage_paths}")
        collage_urls = []

        for i, path in enumerate(collage_paths):
            logger.info(f"Uploading collage {i+1}/{len(collage_paths)}: {path}")
            s3_url = upload_file_to_s3(
                file_path=path,
                s3_path=f"collages/{user_id}/{os.path.basename(path)}"
            )
            logger.info(f"Collage uploaded to S3: {s3_url}")
            collage_urls.append(s3_url)

        # Step 2: GPT Prompt Construction
        logger.info("Step 2: Constructing prompt...")
        exercise_name = video_data.get("predicted_exercise", "an exercise")
        logger.info(f"Exercise name: {exercise_name}")
        
        feedback_depth = video_data.get("feedback_depth", "standard")
        logger.info(f"Feedback depth: {feedback_depth}")
        
        total_tut, last_rpe = calculate_tut_and_rpe(rep_data)
        logger.info(f"Total TUT: {total_tut}s, Last RPE: {last_rpe}")
        
        rep_summaries = compress_rep_data_for_gpt(rep_data, feedback_depth)
        summaries_text = "\n".join(rep_summaries)
        logger.info(f"Rep summaries generated: {len(rep_summaries)} summaries")
        logger.debug(f"Rep summaries text:\n{summaries_text}")

        collage_descriptions = "\n".join([
    f"- First collage shows reps 1–4: {collage_urls[0]}" if len(collage_urls) >= 1 else "",
    f"- Second collage shows the final rep: {collage_urls[1]}" if len(rep_data) <= 7 and len(collage_urls) == 2 else "",
    f"- Second collage shows the last 4 reps: {collage_urls[1]}" if len(rep_data) > 7 and len(collage_urls) == 2 else ""
])
        logger.info(f"Collage descriptions:\n{collage_descriptions}")

        prompt = f"""
Human:
You're a professional lifting coach who provides clear, helpful, and friendly coaching feedback.

A user just submitted a set of **{exercise_name}**. Below are the summaries of each rep:
{summaries_text}

They also submitted up to 2 collage images showing 3 keyframes per rep:
{collage_descriptions}

Please:
- Share a brief, general comment about their technique
- Offer up to 4 specific coaching observations with actionable tips (fewer if not needed)
- When relevant, reference the rep number (e.g. "In rep 3, the bar path shifts forward...")
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

        logger.info(f"Prompt length: {len(prompt)} characters")
        logger.debug(f"Full prompt:\n{prompt[:500]}...")  # Log first 500 chars

        # Step 3: Claude API Call
        logger.info(f"Step 3: Calling Claude API with model {MODEL_NAME}...")
        response = client.messages.create(
            model=MODEL_NAME,
            max_tokens=1000,
            temperature=0.4,
            system="You are a world-class strength coach.",
            messages=[{"role": "user", "content": prompt}]
        )

        text = response.content[0].text
        logger.info(f"Claude response received, length: {len(text)} characters")
        logger.debug(f"Claude raw response:\n{text}")
        
        if not IS_SUBPROCESS:
            print("\U0001f9e0 Claude Coaching Response:\n", text)

        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            logger.error(f"No JSON found in Claude response: {text}")
            raise ValueError("No valid JSON found in Claude response")
            
        json_text = match.group(0)
        logger.info(f"Extracted JSON from response: {json_text[:200]}...")
        
        parsed = json.loads(json_text)
        logger.info(f"Successfully parsed JSON response")
        
        result = parsed["coaching_feedback"]
        result["total_tut"] = total_tut
        result["rpe"] = last_rpe
        
        logger.info(f"=== GENERATE_FEEDBACK SUCCESS ===")
        logger.info(f"Form rating: {result.get('form_rating')}")
        logger.info(f"Number of observations: {len(result.get('observations', []))}")
        
        return result

    except Exception as e:
        logger.error(f"=== GENERATE_FEEDBACK ERROR ===")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error message: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        
        if not IS_SUBPROCESS:
            print("❌ Claude coaching error:", str(e))
            traceback.print_exc()

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
