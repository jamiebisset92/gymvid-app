import boto3
import os
import subprocess
from botocore.exceptions import BotoCoreError, ClientError

# Load environment variables
AWS_REGION = os.getenv("AWS_REGION")
S3_BUCKET = os.getenv("S3_BUCKET_NAME")

# Initialize S3 client
s3 = boto3.client(
    "s3",
    region_name=AWS_REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

def upload_file_to_s3(local_path, s3_key):
    """
    Uploads a file to S3 and returns the URL.
    """
    try:
        if not S3_BUCKET:
            raise ValueError("S3_BUCKET_NAME environment variable not set")
        if not AWS_REGION:
            raise ValueError("AWS_REGION environment variable not set")
            
        print(f"🔄 Attempting to upload {local_path} to s3://{S3_BUCKET}/{s3_key}")
        
        s3.upload_file(
            Filename=local_path,
            Bucket=S3_BUCKET,
            Key=s3_key
        )
        
        # Return the S3 URL
        s3_url = f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
        print(f"✅ Uploaded to {s3_url}")
        return s3_url
    except (BotoCoreError, ClientError) as e:
        print(f"❌ S3 Upload failed: {e}")
        raise e
    except Exception as e:
        print(f"❌ Unexpected error during S3 upload: {e}")
        raise e

def download_file_from_s3(s3_key, local_path):
    """
    Downloads a file from S3 to a local path.
    """
    try:
        s3.download_file(S3_BUCKET, s3_key, local_path)
        print(f"✅ Downloaded from s3://{S3_BUCKET}/{s3_key}")
        return True
    except (BotoCoreError, ClientError) as e:
        print(f"❌ Download failed: {e}")
        return False

def generate_thumbnail_with_rotation_fix(video_path, thumbnail_path):
    """
    Generates a thumbnail from the video with proper orientation using ffmpeg.
    """
    try:
        # Auto-rotate based on iPhone metadata and extract the first frame
        command = [
            "ffmpeg",
            "-i", video_path,
            "-vf", "transpose=1",  # Auto-rotation workaround (may use transpose or auto-orient)
            "-frames:v", "1",
            "-q:v", "2",
            thumbnail_path
        ]
        subprocess.run(command, check=True)
        print(f"✅ Thumbnail generated: {thumbnail_path}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Thumbnail generation failed: {e}")
        return False

# ✅ Updated: Upload in-memory file object without using ACLs (for ACL-disabled buckets)
def upload_fileobj_to_s3(file_obj, s3_key, content_type="image/jpeg", public=True):
    """
    Uploads an in-memory file-like object (e.g., UploadFile) to S3.
    """
    try:
        print(f"🔄 Attempting upload to S3: bucket={S3_BUCKET}, key={s3_key}, content_type={content_type}")
        s3.upload_fileobj(
            Fileobj=file_obj,
            Bucket=S3_BUCKET,
            Key=s3_key,
            ExtraArgs={
                "ContentType": content_type  # ✅ ACL removed for compatibility
            }
        )
        print(f"✅ Upload successful: s3://{S3_BUCKET}/{s3_key}")
        return f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
    except (BotoCoreError, ClientError) as e:
        print(f"❌ Upload failed: {e}")
        return None
