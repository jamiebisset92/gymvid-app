from fastapi import APIRouter, UploadFile, Form
from typing import Optional
import json
import shutil
import os

from backend.ai.analyze import analyze_set  # ✅ Analyze script
from backend.utils.save_set_to_supabase import save_set_to_supabase  # ✅ Save into Supabase
from backend.utils.aws_utils import upload_file_to_s3  # ✅ Upload to S3
from backend.utils.generate_thumbnail import generate_thumbnail  # ✅ Generate thumbnail

router = APIRouter()

@router.post("/analyze/log_set")
async def log_set(
    user_id: str = Form(...),  # ✅ NEW - user_id required
    video: UploadFile = UploadFile(...),
    user_provided_exercise: Optional[str] = Form(None),
    known_exercise_info: Optional[str] = Form(None)
):
    temp_video_path = f"temp_uploads/{video.filename}"
    os.makedirs(os.path.dirname(temp_video_path), exist_ok=True)

    with open(temp_video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    try:
        # ✅ Run Analyze Set
        args = [temp_video_path]
        if user_provided_exercise:
            args.append(user_provided_exercise)
        if known_exercise_info:
            args.append(known_exercise_info)

        final_result = analyze_set.run_cli_args(args)

        # ✅ Attach user_id
        final_result["user_id"] = user_id

        # ✅ Generate thumbnail
        video_filename = os.path.splitext(os.path.basename(temp_video_path))[0]
        thumbnail_path = f"temp_uploads/{video_filename}_thumb.jpg"
        thumbnail_success = generate_thumbnail(temp_video_path, thumbnail_path)

        if thumbnail_success:
            s3_thumbnail_key = f"manual_logs/thumbnails/{video_filename}_thumb.jpg"
            upload_file_to_s3(thumbnail_path, s3_thumbnail_key)
            thumbnail_url = f"https://gymvid-user-uploads.s3.amazonaws.com/{s3_thumbnail_key}"
            final_result["thumbnail_url"] = thumbnail_url

        # ✅ Save to Supabase
        save_set_to_supabase(final_result)

        return {
            "success": True,
            "data": final_result
        }

    finally:
        if os.path.exists(temp_video_path):
            os.remove(temp_video_path)
        if os.path.exists(thumbnail_path):
            os.remove(thumbnail_path)
