import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Replace with the email/password you used during signup
email = "jamienbisset@gmail.com"
password = "Stephanie176"

try:
    response = supabase.auth.sign_in_with_password({
        "email": email,
        "password": password
    })
    print("✅ Login successful:")
    print(response)
except Exception as e:
    print("❌ Login failed:")
    print(e)
