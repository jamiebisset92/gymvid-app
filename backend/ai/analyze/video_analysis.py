from pathlib import Path

# Define the new analyze/video_analysis.py script content with mandatory keyframe saving
video_analysis_script = '''\
import sys
import cv2
import numpy as np
import os
import json
import mediapipe as mp
from dotenv import load_dotenv

# ✅ Load environment variables
load_dotenv()

# ✅ Detect if running in subprocess mode
is_subprocess = os.getenv("GYMVID_MODE") == "subprocess"

def log(msg):
    if not is_subprocess:
        print(msg)

# ✅ Accept video path
if len(sys.argv) > 1:
    video_path = sys.argv[1]
else:
    raise ValueError("No video path provided")

# ✅ Check file
if not os.path.exists(video_path):
    raise FileNotFoundError(f"Video not found: {video_path}")

# ✅ Load video
cap = cv2.VideoCapture(video_path)
fps = int(cap.get(cv2.CAP_PROP_FPS))
log(f"🎥 FPS: {fps}")

ret, test_frame = cap.read()
if not ret:
    raise ValueError("Couldn't read video")
cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

# ✅ Track landmarks
frame_height, frame_width = test_frame.shape[:2]
mp_pose = mp.solutions.pose
landmark_dict = {
    "left_wrist": mp_pose.PoseLandmark.LEFT_WRIST,
    "right_wrist": mp_pose.PoseLandmark.RIGHT_WRIST,
    "left_ankle": mp_pose.PoseLandmark.LEFT_ANKLE,
    "right_ankle": mp_pose.PoseLandmark.RIGHT_ANKLE,
    "hip": mp_pose.PoseLandmark.LEFT_HIP,
    "head": mp_pose.PoseLandmark.NOSE
}
landmark_positions = {k: [] for k in landmark_dict}
with mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(image)
        if results.pose_landmarks:
            for name, lm in landmark_dict.items():
                landmark_positions[name].append(results.pose_landmarks.landmark[lm].y)
cap.release()

# ✅ Pick best tracking landmark
total_displacements = {k: np.sum(np.abs(np.diff(v))) for k, v in landmark_positions.items() if len(v) > 1}
best_landmark = max(total_displacements, key=total_displacements.get)
log(f"📍 Best Landmark: {best_landmark}")
raw_y = np.array(landmark_positions[best_landmark])

# ✅ Smooth + detect reps
smooth_y = np.convolve(raw_y, np.ones(5)/5, mode='valid')
rep_frames = []
state = "down"
threshold = 0.003

for i in range(1, len(smooth_y)):
    if state == "down" and smooth_y[i] > smooth_y[i - 1] + threshold:
        state = "up"
        rep_frames.append({"start": i})
    elif state == "up" and smooth_y[i] < smooth_y[i - 1] - threshold:
        state = "down"
        if rep_frames and "peak" not in rep_frames[-1]:
            peak = np.argmax(smooth_y[rep_frames[-1]["start"]:i]) + rep_frames[-1]["start"]
            rep_frames[-1]["peak"] = peak
            rep_frames[-1]["stop"] = i

# ✅ Build rep data and save keyframes
rep_data = []
keyframe_dir = "keyframes"
os.makedirs(keyframe_dir, exist_ok=True)
cap = cv2.VideoCapture(video_path)

for idx, rep in enumerate(rep_frames):
    if "start" in rep and "peak" in rep and "stop" in rep:
        start, peak, stop = rep["start"], rep["peak"], rep["stop"]
        duration = abs(peak - start) / fps
        concentric = duration
        eccentric = concentric * 1.2
        total_tut = round(concentric + eccentric, 2)
        if duration >= 3.50:
            rpe = 10.0
        elif duration >= 3.00:
            rpe = 9.5
        elif duration >= 2.50:
            rpe = 9.0
        elif duration >= 2.00:
            rpe = 8.5
        elif duration >= 1.50:
            rpe = 8.0
        elif duration >= 1.00:
            rpe = 7.5
        else:
            rpe = 7.0
        rir_lookup = {
            10.0: "(Possibly 0 Reps in the Tank)",
            9.5: "(Possibly 0-1 Reps in the Tank)",
            9.0: "(Possibly 1-2 Reps in the Tank)",
            8.5: "(Possibly 2-3 Reps in the Tank)",
            8.0: "(Possibly 3-4 Reps in the Tank)",
            7.5: "(Possibly 4+ Reps in the Tank)",
            7.0: "(Possibly 5+ Reps in the Tank)"
        }
        rep_data.append({
            "rep": idx + 1,
            "start_frame": start,
            "peak_frame": peak,
            "stop_frame": stop,
            "time_sec": round(start / fps, 2),
            "duration_sec": round(duration, 2),
            "total_TUT": total_tut,
            "estimated_RPE": rpe,
            "estimated_RIR": rir_lookup[rpe]
        })
        for phase, frame_num in zip(["start", "peak", "stop"], [start, peak, stop]):
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            ret, frame = cap.read()
            if ret:
                out_path = os.path.join(keyframe_dir, f"rep{idx+1:02d}_{phase}.jpg")
                cv2.imwrite(out_path, frame)
cap.release()

# ✅ Output results
final_output = json.loads(json.dumps({"rep_data": rep_data}, default=lambda o: o.item() if isinstance(o, np.generic) else o))

if is_subprocess:
    sys.stdout = open(1, 'w')
    print(json.dumps(final_output))
    sys.exit(0)
else:
    print(json.dumps(final_output, indent=2))
'''

# Define the path and write the script
script_path = Path("gymvid-app/backend/ai/analyze/video_analysis.py")
script_path.parent.mkdir(parents=True, exist_ok=True)
script_path.write_text(video_analysis_script)

# Return the path for confirmation
script_path
