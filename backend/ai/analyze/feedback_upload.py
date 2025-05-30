from fastapi import APIRouter, UploadFile, File, Form
from backend.ai.analyze.coaching_feedback import generate_feedback
from backend.ai.analyze.video_analysis import analyze_video
from backend.ai.analyze.rep_detection import run_rep_detection_from_landmark_y
from backend.ai.analyze.keyframe_collage import export_keyframe_collages
from backend.ai.analyze.fallback_keyframes import export_static_keyframe_collage

import tempfile
import shutil
import os
import logging
import traceback

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/feedback_upload")
async def feedback_upload(
    video: UploadFile = File(...),
    user_id: str = Form(...),
    movement: str = Form(...)
):
    logger.info(f"=== FEEDBACK_UPLOAD ENDPOINT CALLED ===")
    logger.info(f"user_id: {user_id}")
    logger.info(f"movement: {movement}")
    logger.info(f"video filename: {video.filename}")
    logger.info(f"video content_type: {video.content_type}")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            shutil.copyfileobj(video.file, tmp)
            tmp_path = tmp.name

        logger.info(f"Video saved to temp path: {tmp_path}")
        logger.info(f"Temp file size: {os.path.getsize(tmp_path)} bytes")

        logger.info("Starting video analysis...")
        video_data = analyze_video(tmp_path)
        logger.info(f"Video analysis complete. FPS: {video_data.get('fps')}, Best landmark: {video_data.get('best_landmark')}")
        logger.info(f"Raw Y data points: {len(video_data.get('raw_y', []))}")

        if video_data.get('raw_y'):
            raw_y = video_data['raw_y']
            logger.info(f"Raw Y stats - min: {min(raw_y):.4f}, max: {max(raw_y):.4f}, range: {max(raw_y) - min(raw_y):.4f}")

        rep_data = None
        try:
            logger.info("Starting rep detection...")
            rep_data = run_rep_detection_from_landmark_y(
                video_data["raw_y"], video_data["fps"]
            )

            if rep_data and isinstance(rep_data, list) and len(rep_data) > 0:
                logger.info(f"Rep detection complete. Found {len(rep_data)} reps")
                logger.debug(f"Rep data sample: {rep_data[:1]}")
            else:
                logger.warning("Rep detection returned empty or invalid format")
                rep_data = None

        except Exception as rep_error:
            logger.warning(f"[⚠️] Rep detection failed with error: {str(rep_error)}")
            logger.warning(f"[⚠️] Rep detection traceback: {traceback.format_exc()}")
            rep_data = None

        if isinstance(rep_data, list) and len(rep_data) > 0:
            try:
                collage_paths = export_keyframe_collages(tmp_path, rep_data)
                logger.info(f"Generated {len(collage_paths)} collages from rep data")
            except Exception as collage_error:
                logger.warning(f"Failed to generate rep-based collages: {str(collage_error)}")
                fallback_path = export_static_keyframe_collage(tmp_path)
                collage_paths = [fallback_path]
        else:
            logger.info("Using fallback keyframes due to no valid rep data")
            fallback_path = export_static_keyframe_collage(tmp_path)
            collage_paths = [fallback_path]

        if not collage_paths or not os.path.exists(collage_paths[0]):
            return {
                "success": False,
                "error": "Failed to generate keyframe collage from video.",
                "error_type": "keyframe_generation_failed"
            }

        logger.info("Starting GPT-4o coaching feedback generation...")
        logger.info(f"Passing rep_data: {rep_data is not None} (has {len(rep_data) if rep_data else 0} reps)")

        feedback = generate_feedback(
            video_path=tmp_path,
            user_id=user_id,
            video_data={
                "predicted_exercise": movement,
                "feedback_depth": "standard"
            },
            rep_data=rep_data
        )

        if not feedback or not isinstance(feedback, dict):
            logger.error("Feedback response is invalid or not a dictionary")
            return {
                "success": False,
                "error": "AI did not return valid feedback.",
                "error_type": "invalid_feedback_structure"
            }

        logger.info("Coaching feedback generated")
        logger.info(f"Form rating: {feedback.get('form_rating')}")
        logger.info(f"RPE: {feedback.get('rpe')}, TUT: {feedback.get('total_tut')}")

        if feedback.get('form_rating', 0) == 0:
            logger.warning("Feedback generation returned with form_rating of 0, indicating an error")
            if "configuration error" in feedback.get('summary', '') or "technical issue" in str(feedback.get('observations', [])):
                return {
                    "success": False,
                    "feedback": feedback,
                    "error_type": "feedback_generation_error",
                    "error": "Failed to generate proper coaching feedback"
                }

        return {
            "success": True,
            "feedback": feedback,
            "movement": movement
        }

    except Exception as e:
        logger.error("=== FEEDBACK_UPLOAD ERROR ===")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error message: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")

        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "traceback": traceback.format_exc()
        }

    finally:
        if tmp_path and os.path.exists(tmp_path):
            logger.info(f"Cleaning up temp file: {tmp_path}")
            os.remove(tmp_path)
