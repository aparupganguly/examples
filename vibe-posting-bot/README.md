# Vibe Posting Bot 🤖

An intelligent social media bot that automatically scrapes tech news sources, detects new content, and creates authentic, human-like posts for Typefully.

## Features

- **🕐 Periodic cron job**: Automatically runs every 3 hours (configurable)
- **🔍 Smart change detection**: Only posts when new content is detected
- **🎭 Multiple vibes**: Choose from founder, dev, investor, or casual tones
- **📝 Typefully integration**: Automatically creates drafts in your Typefully account
- **🎯 Authentic tone**: Uses advanced prompts to sound human, not robotic
- **🧪 Dry run mode**: Test without actually posting

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create `.env` file** with your API keys:
   ```bash
   # Required API Keys
   HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   TYPEFULLY_API_KEY=your_typefully_api_key_here
   ```

3. **Get your API keys**:
   - [Typefully API key](https://typefully.com/settings/api)
   - [OpenAI API key](https://platform.openai.com/api-keys)
   - [Hyperbrowser API key](https://hyperbrowser.ai)

## Usage

### Quick Start Scripts
```bash
# Run with default settings (founder vibe, every 3 hours)
npm run start

# Test without posting (dry run)
npm run dry-run

# Different vibes
npm run founder     # Tech founder perspective
npm run dev-vibe    # Developer perspective
npm run investor    # VC/investor perspective
npm run casual      # Casual tech enthusiast
```

### Advanced Usage
```bash
# Custom cron schedule (every hour)
npm run dev -- --schedule "0 * * * *"

# Different tone formats
npm run dev -- --tone thread    # Thread format
npm run dev -- --tone one-liner # Single tweet (default)

# Combine options
npm run dev -- --vibe dev --tone thread --schedule "0 */2 * * *"
```

## Monitored Sources

The bot currently monitors:
- Anthropic News
- OpenAI Blog
- Google DeepMind Technology
- Hugging Face Blog
- Hacker News

## How It Works

1. **Content Detection**: Scrapes configured URLs and creates hashes of content
2. **Change Detection**: Compares current content with previously seen content
3. **Smart Generation**: Uses GPT-4 with context-aware prompts for authentic voice
4. **Posting**: Creates drafts in Typefully for review before publishing

## Customization

### Adding New Sources
Edit the `urls` array in `vibe-posting-bot.ts`:
```typescript
const urls = [
  "https://your-new-source.com/blog",
  // ... existing URLs
];
```

### Custom Vibes
Add new personality types in the `SYSTEM_PROMPTS` object with multiple prompt variations for variety.

## Files Generated

- `seen-content.json`: Tracks content hashes to detect changes
- Console logs with timestamps and operation details

## Tips

- Start with `--dryRun` to test the bot behavior
- The bot posts drafts to Typefully - you still control what gets published
- Each vibe has multiple prompt variations to avoid repetitive content
- Content is only processed when changes are detected

## Cron Schedule Format

The `--schedule` parameter uses standard cron syntax:
```
# ┌───────────── minute (0 - 59)
# │ ┌───────────── hour (0 - 23)
# │ │ ┌───────────── day of the month (1 - 31)
# │ │ │ ┌───────────── month (1 - 12)
# │ │ │ │ ┌───────────── day of the week (0 - 6) (Sunday to Saturday)
# │ │ │ │ │
# * * * * *

# Examples:
"0 */3 * * *"    # Every 3 hours (default)
"0 9 * * *"      # Every day at 9 AM
"0 9,17 * * *"   # Every day at 9 AM and 5 PM
"0 9 * * 1-5"    # Every weekday at 9 AM
``` 