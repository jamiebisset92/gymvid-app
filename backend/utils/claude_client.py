import os
from anthropic import Anthropic

claude = Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))
