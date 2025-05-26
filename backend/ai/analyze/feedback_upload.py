from fastapi import APIRouter, UploadFile, File, Form
from backend.ai.analyze.coaching_feedback import generate_feedback
from backend.ai.analyze.video_analysis import analyze_video
from backend.ai.analyze.rep_detection import run_rep_detection_from_landmark_y
import tempfile
import shutil
import os

router = APIRouter()

@router.post("/feedback_upload")
async def feedback_upload(
    video: UploadFile = File(...),
    user_id: str = Form(...),
    movement: str = Form(...)
):
    try:
        # ✅ Save uploaded video to a temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            shutil.copyfileobj(video.file, tmp)
            tmp_path = tmp.name

        # ✅ Analyze video and generate rep data
        video_data = analyze_video(tmp_path)
        rep_data = run_rep_detection_from_landmark_y(
            video_data["raw_y"], video_data["fps"]
        )

        # ✅ Generate coaching feedback
        feedback = generate_feedback(
            video_path=tmp_path,
            user_id=user_id,
            video_data={ "predicted_exercise": movement },
            rep_data=rep_data
        )

        return { "success": True, "feedback": feedback }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

    finally:
        # ✅ Clean up temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
