#!/usr/bin/env python3
import os
import sys
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add backend to path
sys.path.append(os.path.abspath("."))

from backend.ai.analyze.video_analysis import analyze_video
from backend.ai.analyze.rep_detection import run_rep_detection_from_landmark_y
from backend.ai.analyze.coaching_feedback import generate_feedback

def test_feedback_generation():
    video_path = "/Users/stephaniesanzo/Documents/Jamie_Deadlift.mov"
    
    if not os.path.exists(video_path):
        print(f"Error: Video not found at {video_path}")
        return
    
    try:
        # Step 1: Analyze video
        print("Step 1: Analyzing video...")
        video_data = analyze_video(video_path)
        print(f"✅ Video analysis complete:")
        print(f"   - FPS: {video_data.get('fps')}")
        print(f"   - Best landmark: {video_data.get('best_landmark')}")
        print(f"   - Raw Y data points: {len(video_data.get('raw_y', []))}")
        
        # Step 2: Detect reps
        print("\nStep 2: Detecting reps...")
        rep_data = run_rep_detection_from_landmark_y(
            video_data["raw_y"], video_data["fps"]
        )
        print(f"✅ Rep detection complete:")
        print(f"   - Found {len(rep_data)} reps")
        if rep_data:
            print(f"   - First rep: {rep_data[0]}")
        
        # Step 3: Generate feedback
        print("\nStep 3: Generating feedback...")
        feedback = generate_feedback(
            video_path=video_path,
            user_id="test-user-id",
            video_data={"predicted_exercise": "Barbell Deadlift"},
            rep_data=rep_data
        )
        print(f"✅ Feedback generated:")
        print(f"   - Form rating: {feedback.get('form_rating')}")
        print(f"   - Observations: {len(feedback.get('observations', []))}")
        print(f"   - Summary: {feedback.get('summary')}")
        
    except Exception as e:
        print(f"\n❌ Error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_feedback_generation() 