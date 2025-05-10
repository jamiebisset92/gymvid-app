from fastapi import APIRouter
from pydantic import BaseModel
from backend.utils.download_from_s3 import download_video_from_url
from backend.ai.analyze.video_analysis import analyze_video
from backend.ai.analyze.rep_detection import run_rep_detection_from_landmark_y
from backend.ai.analyze.keyframe_exporter import export_keyframes
from backend.ai.analyze.coaching_feedback import generate_feedback

router = APIRouter()

class FeedbackRequest(BaseModel):
    user_id: str
    movement: str
    video_url: str

@router.post("/analyze/feedback")
async def analyze_feedback(request: FeedbackRequest):
    try:
        # ✅ Step 1: Download video from S3
        video_path = download_video_from_url(request.video_url)

        # ✅ Step 2: Run MediaPipe analysis
        video_data = analyze_video(video_path)  # returns raw_y and fps

        # ✅ Step 3: Detect reps from landmark motion
        rep_data = run_rep_detection_from_landmark_y(video_data["raw_y"], video_data["fps"])

        # ✅ Step 4: Optionally extract keyframes (for visual QA or logging)
        export_keyframes(video_path, rep_data)

        # ✅ Step 5: Generate GPT-based form feedback
        feedback = generate_feedback(
            video_data={ "predicted_exercise": request.movement },
            rep_data=rep_data
        )

        return { "success": True, "feedback": feedback }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "feedback": {
                "form_rating": 0,
                "observations": [{
                    "observation": "👀 We couldn't process your video.",
                    "tip": "🧠 Try uploading a different angle or clearer rep.",
                    "summary": f"👉 Error: {str(e)}"
                }]
            }
        }
