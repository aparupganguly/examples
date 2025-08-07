**Built with [Hyperbrowser](https://hyperbrowser.ai)**

# site2prompt

Convert websites into AI training datasets. Scrape, clean, and optimize web content for LLM fine-tuning.

## Why Hyperbrowser?

[Hyperbrowser](https://hyperbrowser.ai) is the **Internet for AI** — purpose-built for developers creating AI agents and automating web tasks. Skip the infrastructure headaches and focus on building.

## Quick Start

1. **Get your API key**: https://hyperbrowser.ai
2. **Install**: `npm install`
3. **Configure**: Add `HYPERBROWSER_API_KEY` to `.env`
4. **Run**: `ts-node site2prompt.ts --urls urls.txt --budget 4000`

## Features

✨ **Instant web scraping** with Hyperbrowser's official SDK  
🧠 **Smart content optimization** (≤120 tokens per block)  
🔄 **Auto-deduplication** using Jaccard similarity  
🤖 **OpenAI compression** with `--llm` flag  
📊 **Multiple exports**: JSONL, CSV, Markdown, JSON  

## Usage

```bash
# Scrape URLs and create training data
ts-node site2prompt.ts --urls urls.txt --budget 4000 --llm

# Quick single URL
ts-node site2prompt.ts --url https://docs.hyperbrowser.ai
```

**Perfect for**: Building domain-specific AI models, creating training datasets from documentation, generating fine-tuning data.

---

🚀 **Scale your AI development** with [Hyperbrowser](https://hyperbrowser.ai) | Follow @hyperbrowser