# 🚀 Crypto News Bot

An intelligent cryptocurrency news aggregator that automatically scrapes, summarizes, and delivers breaking crypto news to your Slack workspace using AI-powered analysis.

## ✨ Features

- 🔍 **Smart News Scraping**: Automatically scrapes content from top crypto news sources
- 🤖 **AI-Powered Summaries**: Uses OpenAI GPT-4 to generate concise, impactful news summaries
- 📅 **Scheduled Updates**: Daily digest at 9 AM + periodic updates throughout the day
- 🔄 **Change Detection**: Intelligent content comparison to avoid spam notifications
- 💬 **Slack Integration**: Seamless delivery to your Slack workspace via webhooks
- 🧠 **Caching System**: Efficient content caching to minimize API calls

## 📰 News Sources

- **CoinDesk** - Leading cryptocurrency news and analysis
- **Decrypt** - Blockchain and crypto technology coverage  
- **Cointelegraph** - Comprehensive crypto market news

## 🛠️ Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Slack workspace with webhook access
- OpenAI API account
- Hyperbrowser API account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd crypto-news-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   SLACK_WEBHOOK_URL=your_slack_webhook_url_here
   ```

### 🔑 API Keys Setup

#### Hyperbrowser API Key
Get your Hyperbrowser API key at [hyperbrowser.ai](https://hyperbrowser.ai)

1. Sign up for a Hyperbrowser account
2. Navigate to your dashboard
3. Generate an API key
4. Add it to your `.env` file

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account and navigate to API keys
3. Generate a new API key
4. Add it to your `.env` file

#### Slack Webhook URL
1. Go to your Slack workspace settings
2. Navigate to **Apps** → **Custom Integrations** → **Incoming Webhooks**
3. Create a new webhook for your desired channel
4. Copy the webhook URL to your `.env` file

## 🚀 Usage

### Run Once
```bash
npm run start
# or
npx tsx crypto-news-bot.ts
```

### Run in Development Mode
```bash
npm run dev
```

### Production Deployment
```bash
npm run build
npm run start:prod
```

## ⏰ Schedule

The bot runs automatically on the following schedule:

- **📊 Daily Digest**: Every day at 9:00 AM
- **🔄 News Updates**: At 1:00 PM, 5:00 PM, and 9:00 PM (only when significant changes detected)

## 🎯 How It Works

1. **Scraping**: Uses Hyperbrowser to scrape content from crypto news websites
2. **Processing**: Extracts relevant articles and content in markdown format
3. **Analysis**: OpenAI analyzes the content for significant changes and generates summaries
4. **Delivery**: Posts formatted summaries to your Slack channel
5. **Caching**: Stores content locally to enable intelligent change detection

## 📋 Sample Output

```
🚨 Daily Crypto Digest

• Bitcoin Surges Past $45K: Major institutional adoption drives price momentum
• Ethereum 2.0 Staking Rewards: New mechanism increases validator participation
• SEC Crypto Regulations: Latest guidance impacts DeFi protocol compliance
• Altcoin Season Indicators: Market analysis shows potential rotation incoming
```

## 🔧 Configuration

### Customizing News Sources

Edit the `sources` array in `crypto-news-bot.ts`:

```typescript
const sources = [
  "https://www.coindesk.com",
  "https://decrypt.co", 
  "https://cointelegraph.com",
  // Add your preferred crypto news sources
];
```

### Adjusting Schedule

Modify the cron expressions:

```typescript
// Daily digest at 9 AM
cron.schedule("0 9 * * *", () => main(true));

// Updates at 1 PM, 5 PM, 9 PM  
cron.schedule("0 13,17,21 * * *", () => main());
```

### Customizing AI Prompts

Update the `SYSTEM_PROMPT` variable to change how news is summarized:

```typescript
const SYSTEM_PROMPT = `Your custom summarization instructions here...`;
```

## 📁 Project Structure

```
crypto-news-bot/
├── crypto-news-bot.ts    # Main application logic
├── package.json          # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── .env                 # Environment variables (create this)
├── crypto_news_cache.json # Auto-generated cache file
└── README.md            # This file
```

## 🐛 Troubleshooting

### Common Issues

**Import Errors**: Make sure all dependencies are installed:
```bash
npm install
npm install --save-dev @types/node
```

**API Rate Limits**: The bot includes intelligent caching to minimize API calls

**Slack Delivery Issues**: Verify your webhook URL is correct and the channel permissions allow bot posts

### Debug Mode

Add console logs or set environment variables for debugging:
```bash
DEBUG=true npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- [Hyperbrowser](https://hyperbrowser.ai) for web scraping capabilities
- [OpenAI](https://openai.com) for AI-powered summarization
- [Slack](https://slack.com) for communication platform
- The crypto community for inspiration

---

**⚡ Ready to stay ahead of crypto news? Get started in minutes!** 🚀
