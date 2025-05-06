import boto3
import os
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
    Uploads a file to S3 with public read access.
    """
    try:
        s3.upload_file(
            Filename=local_path,
            Bucket=S3_BUCKET,
            Key=s3_key,
            ExtraArgs={"ACL": "public-read"}  # ✅ Required for public URLs
        )
        print(f"✅ Uploaded to s3://{S3_BUCKET}/{s3_key}")
        return True
    except (BotoCoreError, ClientError) as e:
        print(f"❌ Upload failed: {e}")
        return False

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
