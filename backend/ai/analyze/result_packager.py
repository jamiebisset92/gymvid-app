import json
import numpy as np

def _convert_numpy(obj):
    """Helper function to convert NumPy data types to native Python types."""
    if isinstance(obj, np.generic):
        return obj.item()
    return obj

def package_result(rep_data, exercise_prediction, weight_estimation, coaching_feedback=None):
    """
    Packages the analysis results into a single serializable dictionary.
    
    Args:
        rep_data (list): List of rep information.
        exercise_prediction (dict): Parsed exercise prediction from GPT.
        weight_estimation (dict): Barbell or machine weight prediction.
        coaching_feedback (dict, optional): Optional feedback section.
        
    Returns:
        dict: Cleaned and serialized output ready for response.
    """
    result = {
        "rep_data": rep_data,
        "exercise_prediction": exercise_prediction,
        "weight_estimation": weight_estimation
    }

    if coaching_feedback:
        result["coaching_feedback"] = coaching_feedback

    return json.loads(json.dumps(result, default=_convert_numpy))
