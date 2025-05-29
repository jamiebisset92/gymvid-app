import os
import base64
import json
import time
from dotenv import load_dotenv
from anthropic import Anthropic  # ✅ Correct import for 0.23.0+

# ✅ Load environment variables
load_dotenv()

# ✅ Initialize Claude client
client = Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))

def predict_exercise(image_path: str, model: str = "claude-3-haiku-20240307") -> dict:
    try:
        with open(image_path, "rb") as f:
            image_data = f.read()
            b64 = base64.b64encode(image_data).decode("utf-8")
    except Exception as e:
        print(f"❌ Error reading image file: {str(e)}")
        return {
            "movement": "Unknown Exercise",
            "equipment": "Unknown", 
            "confidence": 0,
            "error": f"Failed to read image: {str(e)}"
        }

    print("📸 Sending 2x2 collage for prediction.")
    print("🖼️ Image path:", image_path)
    print("🖼️ Image size (bytes):", len(image_data))
    print("🖼️ Base64 size:", len(b64), "characters")
    print(f"🤖 Using Claude model: {model}")

    # ✅ Claude prompt - comprehensive with important guidelines
    prompt = """You are an expert exercise physiologist analyzing a 2x2 grid of video frames to identify the specific exercise being performed.

SYSTEMATIC ANALYSIS FRAMEWORK:

1. EQUIPMENT IDENTIFICATION:
   - BARBELL: Long bar (Olympic or standard), usually with plates
   - DUMBBELL: Short handheld weights, one in each hand or single
   - KETTLEBELL: Bell-shaped weight with handle on top
   - CABLE MACHINE: Pulley system with adjustable height, rope/bar/handle attachments
   - PIN-LOADED MACHINE: Weight stack selected by pin (lat pulldown, leg press, chest press)
   - PLATE-LOADED MACHINE: Machine where you load plates manually (hammer strength style)
   - BODYWEIGHT: No external weight, using body resistance only
   - RESISTANCE BAND: Elastic band/tube for resistance

2. BODY POSITION ANALYSIS:
   - STANDING: Upright posture (deadlifts, rows, curls, presses)
   - LYING FLAT: Horizontal on bench (flat bench press, floor press)
   - LYING INCLINED: Angled bench 30-60° (incline press, incline flies)
   - LYING DECLINED: Negative angle bench (decline press)
   - SEATED: Sitting position (seated rows, shoulder press, leg extensions)
   - KNEELING: On knees (cable crunches, some rows)
   - PRONE: Face down (prone flies, reverse flies)
   - SUPINE: Face up lying down (floor press, crunches)

3. MOVEMENT PATTERN CLASSIFICATION:

   A. PUSH PATTERNS (pressing away from body):
      - Horizontal Push: Bench press, push-ups, chest press machine
      - Vertical Push: Overhead press, shoulder press, handstand push-ups
      - Incline Push: Incline bench press, incline dumbbell press

   B. PULL PATTERNS (pulling toward body):
      - Horizontal Pull: Rows (barbell, dumbbell, cable, machine)
      - Vertical Pull: Pull-ups, chin-ups, lat pulldowns
      - Diagonal Pull: High row, face pulls

   C. SQUAT PATTERNS (knee and hip flexion):
      - Back squat, front squat, goblet squat, leg press
      - Single leg: Lunges, Bulgarian split squats, step-ups

   D. HINGE PATTERNS (hip flexion dominant):
      - Deadlifts (conventional, sumo, Romanian, stiff leg)
      - Good mornings, hip thrusts, Romanian deadlifts

   E. ISOLATION PATTERNS (single joint):
      - Bicep: Curls (barbell, dumbbell, cable, hammer)
      - Tricep: Extensions, dips, pushdowns
      - Shoulders: Lateral raises, front raises, rear delt flies
      - Legs: Leg extensions, leg curls, calf raises
      - Core: Crunches, planks, leg raises

4. CRITICAL VISUAL INDICATORS:
   - Bar/weight starting position (floor, chest, overhead, sides)
   - Direction of movement (up/down, forward/back, rotation)
   - Grip position (overhand, underhand, neutral, wide, narrow)
   - Foot stance (wide, narrow, staggered, elevated)
   - Range of motion (full, partial, isometric hold)
   - Bench angle (flat, incline, decline, none)
   - Attachment type (straight bar, EZ bar, rope, handles)

5. COMMON EXERCISE DISTINCTIONS:
   - Deadlift vs Row: Deadlift starts from floor, row is from hanging position
   - Bench Press vs Floor Press: Bench uses bench, floor press on ground
   - Squat vs Lunge: Squat both feet planted, lunge one foot forward
   - Pull-up vs Lat Pulldown: Pull-up hanging from bar, lat pulldown seated
   - Romanian vs Conventional Deadlift: Romanian higher start, less knee bend

6. SPECIFIC EXERCISE FAMILIES:

   BARBELL EXERCISES: Bench press, squat, deadlift, row, curl, overhead press
   DUMBBELL EXERCISES: Press, flies, rows, curls, lunges, step-ups
   CABLE EXERCISES: Rows, pulldowns, flies, curls, pushdowns, face pulls
   MACHINE EXERCISES: Leg press, lat pulldown, chest press, leg extension, leg curl
   BODYWEIGHT EXERCISES: Push-ups, pull-ups, dips, squats, lunges, planks

ANALYSIS STEPS:
1. Identify equipment being used
2. Determine body position and stance
3. Observe movement pattern and direction
4. Note starting and ending positions
5. Check for specific form cues (grip, foot position, etc.)
6. Match to exercise family and specific variation

Return ONLY this JSON structure:

{
  "equipment": one of ["Barbell", "Dumbbell", "Kettlebell", "Cable", "Pin-Loaded Machine", "Plate-Loaded Machine", "Bodyweight", "Resistance Band"],
  "movement_pattern": one of ["Push - Horizontal", "Push - Vertical", "Push - Incline", "Pull - Horizontal", "Pull - Vertical", "Squat", "Hinge", "Isolation", "Core", "Carry"],
  "variation": specific details (e.g. "Conventional", "Sumo", "Romanian", "Incline", "Flat", "Decline", "Wide Grip", "Close Grip", "Hammer", "Seated", "Standing"),
  "movement": exact exercise name (e.g. "Barbell Deadlift", "Incline Dumbbell Press", "Cable Seated Row", "Leg Press"),
  "confidence": integer 0-100
}

Be precise and specific. Return ONLY the JSON object."""

    try:
        start = time.time()
        
        # Use the proper format for Claude's vision API
        response = client.messages.create(
            model=model,
            max_tokens=500,
            temperature=0,
            system="You are an expert fitness coach. Identify exercises from video frames and respond only with valid JSON.",
            messages=[
                {
                    "role": "user", 
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": b64
                            }
                        }
                    ]
                }
            ]
        )

        message = response.content[0].text.strip()
        print(f"⏱️ Claude call duration: {round(time.time() - start, 2)} seconds")
        print("🧠 Raw Claude response:", message)
        
        # Try to extract JSON from the response
        # Sometimes Claude adds markdown or extra text
        json_start = message.find('{')
        json_end = message.rfind('}') + 1
        
        if json_start != -1 and json_end > json_start:
            json_str = message[json_start:json_end]
            result = json.loads(json_str)
            
            # Ensure we have a movement field
            if 'movement' not in result:
                print("⚠️ No 'movement' field in response, using equipment + variation")
                equipment = result.get('equipment', 'Unknown')
                variation = result.get('variation', '')
                result['movement'] = f"{variation} {equipment} Exercise".strip()
            
            return result
        else:
            raise ValueError("No valid JSON found in response")

    except json.JSONDecodeError as e:
        print(f"❌ JSON Parse Error: {str(e)}")
        print(f"❌ Failed to parse: {message}")
        return {
            "movement": "Unknown Exercise",
            "equipment": "Unknown",
            "confidence": 0,
            "error": f"JSON parse error: {str(e)}"
        }
    except Exception as e:
        print(f"❌ Claude API Error: {str(e)}")
        return {
            "movement": "Unknown Exercise", 
            "equipment": "Unknown",
            "confidence": 0,
            "error": str(e)
        }
