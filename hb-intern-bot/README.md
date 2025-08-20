# 🤖 hb-intern

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

> AI-powered Research Intern Bots that never sleep. Watch, scrape, analyze, and summarize content from across the web automatically.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Hyperbrowser](https://img.shields.io/badge/Hyperbrowser-00FF88?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiByeD0iMjAiIGZpbGw9IiMwMEZGODgiLz4KPHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIyMCIgeT0iMjAiPgo8L3N2Zz4KPC9zdmc+Cg==&logoColor=white)](https://hyperbrowser.ai)
[![OpenAI](https://img.shields.io/badge/OpenAI-000000?style=flat&logo=openai&logoColor=white)](https://openai.com)

---

## ✨ What It Does

Transform your research workflow with intelligent bots that:

🔍 **Multi-Source Scraping** - Monitor Hacker News, Reddit, Product Hunt, and company blogs  
🧠 **AI-Powered Analysis** - Smart scoring based on velocity, authority, and impact  
📊 **Beautiful Reports** - Generate markdown digests and PDF presentation decks  
💬 **Team Integration** - Send summaries directly to Slack channels  
⏰ **Continuous Monitoring** - Watch mode runs every few hours automatically  
🎯 **Smart Filtering** - Custom include/exclude keywords per bot  

---

## 🚀 Quick Start

### 1. Get an API Key
**Get an API key** at https://hyperbrowser.ai

### 2. Installation
```bash
git clone https://github.com/hyperbrowserai/hyperbrowser-app-examples
cd hb-intern-bot
npm install
npm run build
```

### 3. Environment Setup
```bash
export HYPERBROWSER_API_KEY="hb_your_api_key_here"
export OPENAI_API_KEY="sk-your_openai_key"  # Optional - for AI summaries
export SLACK_WEBHOOK_URL="https://hooks.slack.com/your/webhook"  # Optional
```

### 4. Run Your First Bot
```bash
# Quick demo with top 3 AI stories
npx hb-intern --config demo.config.yaml --top 3 --deck --slack

# Full AI research pipeline
npx hb-intern --config bots.config.yaml --watch 180 --slack
```

---

## 🎬 Demo Output

```bash
🤖 Running bot: AI Daily
🔄 Extracting data from: https://news.ycombinator.com/
✅ Successfully extracted data from: https://news.ycombinator.com/
🔄 Extracting data from: https://www.reddit.com/r/MachineLearning/
✅ Successfully extracted data from: https://www.reddit.com/r/MachineLearning/

[AI Daily] HN(23) Reddit(15) PH(8) Blogs(5)
[AI Daily] → normalized(51)
[AI Daily] → scored(51) 
[AI Daily] → top(10)
[AI Daily] → summarized(10)
[AI Daily] wrote digest.md, events.jsonl, deck.pdf, slack: OK
```

**Generated Files:**
- 📄 `digest.md` - Clean markdown summary for humans
- 📊 `events.jsonl` - Structured data with scores for analysis  
- 🎯 `deck.pdf` - Beautiful presentation slides
- 💬 **Slack notification** sent to your team

---

## ⚙️ Configuration

Create powerful research bots with YAML configs:

```yaml
bots:
  - name: "AI Daily"
    mode: "ai"                           # Preset filters for AI/ML content
    sources:
      hn: true                           # Hacker News front + new pages
      reddit: ["MachineLearning", "LocalLLaMA", "Artificial"]
      producthunt: true                  # Today's launches + trending
      blogs:
        - "https://openai.com/blog"
        - "https://anthropic.com/news"
        - "https://deepmind.google/discover/blog"
    include: ["open source", "launch", "models", "inference"]
    exclude: ["hiring", "recruiting", "spam"]

  - name: "DevTools Watch"  
    mode: "devtools"                     # Developer tools & frameworks
    sources:
      hn: true
      reddit: ["programming", "devops"]
      blogs:
        - "https://github.blog/changelog"
        - "https://vercel.com/changelog"
    include: ["cli", "framework", "library"]
    exclude: ["job", "hiring"]
```

### 🎨 Bot Modes
- **`ai`** - AI/ML developments, models, inference, research
- **`devtools`** - Development frameworks, libraries, CLI tools, DevOps  
- **`startup`** - Startup funding, launches, SaaS products, business

---

## 🛠️ CLI Usage

```bash
npx hb-intern --config <config.yaml> [OPTIONS]
```

| Flag | Description | Example |
|------|-------------|---------|
| `--config` | **Required** YAML config file | `--config bots.config.yaml` |
| `--out` | Output directory | `--out ./reports` |
| `--since` | Time window for content | `--since 48h` |
| `--top` | Number of top events | `--top 15` |
| `--deck` | Generate PDF presentation | `--deck --theme dark` |
| `--slack` | Send to Slack webhook | `--slack` |
| `--watch` | Continuous mode (minutes) | `--watch 180` |
| `--reset` | Clear watch state | `--reset` |

### 💡 Pro Examples

```bash
# 🎯 Quick AI research digest
npx hb-intern --config bots.config.yaml --top 5 --deck

# 🔄 Continuous monitoring with Slack alerts  
npx hb-intern --config bots.config.yaml --watch 180 --slack

# 📊 Deep dive with extended time window
npx hb-intern --config bots.config.yaml --since 7d --top 20 --deck --theme neon

# 🚀 Production deployment
npx hb-intern --config production.yaml --watch 360 --slack --out /var/reports
```

---

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Data Sources  │ -> │  hb-intern CLI   │ -> │    Outputs      │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Hacker News   │    │ 🔄 Scraping      │    │ 📄 digest.md    │
│ • Reddit        │    │ 🧠 AI Analysis   │    │ 📊 events.jsonl │
│ • Product Hunt  │    │ ⚡ Scoring       │    │ 🎯 deck.pdf     │
│ • Company Blogs │    │ 📝 Summarization │    │ 💬 Slack alerts │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 🧩 Modular Design
- **`/scraper`** - Source-specific extractors (HN, Reddit, PH, Blogs)
- **`/pipeline`** - Data processing (normalize, score, summarize, deck)  
- **`/out`** - Output generation (markdown, PDF, Slack)
- **`/watch`** - Continuous monitoring with state persistence

---

## 🌟 Growth Use Cases

**For Startups:**
- 🎯 Monitor competitor launches on Product Hunt
- 📈 Track funding announcements and market trends
- 🚀 Discover viral marketing strategies

**For Developers:**  
- 🔧 Stay updated on new frameworks and tools
- 🐛 Monitor security vulnerabilities and patches
- ⚡ Track performance optimization techniques

**For AI Researchers:**
- 🧠 Follow latest model releases and papers
- 🏃‍♂️ Monitor inference optimization breakthroughs  
- 📊 Track AI company announcements and research

**For VCs/Analysts:**
- 💰 Automated deal flow monitoring
- 📊 Market sentiment analysis from multiple sources
- 🎯 Competitive intelligence automation

---

## 🔧 Advanced Features

### 🎨 PDF Themes
- **`modern`** - Clean, professional slides
- **`dark`** - Dark mode with accent colors  
- **`neon`** - High-contrast cyberpunk theme

### 🧠 Smart Scoring Algorithm
```typescript
final_score = (velocity * 0.4) + (authority * 0.3) + (impact * 0.3)

velocity  = comments + votes + recency_boost
authority = domain_score + author_reputation  
impact    = keyword_relevance + engagement_ratio
```

### 📊 Watch Mode Intelligence
- **Duplicate Detection** - Never process the same story twice
- **State Persistence** - Maintains history across runs
- **Smart Filtering** - Time-based and keyword filtering
- **Graceful Errors** - Continues on individual source failures

---

## 🤝 Contributing

We welcome contributions! This project demonstrates:
- ✅ **Clean TypeScript architecture** with modular design
- ✅ **Real API integrations** with error handling
- ✅ **Production-ready CLI** with comprehensive options
- ✅ **Modern tooling** - TypeScript, Zod schemas, PDF generation

---

## 📄 License

MIT License - Build amazing things!

---

**Follow [@hyperbrowser](https://twitter.com/hyperbrowser) for updates.**

> 💡 **Tip:** Set up a cron job with `--watch 180` to get fresh research insights every 3 hours automatically!