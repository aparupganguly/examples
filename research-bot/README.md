# Research Bot

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

Automated competitive intelligence for founders. Monitor competitor websites, detect meaningful changes, and get AI-powered insights delivered to Slack. Perfect for tracking pricing updates, product launches, and strategic moves.

## Features

- 🔍 **Smart Change Detection**: SHA256 hashing to catch real content changes
- 🤖 **AI-Powered Analysis**: OpenAI summarization with founder-focused insights
- 📊 **Priority Classification**: P0/P1/P2 tagging for actionable intelligence
- ⏰ **Automated Scheduling**: Built-in cron scheduler respects `cadence_hours` config
- 🚀 **Hyperbrowser Powered**: Reliable web scraping with official SDK
- 📱 **Slack Integration**: Real-time notifications via webhooks
- ⚡ **Concurrent Processing**: Efficient batch processing with timeouts
- 🎯 **Group Filtering**: Monitor specific competitor sets or pricing pages

## Get an API Key

Get your Hyperbrowser API key from [https://hyperbrowser.ai](https://hyperbrowser.ai)

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp env.example .env
# Edit .env with your API keys

# Run once
npm run start:once

# Run continuously (respects cadence_hours from config.yaml)
npm run start:continuous
```

## Environment Variables

```bash
HYPERBROWSER_API_KEY=your_hyperbrowser_key_here
OPENAI_API_KEY=your_openai_key_here
SLACK_WEBHOOK_URL=your_slack_webhook_url_here  # Optional
```

## Configuration

Edit `config.yaml` to set up monitoring:

```yaml
cadence_hours: 3  # How often to run in continuous mode
notify:
  slack_webhook: "${SLACK_WEBHOOK_URL}"
urls:
  - id: "competitor_pricing"
    group: "pricing"
    url: "https://competitor.com/pricing"
  - id: "startup_blog" 
    group: "competitors"
    url: "https://startup.com/blog"
  - id: "hacker_news"
    group: "tech"
    url: "https://news.ycombinator.com"
rules:
  taggers:
    - pattern: "(price|pricing|usd|₹|per month|annual)"
      tag: "pricing"
    - pattern: "(hiring|careers|role|job)"
      tag: "hiring"
    - pattern: "(release|launched|beta|v\\d|roadmap)"
      tag: "product"
```

## Usage Examples

```bash
# Monitor all URLs once
npm run start:once

# Continuous monitoring (runs every cadence_hours)
npm run start:continuous

# Filter by group
tsx agent.ts --group pricing --once
tsx agent.ts --group competitors --continuous

# Monitor specific group continuously
tsx agent.ts --group tech --continuous
```

## Growth Use Cases

Perfect for founders who need to:

- **Track Competitor Pricing**: Get alerted when rivals change pricing strategy
- **Monitor Product Launches**: Stay ahead of new feature releases  
- **Follow Industry News**: Auto-summarize relevant blog posts and announcements
- **Watch Hiring Patterns**: Detect when competitors scale specific teams
- **Monitor Legal Changes**: Track ToS, privacy policy, compliance updates

This creates reusable competitive intelligence that drives strategic decisions and helps you stay ahead of market moves.

## Output

Reports saved to `.data/reports/` as Markdown with:

- **Executive Summary**: AI-generated monitoring plan and priorities
- **Change Analysis**: Bullet-point summaries of what changed
- **Impact Assessment**: Founder-focused business implications  
- **Priority Levels**: P0 (critical), P1 (important), P2 (monitor)
- **Smart Tagging**: Auto-categorization (pricing, product, hiring, etc.)

## API Reference

Uses **Hyperbrowser's official API methods**:

```typescript
// Core web scraping
const result = await hb.agents.browserUse.startAndWait({
  task: `Navigate to ${url} and extract main content quickly`
});

// Real data analysis with OpenAI
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent }
  ]
});
```

## Architecture

Single-file TypeScript implementation (~260 LOC):

- **Hyperbrowser SDK**: Official web scraping via `agents.browserUse`
- **OpenAI Integration**: GPT-4o-mini for intelligent summarization
- **Concurrent Processing**: Batch processing with 4-URL concurrency
- **Timeout Protection**: 60-second per-URL timeout with graceful failures
- **State Management**: JSON snapshots for change detection
- **Cron Scheduling**: Built-in node-cron for automated monitoring
- **Minimal Dependencies**: Essential deps only for maximum reliability

---

Follow [@hyperbrowser](https://twitter.com/hyperbrowser) for more updates.