from pathlib import Path

rep_detection_script = '''\
import cv2
import os
import numpy as np
import mediapipe as mp
import json

def detect_reps(video_path: str, keyframe_dir: str = "keyframes") -> dict:
    # ✅ Setup
    cap = cv2.VideoCapture(video_path)
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    os.makedirs(keyframe_dir, exist_ok=True)

    # ✅ Get initial frame to infer shape
    ret, test_frame = cap.read()
    if not ret:
        raise ValueError("Couldn't read video file")
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

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

    # ✅ Collect landmark positions
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
    raw_y = np.array(landmark_positions[best_landmark])
    smooth_y = np.convolve(raw_y, np.ones(5)/5, mode='valid')

    # ✅ Detect reps
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

    # ✅ Build rep data and extract keyframes
    rep_data = []
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
            entry = {
                "rep": idx + 1,
                "start_frame": start,
                "peak_frame": peak,
                "stop_frame": stop,
                "time_sec": round(start / fps, 2),
                "duration_sec": round(duration, 2),
                "total_TUT": total_tut,
                "estimated_RPE": rpe,
                "estimated_RIR": rir_lookup[rpe],
                "keyframes": {}
            }

            for phase, frame_num in zip(["start", "peak", "stop"], [start, peak, stop]):
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
                ret, frame = cap.read()
                if ret:
                    out_path = os.path.join(keyframe_dir, f"rep{idx+1:02d}_{phase}.jpg")
                    cv2.imwrite(out_path, frame)
                    entry["keyframes"][phase] = out_path

            rep_data.append(entry)

    cap.release()
    return {"rep_data": rep_data}
'''

file_path = Path("backend/ai/analyze/rep_detection.py")
file_path.parent.mkdir(parents=True, exist_ok=True)
file_path.write_text(rep_detection_script)
file_path
