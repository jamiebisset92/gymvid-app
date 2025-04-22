from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import shutil
import subprocess

# ✅ Load environment variables from .env file
load_dotenv()

# ✅ Initialize FastAPI app
app = FastAPI()

@app.post("/process_set")
async def process_set(
    video: UploadFile = File(...),
    coaching: bool = Form(False)
):
    # ✅ Save uploaded file to a temporary folder
    save_path = f"temp_uploads/{video.filename}"
    os.makedirs("temp_uploads", exist_ok=True)

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    # ✅ Build command to run process_set.py with video path
    cmd = ["python", "backend/ai/process_set.py", save_path]
    if coaching:
        cmd.append("--coach")

    try:
        # ✅ Run script and capture stdout/stderr
        result = subprocess.run(cmd, capture_output=True, text=True)

        return JSONResponse({
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr
        })

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )

# ✅ Optional: test if env variables are loading correctly
@app.get("/debug/env")
def debug_env():
    return {
        "openai": os.getenv("OPENAI_API_KEY") is not None,
        "aws": os.getenv("AWS_ACCESS_KEY_ID") is not None,
        "bucket": os.getenv("S3_BUCKET_NAME"),
    }
