# Resource Summary

A lightweight CLI that analyzes webpage resources using Hyperbrowser's API.

## Setup

1. Get your API key from [hyperbrowser.ai](https://hyperbrowser.ai)
2. Create a `.env` file:
   ```
   HYPERBROWSER_API_KEY=your_api_key_here
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

```bash
# Basic analysis (fast)
npx tsx index.ts --url https://example.com

# Advanced AI analysis
npx tsx index.ts --url https://github.com --mode advanced
```

## Output

- **Basic Mode**: Counts images, links, scripts, and stylesheets from content
- **Advanced Mode**: AI-powered page structure analysis with performance insights
