import numpy as np

def detect_reps(video_data: dict) -> list:
    """
    Detects repetitions using vertical movement of the most active landmark,
    and returns detailed rep data including RPE and TUT.
    
    Args:
        video_data (dict): Output from analyze_video containing raw_y and fps.
        
    Returns:
        list of dicts: Each dict includes rep timing and effort metrics.
    """
    raw_y = np.array(video_data["raw_y"])
    fps = video_data["fps"]

    smooth_y = np.convolve(raw_y, np.ones(5) / 5, mode="valid")
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

    rep_data = []
    rir_lookup = {
        10.0: "(Possibly 0 Reps in the Tank)",
        9.5: "(Possibly 0-1 Reps in the Tank)",
        9.0: "(Possibly 1-2 Reps in the Tank)",
        8.5: "(Possibly 2-3 Reps in the Tank)",
        8.0: "(Possibly 3-4 Reps in the Tank)",
        7.5: "(Possibly 4+ Reps in the Tank)",
        7.0: "(Possibly 5+ Reps in the Tank)"
    }

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

    return rep_data
