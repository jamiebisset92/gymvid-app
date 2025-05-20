def compress_rep_data_for_gpt(rep_data: list, feedback_depth: str = "standard") -> list:
    summaries = []

    for rep in rep_data:
        rep_num = rep.get("rep")
        rpe = rep.get("estimated_RPE")
        stall = rep.get("velocity_stall", False)
        rom = rep.get("range_of_motion_cm")
        smooth = rep.get("smoothness_score")
        path = rep.get("path_deviation_cm")
        asym = rep.get("asymmetry_score")
        tempo = rep.get("tempo", {})
        concentric = tempo.get("concentric_sec", 0)
        eccentric = tempo.get("eccentric_sec", 0)

        summary = f"Rep {rep_num}:"

        if feedback_depth == "simple":
            if stall:
                summary += " Minor stall detected mid-rep."
            elif smooth < 85:
                summary += " Slightly inconsistent tempo."
            else:
                summary += " Solid execution with good control."

        elif feedback_depth == "standard":
            summary += f" RPE {rpe}, ROM {rom}cm, smoothness {smooth}/100."
            if stall:
                summary += " Sticking point mid-concentric."
            if path and path > 3.0:
                summary += f" Drifted laterally ({path}cm)."
            if asym is not None and asym < 85:
                summary += f" Asymmetry score low ({asym}/100)."

        elif feedback_depth == "advanced":
            summary += (
                f" Tempo – Concentric: {concentric:.2f}s, Eccentric: {eccentric:.2f}s. "
                f"ROM: {rom}cm. Smoothness: {smooth}/100. RPE: {rpe}. "
            )
            if stall:
                summary += "Velocity dipped (possible sticking point). "
            if path is not None:
                summary += f"Path deviation: {path}cm. "
            if asym is not None:
                summary += f"Asymmetry: {asym}/100."

        summaries.append(summary.strip())

    return summaries
