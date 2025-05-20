# backend/api/upload_profile_image.py

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from utils.aws_utils import upload_fileobj_to_s3
import uuid
from datetime import datetime

router = APIRouter()

# Allowed image extensions
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
MAX_SIZE = 3 * 1024 * 1024  # 3MB

def is_valid_image(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@router.post("/upload/profile-image")
async def upload_profile_image(file: UploadFile = File(...), user_id: str = Form(...)):
    try:
        if not is_valid_image(file.filename):
            raise HTTPException(status_code=400, detail="Only image files are allowed")

        # Read content for size check
        content = await file.read(MAX_SIZE + 1)
        if len(content) > MAX_SIZE:
            raise HTTPException(status_code=413, detail="File too large. Max is 3MB")

        # Reset file pointer after reading
        file.file.seek(0)

        # Generate unique filename
        file_ext = file.filename.rsplit('.', 1)[1].lower()
        key = f"profile_images/{user_id}/{uuid.uuid4()}.{file_ext}"

        # Upload to S3
        image_url = upload_fileobj_to_s3(file.file, key, content_type=file.content_type)

        if not image_url:
            raise HTTPException(status_code=500, detail="Failed to upload to S3")

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Profile image uploaded to S3 successfully",
                "image_url": image_url,
                "timestamp": datetime.now().isoformat()
            }
        )

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
