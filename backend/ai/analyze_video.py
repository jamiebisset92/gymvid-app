import sys
import cv2
import numpy as np
import os
import json
import mediapipe as mp

# ✅ Check if we're in subprocess mode (for FastAPI)
IS_SUBPROCESS = os.getenv("GYMVID_MODE") == "subprocess"

# ✅ Accept video path via CLI
if len(sys.argv) > 1:
    video_path = sys.argv[1]
else:
    video_path = "Jamie_Deadlift.mov"

# ✅ Check video exists
if not os.path.exists(video_path):
    raise FileNotFoundError(f"Video not found: {video_path}")

# ✅ Load video
cap = cv2.VideoCapture(video_path)
fps = int(cap.get(cv2.CAP_PROP_FPS))

ret, test_frame = cap.read()
if not ret:
    raise ValueError("Couldn't read video")

frame_height, frame_width = test_frame.shape[:2]
rotate_video = frame_width > frame_height
cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

# ✅ Output paths
output_base = os.path.splitext(os.path.basename(video_path))[0]
json_path = "ai/outputs/rep_data.json"
keyframe_dir = "ai/outputs"
os.makedirs(keyframe_dir, exist_ok=True)

# ✅ Track landmarks
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

# ✅ Best landmark
total_displacements = {k: np.sum(np.abs(np.diff(v))) for k, v in landmark_positions.items() if len(v) > 1}
best_landmark = max(total_displacements, key=total_displacements.get)
raw_y = np.array(landmark_positions[best_landmark])

# ✅ Detect reps
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

# ✅ Build rep data
rep_data = []
for idx, rep in enumerate(rep_frames):
    if "start" in rep and "peak" in rep and "stop" in rep:
        start = rep["start"]
        peak = rep["peak"]
        stop = rep["stop"]
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

# ✅ Extract keyframes
cap = cv2.VideoCapture(video_path)
for rep in rep_data:
    for phase in ["start", "peak", "stop"]:
        frame_no = rep[f"{phase}_frame"]
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
        ret, frame = cap.read()
        if ret:
            out_path = os.path.join(keyframe_dir, f"rep{rep['rep']:02d}_{phase}.jpg")
            cv2.imwrite(out_path, frame)
cap.release()

# ✅ Exercise prediction (mocked)
exercise_prediction = {
    "exercise": "Barbell Conventional Deadlift",
    "confidence": 95,
    "weight_kg": 260,
    "weight_visibility": 90
}

# ✅ Final output
final_output = {
    "rep_data": rep_data,
    "exercise_prediction": exercise_prediction
}

# ✅ Convert NumPy types to native for JSON
def convert_numpy(obj):
    if isinstance(obj, np.generic):
        return obj.item()
    return obj

final_output = json.loads(json.dumps(final_output, default=convert_numpy))

# ✅ Save to disk (optional for dev)
with open(json_path, "w") as f:
    json.dump(final_output, f, indent=4)

# ✅ Output mode
if IS_SUBPROCESS:
    # Subprocess mode: clean JSON only
    sys.stdout = open(1, 'w')
    print(json.dumps(final_output))
    sys.exit(0)
else:
    # Local CLI mode: show logs
    print(f"\n📊 Summary of Detected Reps:")
    for rep in rep_data:
        print(f"Rep {rep['rep']}: Duration={rep['duration_sec']}s, Estimated RPE={rep['estimated_RPE']}, {rep['estimated_RIR']}, Total TUT={rep['total_TUT']}s")
    print(f"\n🏋️ Exercise Prediction: {exercise_prediction['exercise']} ({exercise_prediction['confidence']}% confidence)")
    print(f"⚖️ Estimated Weight: {exercise_prediction['weight_kg']} kg ({exercise_prediction['weight_visibility']}% visibility)")
