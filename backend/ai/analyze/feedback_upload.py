from fastapi import APIRouter, UploadFile, File, Form
from backend.ai.analyze.coaching_feedback import generate_feedback
from backend.ai.analyze.video_analysis import analyze_video
from backend.ai.analyze.rep_detection import run_rep_detection_from_landmark_y
from backend.ai.analyze.keyframe_collage import export_keyframe_collages
from backend.ai.analyze.fallback_keyframes import export_static_keyframe_collage
from backend.utils.aws_utils import upload_file_to_s3

import os
import logging
import traceback
import asyncio
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

router = APIRouter()
executor = ThreadPoolExecutor(max_workers=2)

# Use mounted disk path for large temporary files
DISK_BASE_PATH = "/mnt/data"

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
        if not video.filename:
            return {"success": False, "error": "No video file provided", "error_type": "invalid_input"}

        if not user_id or not movement:
            return {"success": False, "error": "Missing required parameters: user_id or movement", "error_type": "invalid_input"}

        video_data = await video.read()

        MAX_FILE_SIZE = 200 * 1024 * 1024
        if len(video_data) > MAX_FILE_SIZE:
            logger.warning(f"Video file too large: {len(video_data) / 1024 / 1024:.2f}MB")
            return {"success": False, "error": "Video file is too large. Please use a video under 200MB.", "error_type": "file_too_large"}

        os.makedirs(DISK_BASE_PATH, exist_ok=True)
        tmp_path = os.path.join(DISK_BASE_PATH, f"upload_{user_id}_{video.filename}")
        with open(tmp_path, "wb") as f:
            f.write(video_data)

        logger.info(f"Video saved to: {tmp_path}")
        logger.info(f"File size: {os.path.getsize(tmp_path)} bytes")

        # Step 1: Analyze video
        try:
            loop = asyncio.get_event_loop()
            video_data = await loop.run_in_executor(executor, analyze_video, tmp_path)
            logger.info(f"Video analysis complete. FPS: {video_data.get('fps')}, Best landmark: {video_data.get('best_landmark')}")
            logger.info(f"Raw Y points: {len(video_data.get('raw_y', []))}")
        except Exception as video_error:
            logger.error(f"Video analysis failed: {str(video_error)}")
            return {"success": False, "error": f"Video analysis failed: {str(video_error)}", "error_type": "video_analysis_failed"}

        # Step 2: Rep detection
        rep_data = None
        try:
            rep_data = await loop.run_in_executor(
                executor, run_rep_detection_from_landmark_y,
                video_data["raw_y"], video_data["fps"]
            )
            if rep_data and isinstance(rep_data, list):
                logger.info(f"Detected {len(rep_data)} reps")
            else:
                logger.warning("Rep detection returned empty or invalid format")
                rep_data = None
        except Exception as rep_error:
            logger.warning(f"[⚠️] Rep detection failed: {str(rep_error)}")
            rep_data = None

        # Step 3: Generate keyframe collages and upload to S3
        try:
            if isinstance(rep_data, list) and len(rep_data) > 0:
                try:
                    local_collages = await loop.run_in_executor(
                        executor, export_keyframe_collages, tmp_path, rep_data
                    )
                    logger.info(f"Generated {len(local_collages)} collages from rep data")
                except Exception as collage_error:
                    logger.warning(f"Failed to generate rep-based collages: {str(collage_error)}")
                    local_collages = [await loop.run_in_executor(
                        executor, export_static_keyframe_collage, tmp_path
                    )]
            else:
                logger.info("Using fallback keyframe due to missing rep data")
                local_collages = [await loop.run_in_executor(
                    executor, export_static_keyframe_collage, tmp_path
                )]

            collage_paths = []
            for local_path in local_collages:
                filename = os.path.basename(local_path)
                s3_key = f"collages/{user_id}/{filename}"
                s3_url = upload_file_to_s3(local_path, s3_key)
                collage_paths.append(s3_url)

        except Exception as keyframe_error:
            logger.error(f"Keyframe generation failed: {str(keyframe_error)}")
            return {"success": False, "error": "Failed to generate or upload keyframe collage.", "error_type": "keyframe_generation_failed"}

        # Step 4: Generate coaching feedback
        try:
            feedback = await loop.run_in_executor(
                executor, generate_feedback,
                tmp_path, user_id,
                {
                    "predicted_exercise": movement,
                    "feedback_depth": "standard",
                    "collage_urls": collage_paths
                },
                rep_data
            )
        except Exception as feedback_error:
            logger.error(f"Feedback generation failed: {str(feedback_error)}")
            return {
                "success": False,
                "error": f"AI feedback generation failed: {str(feedback_error)}",
                "error_type": "feedback_generation_failed"
            }

        if not feedback or not isinstance(feedback, dict):
            logger.error("Feedback response is invalid or not a dictionary")
            return {"success": False, "error": "AI did not return valid feedback.", "error_type": "invalid_feedback_structure"}

        logger.info("✅ Coaching feedback successfully generated.")
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
            try:
                logger.info(f"Cleaning up temp file: {tmp_path}")
                os.remove(tmp_path)
            except Exception as cleanup_error:
                logger.warning(f"Failed to cleanup temp file: {cleanup_error}")
