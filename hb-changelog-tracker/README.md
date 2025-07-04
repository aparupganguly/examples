# Changelog Tracker

A Node.js application that monitors various tech blogs for updates and sends summaries to Slack. Built with [Hyperbrowser](https://hyperbrowser.ai) for web scraping and OpenAI's GPT-4 for summarization.

## Features

- Monitors multiple tech blogs including OpenAI, Anthropic, DeepMind, Y Combinator, and HuggingFace
- Automatically scrapes new content using Hyperbrowser's reliable scraping API
- Generates concise, changelog-style summaries using GPT-4
- Sends notifications to Slack when updates are detected

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- [Hyperbrowser API key](https://hyperbrowser.ai) - Sign up and get your API key
- OpenAI API key
- Slack Webhook URL

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the project root with the following variables:
   ```
   HYPERBROWSER_API_KEY=your_hyperbrowser_key_here
   OPENAI_API_KEY=your_openai_key_here
   SLACK_WEBHOOK_URL=your_slack_webhook_url
   ```

   - Get your Hyperbrowser API key from [hyperbrowser.ai](https://hyperbrowser.ai)
   - View Hyperbrowser documentation at [docs.hyperbrowser.ai](https://docs.hyperbrowser.ai)
   - Get your OpenAI API key from [OpenAI's platform](https://platform.openai.com)
   - Create a Slack webhook URL from your Slack workspace settings

## Usage

Run the script:
```bash
npm start
```

The script will:
1. Scrape the configured tech blogs
2. Generate summaries of any new content
3. Send notifications to your configured Slack channel

## Customization

You can modify the `urls` array in `changelog.ts` to monitor different blogs or websites. The script uses Hyperbrowser's smart scraping to focus on article content while ignoring navigation, ads, and other irrelevant elements.

## Documentation

For more information about Hyperbrowser's capabilities and API reference, visit [docs.hyperbrowser.ai](https://docs.hyperbrowser.ai).

## License

MIT
