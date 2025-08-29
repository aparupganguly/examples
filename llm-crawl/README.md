# LLMCrawl 🕷️🤖

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

A powerful CLI tool that combines Hyperbrowser's official Crawl API with Large Language Models to fetch structured web data and process it intelligently. Perfect for growth engineering, research, and data extraction tasks.

## ✨ Features

- 🕷️ **Web Crawling**: Uses Hyperbrowser's official SDK with `client.crawl.startAndWait()`
- 🤖 **LLM Processing**: Integrates OpenAI GPT models for intelligent data processing  
- 📊 **Multiple Output Formats**: Markdown, JSON, JSONL, and FAISS embeddings
- 🎯 **Smart Extraction**: Automatically adapts processing based on your instruction
- 🚀 **Growth-Ready**: Built for scaling content analysis and data extraction workflows

## 🔧 Installation

1. Clone and install dependencies:
```bash
npm install
```

2. **Get an API key** at [https://hyperbrowser.ai](https://hyperbrowser.ai)

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
export HYPERBROWSER_API_KEY="your_key_here"
export OPENAI_API_KEY="your_key_here"

# Run examples
npx tsx cli.ts "Find all AI startup launches in 2025 from techcrunch.com and summarize in 3 bullets"
```

## 💡 Usage Examples

### 1. Startup News Summary
```bash
llmcrawl "Find all AI startup launches in 2025 from techcrunch.com and summarize in 3 bullets"
```
→ Crawls TechCrunch, extracts startup news, returns markdown summary

### 2. Product Reviews Analysis  
```bash
llmcrawl "Collect 50 reviews of iPhone 16 Pro from bestbuy.com, return JSONL with {rating, pros, cons, sentiment}" --json -o reviews.jsonl
```
→ Crawls BestBuy reviews, extracts structured data, saves as JSONL

### 3. Research Paper Database
```bash
llmcrawl "Crawl arxiv.org for latest multimodal LLM papers and export FAISS db" -o papers.bin
```
→ Crawls ArXiv, creates searchable embeddings database

## 🎛️ CLI Options

```bash
llmcrawl <instruction> [options]

Options:
  --json              Output results in JSON format
  -o, --out <file>    Save output to file  
  -m, --model <model> OpenAI model (default: gpt-4-turbo-preview)
  -v, --verbose       Enable verbose logging
  -h, --help          Show help
```

## 🔑 Environment Variables

```bash
HYPERBROWSER_API_KEY    # Get at https://hyperbrowser.ai
OPENAI_API_KEY          # Get at https://platform.openai.com
```

## 🏗️ Architecture

- **`crawl.ts`** → Hyperbrowser integration with official SDK
- **`llm.ts`** → OpenAI integration for content processing  
- **`cli.ts`** → Commander-based CLI entrypoint

## 🎯 Growth Use Cases

- **Content Research**: Auto-generate social media content from trending topics
- **Competitor Analysis**: Extract and analyze competitor product data
- **Lead Generation**: Scrape and qualify prospects from industry sites
- **Market Research**: Gather insights from review sites and forums
- **SEO Content**: Generate blog ideas from trending searches and discussions

## 🔄 Development

```bash
# Development mode
npm run dev "your instruction here"

# Build
npm run build

# Run built version  
node dist/cli.js "your instruction here"
```

## 📊 Output Formats

- **Markdown** (default): Human-readable terminal output
- **JSON/JSONL**: Structured data with `--json` flag
- **FAISS Database**: Vector embeddings for semantic search

---

Follow [@hyperbrowser](https://x.com/hyperbrowser) for updates.
