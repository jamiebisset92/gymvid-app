import json
import numpy as np


def convert_numpy(obj):
    if isinstance(obj, np.generic):
        return obj.item()
    return obj


def package_results(rep_data, exercise_prediction, weight_estimation, coaching_feedback=None):
    output = {
        "rep_data": rep_data,
        "exercise_prediction": exercise_prediction,
        "weight_estimation": weight_estimation
    }

    if coaching_feedback:
        output["coaching_feedback"] = coaching_feedback

    # Final conversion to ensure everything is JSON serializable
    return json.loads(json.dumps(output, default=convert_numpy))
