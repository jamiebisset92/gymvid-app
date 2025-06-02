from fastapi import APIRouter, UploadFile, File, Form
from backend.ai.analyze.coaching_feedback import generate_feedback
from backend.ai.analyze.video_analysis import analyze_video
from backend.ai.analyze.rep_detection import run_rep_detection_from_landmark_y
from backend.ai.analyze.keyframe_collage import export_keyframe_collages
from backend.ai.analyze.fallback_keyframes import export_static_keyframe_collage

import os
import logging
import traceback
import asyncio
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from typing import Optional
import tempfile
import aioboto3

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

router = APIRouter()
executor = ThreadPoolExecutor(max_workers=4)
AWS_REGION = os.getenv("AWS_REGION")
S3_BUCKET = os.getenv("S3_BUCKET_NAME")

@router.post("/feedback_upload")
async def feedback_upload(
    video: UploadFile = File(...),
    user_id: str = Form(...),
    movement: str = Form(...)
):
    logger.info("=== FEEDBACK_UPLOAD ENDPOINT CALLED ===")
    logger.info(f"user_id: {user_id}, movement: {movement}, filename: {video.filename}")

    if not video.filename or not user_id or not movement:
        return {"success": False, "error": "Missing required inputs.", "error_type": "invalid_input"}

    tmp_file = None

    try:
        video_data = await video.read()
        MAX_FILE_SIZE = 200 * 1024 * 1024
        if len(video_data) > MAX_FILE_SIZE:
            return {"success": False, "error": "Video file too large.", "error_type": "file_too_large"}

        tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        tmp_file.write(video_data)
        tmp_file.flush()
        tmp_path = tmp_file.name

        loop = asyncio.get_event_loop()

        # Run video analysis and rep detection in parallel
        video_data_future = loop.run_in_executor(executor, analyze_video, tmp_path)

        async def run_rep_detection_wrapper():
            analyzed = await video_data_future
            return await loop.run_in_executor(
                executor,
                run_rep_detection_from_landmark_y,
                analyzed["raw_y"],
                analyzed["fps"]
            )

        rep_data_future = asyncio.create_task(run_rep_detection_wrapper())

        # Wait for both to complete
        video_data = await video_data_future
        rep_data = await rep_data_future

        if not rep_data or not isinstance(rep_data, list):
            rep_data = []

        # Keyframe generation
        if rep_data:
            try:
                collages = await loop.run_in_executor(executor, export_keyframe_collages, tmp_path, rep_data)
            except Exception:
                logger.warning("Keyframe export failed, using fallback.")
                collages = [await loop.run_in_executor(executor, export_static_keyframe_collage, tmp_path)]
        else:
            collages = [await loop.run_in_executor(executor, export_static_keyframe_collage, tmp_path)]

        # Async S3 Uploads with aioboto3
        async def upload_collage(path):
            session = aioboto3.Session()
            async with session.client("s3", region_name=AWS_REGION) as s3:
                s3_key = f"collages/{user_id}/{os.path.basename(path)}"
                with open(path, "rb") as f:
                    await s3.upload_fileobj(f, S3_BUCKET, s3_key)
                return f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"

        upload_tasks = [upload_collage(c) for c in collages]
        collage_paths = await asyncio.gather(*upload_tasks)

        # Generate coaching feedback
        feedback = await loop.run_in_executor(
            executor,
            generate_feedback,
            tmp_path,
            user_id,
            {
                "predicted_exercise": movement,
                "feedback_depth": "standard",
                "collage_urls": collage_paths
            },
            rep_data
        )

        if not feedback or not isinstance(feedback, dict):
            return {"success": False, "error": "AI returned invalid feedback.", "error_type": "invalid_feedback"}

        logger.info("✅ Coaching feedback generated successfully.")
        return {"success": True, "feedback": feedback, "movement": movement}

    except Exception as e:
        logger.error("=== FEEDBACK_UPLOAD ERROR ===")
        logger.error(f"{type(e).__name__}: {str(e)}")
        logger.error(traceback.format_exc())
        return {"success": False, "error": str(e), "error_type": type(e).__name__, "traceback": traceback.format_exc()}

    finally:
        if tmp_file:
            try:
                tmp_file.close()
                os.remove(tmp_file.name)
            except Exception as cleanup_error:
                logger.warning(f"Failed to delete temp file: {cleanup_error}")
