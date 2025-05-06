from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional
import os
import shutil

from backend.utils.save_set_to_supabase import supabase
from backend.utils.aws_utils import upload_file_to_s3
from backend.utils.generate_thumbnail import generate_thumbnail

router = APIRouter()

@router.post("/manual_log")
async def manual_log(
    user_id: Optional[str] = Form(None),  # ✅ Now optional
    movement: str = Form(...),
    equipment: str = Form(...),
    weight: float = Form(...),
    weight_unit: str = Form(...),
    reps: int = Form(...),
    rpe: Optional[float] = Form(None),
    rir: Optional[float] = Form(None),
    video: Optional[UploadFile] = File(None)
):
    # ✅ Provide fallback for dev
    if not user_id:
        if os.getenv("GYMVID_ENV") == "dev":
            user_id = "94f88c41-2dbe-47f3-b7c1-95ffbb374b61"  # Dev UUID
        else:
            return JSONResponse(status_code=400, content={"success": False, "error": "Missing user_id"})

    os.makedirs("temp_uploads", exist_ok=True)

    video_url = None
    thumbnail_url = None

    if video:
        temp_video_path = f"temp_uploads/{video.filename}"
        with open(temp_video_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)

        s3_key = f"manual_logs/videos/{video.filename}"
        if upload_file_to_s3(temp_video_path, s3_key):
            video_url = f"https://{os.getenv('S3_BUCKET_NAME')}.s3.amazonaws.com/{s3_key}"

        thumb_path = f"temp_uploads/{video.filename}_thumb.jpg"
        if generate_thumbnail(temp_video_path, thumb_path):
            thumb_key = f"manual_logs/thumbnails/{video.filename}_thumb.jpg"
            if upload_file_to_s3(thumb_path, thumb_key):
                thumbnail_url = f"https://{os.getenv('S3_BUCKET_NAME')}.s3.amazonaws.com/{thumb_key}"
            if os.path.exists(thumb_path):
                os.remove(thumb_path)

        if os.path.exists(temp_video_path):
            os.remove(temp_video_path)

    weight_kg = weight if weight_unit.lower() == "kg" else round(weight * 0.453592, 2)

    try:
        insert_result = supabase.table("manual_logs").insert({
            "user_id": user_id,
            "movement": movement,
            "equipment": equipment,
            "weight_kg": weight_kg,
            "weight_unit": weight_unit.lower(),
            "reps": reps,
            "video_url": video_url,
            "thumbnail_url": thumbnail_url,
            "rpe": rpe,
            "rir": rir
        }).execute()

        return JSONResponse({
            "success": True,
            "video_url": video_url,
            "thumbnail_url": thumbnail_url,
            "data": insert_result.data[0]
        })

    except Exception as e:
        return JSONResponse(status_code=500, content={
            "success": False,
            "error": str(e),
            "video_url": video_url,
            "thumbnail_url": thumbnail_url
        })
