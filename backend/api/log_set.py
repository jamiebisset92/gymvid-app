from fastapi import APIRouter, UploadFile, Form
from typing import Optional
import json
import shutil
import os

from backend.ai.analyze import analyze_set  # ✅ Import your existing logic

router = APIRouter()

@router.post("/log_set")
async def log_set(
    video: UploadFile,
    user_provided_exercise: Optional[str] = Form(None),
    known_exercise_info: Optional[str] = Form(None)
):
    # Save uploaded video temporarily
    temp_video_path = f"temp_videos/{video.filename}"
    os.makedirs(os.path.dirname(temp_video_path), exist_ok=True)
    
    with open(temp_video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    # Prepare arguments
    args = [temp_video_path]
    if user_provided_exercise:
        args.append(user_provided_exercise)
    if known_exercise_info:
        args.append(known_exercise_info)

    # Run Analyze Set
    final_result = analyze_set.run_cli_args(args)

    # Delete temp video after processing
    os.remove(temp_video_path)

    return final_result
