from fastapi import APIRouter, UploadFile, Form
from typing import Optional
import json
import shutil
import os

from backend.ai.analyze import analyze_set  # ✅ Analyze script
from backend.utils.save_set_to_supabase import save_set_to_supabase  # ✅ Save into Supabase

router = APIRouter()

@router.post("/analyze/log_set")
async def log_set(
    video: UploadFile,
    user_provided_exercise: Optional[str] = Form(None),
    known_exercise_info: Optional[str] = Form(None)
):
    # Save uploaded video temporarily
    temp_video_path = f"temp_uploads/{video.filename}"
    os.makedirs(os.path.dirname(temp_video_path), exist_ok=True)

    with open(temp_video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    try:
        # Prepare arguments
        args = [temp_video_path]
        if user_provided_exercise:
            args.append(user_provided_exercise)
        if known_exercise_info:
            args.append(known_exercise_info)

        # Run Analyze Set
        final_result = analyze_set.run_cli_args(args)

        # ✅ Save to Supabase
        save_set_to_supabase(final_result)

        return {
            "success": True,
            "data": final_result
        }
    
    finally:
        # Always clean up
        if os.path.exists(temp_video_path):
            os.remove(temp_video_path)
