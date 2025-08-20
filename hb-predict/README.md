# HB-Predict: Tech Signal Detection & Prediction CLI

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

A powerful TypeScript CLI that detects emerging tech signals from live web sources (Hacker News + Reddit), scores them using sophisticated algorithms, clusters near-duplicates, and generates human-ready predictions powered by Hyperbrowser's web extraction capabilities.

## 🚀 Quick Start

### 1. Get an API Key
Get your Hyperbrowser API key at https://hyperbrowser.ai

### 2. Environment Setup
```bash
# Required
export HYPERBROWSER_API_KEY="your_api_key_here"

# Optional (for LLM-powered predictions)
export OPENAI_API_KEY="your_openai_key_here"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Analysis
```bash
# Basic AI mode analysis
npm run dev

# Custom analysis
npm start -- --mode ai --subs r/MachineLearning,r/LocalLLaMA --window 24h --top 10

# Advanced usage
npx ts-node hb-predict.ts --sources hn,reddit --mode devtools --window 48h --top 15 --out ./results
```

## 📊 Features

### Multi-Source Data Collection
- **Hacker News**: Front page + newest posts with points, comments, and metadata
- **Reddit**: Configurable subreddits with upvotes, comments, and author data
- **Hyperbrowser-First**: Uses official Hyperbrowser SDK for all web extraction

### Intelligent Scoring System
- **Velocity**: Z-score based momentum calculation per source
- **Cross-Source**: Bonus for topics appearing across multiple platforms
- **Authority**: Reputation scoring for domains and authors
- **Novelty**: Penalizes similar content from recent history
- **Impact Hints**: Detects launch/funding/acquisition keywords

### Smart Clustering
- TF-IDF cosine similarity for grouping related events
- Automatic keyword extraction and deduplication
- Configurable similarity thresholds

### AI-Powered Predictions
- OpenAI integration for nuanced trend analysis
- Heuristic fallback when API unavailable
- Confidence scoring and citation generation

## 🎯 CLI Options

```bash
npx ts-node hb-predict.ts [OPTIONS]

Options:
  --sources hn,reddit,github,ph,arxiv    # Data sources (default: hn,reddit)
  --subs r/MachineLearning,r/LocalLLaMA  # Subreddits to scan
  --mode ai|crypto|devtools|fintech      # Preset configurations (default: ai)
  --window 24h                           # Time window: hours(h), days(d), minutes(m)
  --top 10                               # Number of predictions (default: 10)
  --out ./oracle                         # Output directory (default: ./oracle)
  --watch                                # Continuous monitoring (5min intervals)
  --min-karma 30                         # Min Reddit user karma (default: 30)
  --min-points 20                        # Min HN points threshold (default: 20)
```

### Mode Presets
- **ai**: r/MachineLearning, r/LocalLLaMA, r/artificial, r/singularity, r/ChatGPT
- **crypto**: r/CryptoCurrency, r/bitcoin, r/ethereum, r/DeFi, r/NFT
- **devtools**: r/programming, r/webdev, r/javascript, r/rust, r/golang  
- **fintech**: r/fintech, r/investing, r/SecurityAnalysis, r/startups

## 📁 Output Files

### 1. `predictions.md` - Human-Ready Report
```markdown
# Tech Signal Predictions

## 1. New LLM framework gaining enterprise adoption (confidence: HIGH)
- Multiple discussions across HN and r/MachineLearning about production deployment
- Based on 8 signals across hn, reddit
- Keywords: framework, enterprise, deployment, scaling, production

**Citations:**
- [Company X releases enterprise LLM toolkit](https://news.ycombinator.com/item?id=123)
- [New framework simplifies LLM deployment](https://reddit.com/r/MachineLearning/...)
```

### 2. `events.jsonl` - Raw Scored Events
```json
{"id":"abc123","source":"hn","title":"Revolutionary AI Framework Released","url":"https://example.com","points":245,"score":0.87,"created_at":"2024-01-15T10:30:00Z"}
{"id":"def456","source":"reddit","title":"Game-changing ML tool","url":"https://reddit.com/r/ML/...","points":156,"score":0.76,"subreddit":"MachineLearning"}
```

### 3. `clusters.json` - Grouped Analysis
```json
[
  {
    "id": "cluster-1",
    "title_hint": "Revolutionary AI Framework Released",
    "events": [...],
    "max_score": 0.87,
    "keywords": ["framework", "ai", "released"],
    "prediction": {
      "claim": "AI framework adoption accelerating in enterprise",
      "confidence": "high",
      "citations": [...]
    }
  }
]
```

## 🎯 Growth Use Case

Perfect for:
- **Tech VCs**: Spot emerging investment opportunities before they peak
- **Product Teams**: Identify trending technologies for roadmap planning  
- **Market Research**: Track competitor launches and industry movements
- **Content Creators**: Generate data-driven content about tech trends
- **Developers**: Stay ahead of the curve on new tools and frameworks

## 🔧 Technical Implementation

### Scoring Algorithm
```
Final Score = 0.35×Velocity + 0.25×CrossSource + 0.20×Authority + 0.10×Novelty + 0.10×ImpactHints
```

- **Velocity**: Z-score of points/hour within source bucket
- **CrossSource**: +0.5 for cross-platform mentions within 48h
- **Authority**: +0.25 for reputable domains, +0.15 for high-karma authors
- **Novelty**: Cosine similarity penalty vs last 14 days
- **ImpactHints**: +0.2 for launch/funding/acquisition keywords

### Rate Limiting & Ethics
- Staggered API calls with 1s delays
- Respects robots.txt and platform guidelines
- Configurable thresholds to avoid spam/low-quality content

## 🚦 Examples

```bash
# Monitor AI trends with 48h lookback
npx ts-node hb-predict.ts --mode ai --window 48h --top 15

# Track crypto markets with custom subreddits  
npx ts-node hb-predict.ts --mode crypto --subs r/CryptoCurrency,r/ethereum --window 12h

# Continuous monitoring for devtools
npx ts-node hb-predict.ts --mode devtools --watch --out ./monitoring

# High-signal only analysis
npx ts-node hb-predict.ts --min-points 50 --min-karma 100 --top 5
```

## 🛠 Development

```bash
# Install dependencies
npm install

# Run with development settings
npm run dev

# Manual execution
npx ts-node hb-predict.ts --help
```

## 📈 Future Enhancements

- GitHub stars delta tracking
- Product Hunt integration  
- Slack webhook notifications
- Historical trend analysis
- Custom domain authority scoring

---

Follow @hyperbrowser for updates.
