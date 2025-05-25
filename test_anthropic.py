#!/usr/bin/env python3
"""
Test script to verify Anthropic client initialization
Run this locally to ensure the client works before deploying
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    from anthropic import Anthropic
    print("✅ Successfully imported Anthropic")
    
    api_key = os.getenv("CLAUDE_API_KEY")
    if not api_key:
        print("❌ CLAUDE_API_KEY not found in environment variables")
        print("   Please set it in your .env file or Render environment")
    else:
        print(f"✅ CLAUDE_API_KEY found (length: {len(api_key)})")
        
        # Try to initialize the client
        client = Anthropic(api_key=api_key)
        print("✅ Successfully initialized Anthropic client")
        
        # Optional: Try a simple API call
        try:
            response = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=10,
                messages=[{"role": "user", "content": "Say 'test'"}]
            )
            print("✅ API call successful!")
        except Exception as e:
            print(f"⚠️  API call failed (this might be due to invalid API key): {e}")
            
except ImportError as e:
    print(f"❌ Failed to import Anthropic: {e}")
    print("   Make sure 'anthropic' is in your requirements.txt")
except Exception as e:
    print(f"❌ Unexpected error: {e}") 