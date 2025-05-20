from datetime import datetime

def calculate_age_category(dob_str: str) -> str:
    """
    Calculate age category based on date of birth (formatted as 'YYYY-MM-DD').
    """
    dob = datetime.strptime(dob_str, "%Y-%m-%d")
    today = datetime.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    if 13 <= age <= 19:
        return "Teen"
    elif 20 <= age <= 23:
        return "Junior"
    elif 24 <= age <= 39:
        return "Open"
    elif 40 <= age <= 49:
        return "Masters 1"
    elif 50 <= age <= 59:
        return "Masters 2"
    elif 60 <= age <= 69:
        return "Masters 3"
    else:
        return "Masters 4"

def calculate_weight_class(weight: float, gender: str, unit_pref: str = "kg") -> str:
    """
    Assign a user to a weight class based on gender, weight, and unit preference.
    - Converts lb to kg if necessary.
    - Returns weight class string.
    """

    # Convert to kg if weight is in pounds
    if unit_pref.lower() == "lb":
        weight_kg = weight * 0.453592
    else:
        weight_kg = weight

    gender = gender.lower()

    if gender == "male":
        if weight_kg < 60:
            return "<60kg"
        elif weight_kg < 67:
            return "60–67kg"
        elif weight_kg < 75:
            return "67–75kg"
        elif weight_kg < 82:
            return "75–82kg"
        elif weight_kg < 90:
            return "82–90kg"
        elif weight_kg < 100:
            return "90–100kg"
        elif weight_kg < 110:
            return "100–110kg"
        elif weight_kg < 125:
            return "110–125kg"
        elif weight_kg < 140:
            return "125–140kg"
        else:
            return "140kg+"

    elif gender == "female":
        if weight_kg < 50:
            return "<50kg"
        elif weight_kg < 57:
            return "50–57kg"
        elif weight_kg < 65:
            return "57–65kg"
        elif weight_kg < 72:
            return "65–72kg"
        elif weight_kg < 80:
            return "72–80kg"
        elif weight_kg < 90:
            return "80–90kg"
        elif weight_kg < 100:
            return "90–100kg"
        else:
            return "100kg+"

    return "Unknown"
