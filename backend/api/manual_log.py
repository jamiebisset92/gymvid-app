from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional
import os
import shutil
import json
from backend.utils.supabase_client import supabase  # ✅ Assuming client ready
from backend.utils.aws_utils import upload_file_to_s3  # ✅ Assuming uploader ready

router = APIRouter()

@router.post("/analyze/manual_log")
async def manual_log(
    movement: str = Form(...),
    equipment: str = Form(...),
    weight: float = Form(...),
    weight_unit: str = Form(...),  # "kg" or "lb"
    rpe: Optional[float] = Form(None),
    rir: Optional[float] = Form(None),
    reps: int = Form(...),
    video: Optional[UploadFile] = File(None)
):
    os.makedirs("temp_uploads", exist_ok=True)

    video_url = None

    if video:
        # ✅ Save temp video
        temp_video_path = f"temp_uploads/{video.filename}"
        with open(temp_video_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)

        # ✅ Upload to S3
        s3_key = f"manual_logs/videos/{video.filename}"
        upload_success = upload_file_to_s3(temp_video_path, s3_key)

        if upload_success:
            video_url = f"https://{os.getenv('S3_BUCKET_NAME')}.s3.amazonaws.com/{s3_key}"
        
        os.remove(temp_video_path)

    # ✅ Always convert weight to kg if needed
    weight_kg = weight
    if weight_unit.lower() == "lb":
        weight_kg = round(weight * 0.453592, 2)  # lb to kg conversion

    # ✅ Insert into Supabase
    insert_payload = {
        "movement": movement,
        "equipment": equipment,
        "weight_kg": weight_kg,
        "weight_unit": weight_unit.lower(),
        "rpe": rpe,
        "rir": rir,
        "reps": reps,
        "video_url": video_url
    }

    insert_result = supabase.table("manual_logs").insert(insert_payload).execute()

    if insert_result.error:
        return JSONResponse(status_code=500, content={"success": False, "error": str(insert_result.error)})

    return JSONResponse({
        "success": True,
        "data": insert_result.data[0]
    })
