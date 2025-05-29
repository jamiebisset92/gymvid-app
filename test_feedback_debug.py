#!/usr/bin/env python3
"""
Debug script to test the feedback upload endpoint and diagnose issues.
Usage: python test_feedback_debug.py
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

# Check environment variables
print("=== ENVIRONMENT VARIABLE CHECK ===")
env_vars = {
    "CLAUDE_API_KEY": os.getenv("CLAUDE_API_KEY"),
    "GYMVID_AI_MODEL": os.getenv("GYMVID_AI_MODEL"),
    "AWS_ACCESS_KEY_ID": os.getenv("AWS_ACCESS_KEY_ID"),
    "AWS_SECRET_ACCESS_KEY": os.getenv("AWS_SECRET_ACCESS_KEY"),
    "AWS_REGION": os.getenv("AWS_REGION"),
    "S3_BUCKET_NAME": os.getenv("S3_BUCKET_NAME"),
    "SUPABASE_URL": os.getenv("SUPABASE_URL"),
    "SUPABASE_SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
}

missing_vars = []
for var_name, var_value in env_vars.items():
    if var_value:
        # Show first 8 chars for sensitive vars, full value for non-sensitive ones
        if "KEY" in var_name or "SECRET" in var_name:
            display_value = f"{var_value[:8]}..." if len(var_value) > 8 else var_value
        else:
            display_value = var_value
        print(f"✅ {var_name}: {display_value}")
    else:
        print(f"❌ {var_name}: NOT SET")
        missing_vars.append(var_name)

if missing_vars:
    print(f"\n⚠️  Missing environment variables: {', '.join(missing_vars)}")
    print("Please set these in your backend/.env file or deployment platform.")
else:
    print("\n✅ All environment variables are set!")

# Test Claude API connection
print("\n=== CLAUDE API CONNECTION TEST ===")
try:
    from anthropic import Anthropic
    client = Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))
    if client:
        print("✅ Claude client initialized successfully")
        # Try a simple API call
        try:
            response = client.messages.create(
                model=os.getenv("GYMVID_AI_MODEL", "claude-3-haiku-20240307"),
                max_tokens=50,
                messages=[{"role": "user", "content": "Say 'test successful'"}]
            )
            print(f"✅ Claude API test successful: {response.content[0].text}")
        except Exception as e:
            print(f"❌ Claude API test failed: {e}")
    else:
        print("❌ Failed to initialize Claude client")
except ImportError:
    print("❌ anthropic package not installed. Run: pip install anthropic")
except Exception as e:
    print(f"❌ Error initializing Claude client: {e}")

# Test S3 connection
print("\n=== AWS S3 CONNECTION TEST ===")
try:
    import boto3
    s3 = boto3.client(
        "s3",
        region_name=os.getenv("AWS_REGION"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )
    # Try to list buckets to test connection
    try:
        response = s3.list_buckets()
        print("✅ AWS S3 connection successful")
        bucket_name = os.getenv("S3_BUCKET_NAME")
        if bucket_name in [b['Name'] for b in response['Buckets']]:
            print(f"✅ Bucket '{bucket_name}' exists and is accessible")
        else:
            print(f"⚠️  Bucket '{bucket_name}' not found in account")
    except Exception as e:
        print(f"❌ AWS S3 connection failed: {e}")
except ImportError:
    print("❌ boto3 package not installed. Run: pip install boto3")
except Exception as e:
    print(f"❌ Error initializing S3 client: {e}")

print("\n=== DIAGNOSIS COMPLETE ===")
print("\nIf you're seeing errors above, please:")
print("1. Ensure all environment variables are set correctly")
print("2. Check that your API keys are valid and have the necessary permissions")
print("3. For AWS, ensure the IAM user has S3 read/write permissions")
print("4. For Claude, ensure you have a valid API key from Anthropic") 