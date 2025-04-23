import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# ✅ Use a realistic and unique email for testing
email = "jamienbisset@gmail.com"  # Replace with your real domain or Gmail
password = "Stephanie176"

try:
    response = supabase.auth.sign_up({
        "email": email,
        "password": password
    })
    print("✅ Signup successful:")
    print(response)
except Exception as e:
    print("❌ Signup failed:")
    print(e)
