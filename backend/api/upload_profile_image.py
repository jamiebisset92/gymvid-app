from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import os
import uuid
import shutil
from typing import Optional
import aiofiles
from datetime import datetime

# Import your Supabase client if needed for additional operations
# from config.supabase import supabase_client

router = APIRouter()

# Configure upload directory
UPLOAD_DIR = "uploads/profiles"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Configure allowed image types
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}

def is_valid_image(filename: str) -> bool:
    """Check if the file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@router.post("/upload/profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    """
    Upload a profile image and return the URL.
    
    Args:
        file: The image file to upload
        user_id: The Supabase user ID
    
    Returns:
        JSON response with the image URL
    """
    try:
        # Check if file is an image
        if not is_valid_image(file.filename):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        
        # Get file extension
        file_ext = file.filename.split('.')[-1].lower()
        
        # Create unique filename
        unique_filename = f"{user_id}-{uuid.uuid4()}.{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Check file size (max 3MB)
        MAX_SIZE = 3 * 1024 * 1024  # 3MB in bytes
        
        # Save uploaded file
        async with aiofiles.open(file_path, 'wb') as out_file:
            # Read file in chunks to handle large files efficiently
            content = await file.read(MAX_SIZE + 1)  # Read slightly more to check if it exceeds
            
            # Check if file exceeds size limit
            if len(content) > MAX_SIZE:
                raise HTTPException(
                    status_code=413, 
                    detail="File too large. Maximum size is 3MB"
                )
            
            await out_file.write(content)
        
        # Generate the URL for the image
        # In a production environment, this would be the URL of your storage service
        # For example, if using AWS S3, Cloudinary, or your own CDN
        image_url = f"/static/profiles/{unique_filename}"
        
        # You could also update the Supabase user profile directly from here if needed
        # This would require your Supabase credentials in this service
        
        # Return success response with image URL
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Profile image uploaded successfully",
                "image_url": image_url,
                "timestamp": datetime.now().isoformat()
            }
        )
    
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        # Log the error
        print(f"Error uploading profile image: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error uploading profile image: {str(e)}"
        )
