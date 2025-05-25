# Deployment Guide for Render

## Required Environment Variables

Make sure to set these environment variables in your Render service:

### API Keys
- `CLAUDE_API_KEY` - Your Anthropic Claude API key (required for exercise prediction)
- `OPENAI_API_KEY` - Your OpenAI API key (if still using any OpenAI features)

### AWS S3 Configuration
- `AWS_ACCESS_KEY_ID` - Your AWS access key
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret key
- `AWS_REGION` - AWS region (e.g., `us-east-1`)
- `S3_BUCKET_NAME` - Your S3 bucket name

### Supabase Configuration
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Deployment Steps

1. **Set Environment Variables in Render**
   - Go to your Render service dashboard
   - Navigate to "Environment" tab
   - Add all the required environment variables listed above

2. **Verify Environment Variables**
   - After deployment, visit `https://your-app.onrender.com/debug/env`
   - This should show which API keys are properly set

3. **Test the Deployment**
   - Test the exercise prediction endpoint: `/analyze/quick_exercise_prediction`
   - Check logs in Render dashboard for any errors

## Troubleshooting

### "Client.__init__() got an unexpected keyword argument 'proxies'" Error
This error occurs due to incompatibility between Anthropic SDK and httpx version 0.28.0+.

**Solution**: The httpx library must be pinned to version 0.27.2:
- This is already fixed in requirements.txt: `httpx==0.27.2`
- If you still see this error, ensure your deployment is using the updated requirements.txt

The error was caused by:
1. httpx 0.28.0 removed the deprecated `proxies` argument
2. Anthropic SDK 0.23.0 was still using this argument
3. Pinning httpx to 0.27.2 maintains compatibility

### Missing Environment Variables
- Check `/debug/env` endpoint to see which variables are missing
- Ensure variable names match exactly (case-sensitive)
- Restart the service after adding environment variables

### Testing Locally
Run the test script to verify Anthropic client works:
```bash
python test_anthropic.py
```

### Common Issues
1. **API Key not found**: Make sure `CLAUDE_API_KEY` is set in Render environment
2. **Import errors**: Ensure `anthropic==0.23.0` is in requirements.txt
3. **Network errors**: Check if Render can access external APIs (Anthropic, AWS, etc.) 