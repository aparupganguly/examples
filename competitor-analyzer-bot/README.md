# Competitor Analyzer Bot

A CLI tool that scrapes and compares 2 competitor websites, generating AI-powered competitive analysis reports.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file with your API keys:
```
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key (Get your API keys from https://hyperbrowser.ai)
OPENAI_API_KEY=your_openai_api_key
```

## Usage

### Interactive Mode
```bash
npm start
```

The program will start and prompt you to enter 2 URLs interactively:

```
🚀 Welcome to Competitor Analyzer Bot!
📝 Please enter 2 competitor website URLs to compare
💡 You can enter URLs with or without https:// (we'll add it automatically)
💡 Type 'quit' to exit

Enter URL 1 of 2 (or 'quit'): stripe.com
✅ Added: https://stripe.com
Enter URL 2 of 2 (or 'quit'): square.com
✅ Added: https://square.com

✅ Got 2 URLs. Starting analysis...
```

### Alternative Commands
```bash
# Using dev script
npm run dev

# Using ts-node directly
npx ts-node competitor-analysis.ts
```

## Features

- **URL Validation**: Automatically validates and filters invalid URLs
- **Web Scraping**: Uses Hyperbrowser to scrape website content in markdown format
- **AI Analysis**: Leverages OpenAI's GPT-4 to extract competitive insights
- **Structured Output**: Generates reports with:
  - Website headlines
  - Key features
  - Pricing models
  - Unique Selling Propositions (USPs)
- **Report Generation**: Saves timestamped reports in markdown format

## Output

The tool generates:
1. Console output with competitive analysis
2. A timestamped markdown file (e.g., `competitor-report-2024-01-15T10-30-00-000Z.md`)

## Error Handling

- Validates URL formats before processing
- Handles failed scraping attempts gracefully
- Continues analysis even if some websites fail to scrape
- Provides detailed error messages and status updates

## Requirements

- Node.js
- TypeScript
- Hyperbrowser API key
- OpenAI API key
