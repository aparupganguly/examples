# Down Detector Bot 🚨

An AI-powered infrastructure monitoring bot that tracks cloud service outages and sends intelligent Slack alerts only when status changes occur.

## What it does

This bot monitors major cloud providers (AWS, Google Cloud, Cloudflare, Azure) by:
- Scraping their DownDetector status pages using [Hyperbrowser](https://hyperbrowser.ai)
- Using OpenAI to intelligently analyze the content for **real current outages**
- Tracking status changes and only sending alerts when there are **new issues** or **recoveries**
- Running automated checks every hour via cron

## Features

✅ **Smart Detection**: Uses AI to distinguish between minor reports and major outages  
✅ **Change-Based Alerts**: Only notifies on status changes, not repeated issues  
✅ **Multiple Providers**: Monitors AWS, Google Cloud, Cloudflare, and Azure  
✅ **Slack Integration**: Sends formatted alerts to your Slack channel  
✅ **Automated Scheduling**: Runs hourly checks automatically  

## Setup

### 1. Get API Keys

**Hyperbrowser API Key**
- Go to [hyperbrowser.ai](https://hyperbrowser.ai)
- Sign up for an account
- Get your API key from the dashboard

**OpenAI API Key**
- Go to [platform.openai.com](https://platform.openai.com)
- Create an account and get your API key

**Slack Webhook URL**
- Go to your Slack workspace settings
- Create a new webhook for the channel you want alerts in
- Copy the webhook URL

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Environment Variables

Create a `.env` file in the project root:

```env
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
SLACK_WEBHOOK_URL=your_slack_webhook_url_here
```

### 4. Run the Bot

```bash
npm run start
# or
ts-node down-detector.ts
```

## How it Works

1. **Scraping**: Uses Hyperbrowser to scrape DownDetector pages for each provider
2. **AI Analysis**: OpenAI analyzes the content with strict criteria for real outages
3. **Status Tracking**: Compares current status with previous runs to detect changes
4. **Smart Alerting**: Only sends notifications for:
   - 🚨 **New outages detected**
   - 🎉 **Services recovered**
   - ⏳ **Ongoing issues** (logged but not alerted)

## Monitored Services

- AWS (Amazon Web Services)
- Google Cloud Platform
- Cloudflare
- Microsoft Azure

## Sample Alerts

**New Outage:**
```
🚨 NEW OUTAGES DETECTED:
🔴 AWS: Major outage affecting EC2 and RDS services in us-east-1
```

**Recovery:**
```
🎉 SERVICES RECOVERED:
✅ Google Cloud: Service restored
```

## Customization

To monitor different services, edit the `TARGETS` array in `down-detector.ts`:

```typescript
const TARGETS = [
  "https://downdetector.com/status/your-service/",
  // Add more URLs here
];
```

## License

MIT 