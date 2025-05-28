import numpy as np
import logging

logger = logging.getLogger(__name__)

def run_rep_detection_from_landmark_y(
    raw_y: list,
    fps: float,
    raw_x: list = None,
    raw_left_y: list = None,
    raw_right_y: list = None
) -> list:
    raw_y = np.array(raw_y)
    if len(raw_y) < 5:
        logger.warning(f"Not enough data points for rep detection: {len(raw_y)}")
        return []

    # Apply smoothing
    smooth_y = np.convolve(raw_y, np.ones(5) / 5, mode="valid")
    
    # Calculate adaptive threshold based on data range
    data_range = np.max(smooth_y) - np.min(smooth_y)
    base_threshold = 0.003
    adaptive_threshold = max(base_threshold, data_range * 0.01)  # 1% of range minimum
    
    logger.info(f"Rep detection - data range: {data_range:.4f}, using threshold: {adaptive_threshold:.4f}")
    
    rep_frames = []
    state = "down"
    threshold = adaptive_threshold

    for i in range(1, len(smooth_y)):
        if state == "down" and smooth_y[i] > smooth_y[i - 1] + threshold:
            state = "up"
            rep_frames.append({"start": i})
            logger.debug(f"Rep started at frame {i}")
        elif state == "up" and smooth_y[i] < smooth_y[i - 1] - threshold:
            state = "down"
            if rep_frames and "peak" not in rep_frames[-1]:
                peak = np.argmax(smooth_y[rep_frames[-1]["start"]:i]) + rep_frames[-1]["start"]
                rep_frames[-1]["peak"] = peak
                rep_frames[-1]["stop"] = i
                logger.debug(f"Rep completed - start: {rep_frames[-1]['start']}, peak: {peak}, stop: {i}")

    logger.info(f"Found {len(rep_frames)} potential reps")

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
            segment = smooth_y[start:stop]

            # ✅ Skip short segments (less than 0.5 seconds)
            min_duration = 0.5  # seconds
            if (stop - start) / fps < min_duration:
                logger.debug(f"Skipping rep {idx+1} - too short ({(stop - start) / fps:.2f}s)")
                continue

            duration = abs(stop - start) / fps
            first_delta = smooth_y[peak] - smooth_y[start]
            concentric_first = first_delta > 0

            try:
                velocities = np.gradient(segment)
                abs_velocities = np.abs(velocities)
            except Exception as e:
                logger.warning(f"Failed to calculate velocities for rep {idx+1}: {str(e)}")
                continue

            pause_idx = np.argmin(abs_velocities)
            pause_duration_frames = 3
            pause_start = max(pause_idx - pause_duration_frames // 2, 0)
            pause_end = min(pause_start + pause_duration_frames, len(segment))

            if concentric_first:
                time_concentric = (peak - start) / fps
                time_pause = (stop - peak) / fps
                time_eccentric = 0.0
            else:
                time_eccentric = (peak - start) / fps
                time_pause = (stop - peak) / fps
                time_concentric = 0.0

            velocity_variance = np.var(velocities)
            smoothness_score = max(0, 100 - (velocity_variance * 10000))
            smoothness_score = round(min(smoothness_score, 100), 2)
            rom = round(abs(np.max(segment) - np.min(segment)) * 100, 2)

            concentric_velocities = abs_velocities[pause_end:]
            stall = False
            if len(concentric_velocities) >= 3:
                peak_velocity = np.max(concentric_velocities[:2])
                mid_velocity = np.min(concentric_velocities[1:-1])
                if peak_velocity > 0 and (mid_velocity / peak_velocity) < 0.5:
                    stall = True

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

            rep_result = {
                "rep": idx + 1,
                "start_frame": start,
                "peak_frame": peak,
                "stop_frame": stop,
                "time_sec": round(start / fps, 2),
                "duration_sec": round(duration, 2),
                "tempo": {
                    "eccentric_sec": round(time_eccentric, 2),
                    "pause_sec": round(time_pause, 2),
                    "concentric_sec": round(time_concentric, 2)
                },
                "total_TUT": round(duration, 2),
                "estimated_RPE": rpe,
                "estimated_RIR": rir_lookup[rpe],
                "smoothness_score": smoothness_score,
                "range_of_motion_cm": rom,
                "velocity_stall": stall
            }

            try:
                if raw_x:
                    x_path = np.array(raw_x[start:stop])
                    y_path = np.array(raw_y[start:stop])
                    horizontal_drift = np.sum(np.abs(np.diff(x_path)))
                    rep_result["path_deviation_cm"] = round(horizontal_drift * 100, 2)
                    rep_result["path_analysis_available"] = True
                else:
                    rep_result["path_deviation_cm"] = None
                    rep_result["path_analysis_available"] = False
            except Exception:
                rep_result["path_deviation_cm"] = None
                rep_result["path_analysis_available"] = False

            try:
                if raw_left_y and raw_right_y:
                    left = np.array(raw_left_y[start:stop])
                    right = np.array(raw_right_y[start:stop])
                    if len(left) == len(right):
                        rom_left = np.max(left) - np.min(left)
                        rom_right = np.max(right) - np.min(right)
                        rom_diff = abs(rom_left - rom_right)
                        sync_diff = np.mean(np.abs(left - right))
                        score = 100 - (rom_diff * 500 + sync_diff * 300)
                        score = round(max(0, min(score, 100)), 2)
                        rep_result["asymmetry_score"] = score
                        rep_result["asymmetry_analysis_available"] = True
                    else:
                        rep_result["asymmetry_score"] = None
                        rep_result["asymmetry_analysis_available"] = False
                else:
                    rep_result["asymmetry_score"] = None
                    rep_result["asymmetry_analysis_available"] = False
            except Exception:
                rep_result["asymmetry_score"] = None
                rep_result["asymmetry_analysis_available"] = False

            rep_data.append(rep_result)

    logger.info(f"Returning {len(rep_data)} valid reps after filtering")
    return rep_data

def detect_reps(video_data: dict) -> list:
    return run_rep_detection_from_landmark_y(
        raw_y=video_data["raw_y"],
        fps=video_data["fps"],
        raw_x=video_data.get("raw_x"),
        raw_left_y=video_data.get("raw_left_y"),
        raw_right_y=video_data.get("raw_right_y")
    )
