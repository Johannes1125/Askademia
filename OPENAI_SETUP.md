# OpenAI Chat Integration Setup Guide

## Overview

The chat feature is now powered by OpenAI with a specialized research-focused system prompt. The AI is configured to be strict about research topics and learn about research methodologies, citations, and academic writing.

## Environment Variables

Add this to your `.env.local` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini  # Optional: defaults to gpt-4o-mini (cost-effective) or use gpt-4o for better quality
```

## Getting Your OpenAI API Key

1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys: https://platform.openai.com/api-keys
4. Click "Create new secret key"
5. Copy the key and add it to your `.env.local` file

⚠️ **Important**: Never commit your API key to git. Keep it in `.env.local` which should be in `.gitignore`.

## Model Options

- **gpt-4o-mini** (default): Cost-effective, fast responses, good for most research queries
- **gpt-4o**: Better quality, more accurate, but more expensive
- **gpt-4-turbo**: High quality, best for complex research questions

To change the model, set `OPENAI_MODEL` in your `.env.local`:
```env
OPENAI_MODEL=gpt-4o  # For better quality
```

## Features

### Research-Focused AI

The AI is configured with a comprehensive system prompt that:
- **Strictly focuses on research**: Will politely redirect non-research questions
- **Expert knowledge areas**:
  - Academic research methodologies
  - Citation styles (APA, MLA, Chicago, Harvard, IEEE)
  - Academic writing and paper structure
  - Source discovery and evaluation
  - Literature reviews
  - Research design and data analysis
  - Grammar and academic style

### Behavior

- **Strict**: Refuses to answer non-research questions
- **Educational**: Explains research concepts clearly
- **Evidence-based**: Prioritizes peer-reviewed sources
- **Comprehensive**: Provides detailed, thorough responses
- **Professional**: Maintains academic tone

### Example Interactions

✅ **Will Answer:**
- "How do I cite a journal article in APA format?"
- "What's the difference between qualitative and quantitative research?"
- "Help me write a literature review on climate change"
- "Find sources about machine learning in education"

❌ **Will Redirect:**
- "Tell me a joke"
- "What's the weather today?"
- "Help me with cooking recipes"
- General casual conversation

## Security

- All requests require user authentication
- API key is stored server-side only
- Rate limiting handled by OpenAI
- User messages are logged for context (stored in conversation state)

## Usage

1. Navigate to `/chat` in your application
2. Type your research question
3. Press Enter or click the send button
4. The AI will respond with research-focused guidance

## Cost Management

- **gpt-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **gpt-4o**: ~$2.50 per 1M input tokens, ~$10 per 1M output tokens

Monitor your usage at: https://platform.openai.com/usage

## Troubleshooting

### "OpenAI API key is not configured"
- Make sure `OPENAI_API_KEY` is set in `.env.local`
- Restart your Next.js server after adding the key

### "Unauthorized" error
- Check that your API key is valid
- Verify the key hasn't been revoked
- Make sure you're logged in to the application

### "Rate limit exceeded"
- You've hit OpenAI's rate limits
- Wait a moment and try again
- Consider upgrading your OpenAI plan if needed

### Slow responses
- This is normal for AI processing
- Consider using `gpt-4o-mini` for faster responses
- Check your internet connection

## Customization

To modify the AI's behavior, edit the `RESEARCH_SYSTEM_PROMPT` in `app/api/chat/route.ts`. You can:
- Add more research topics
- Adjust the strictness level
- Modify the response style
- Add specific guidelines

