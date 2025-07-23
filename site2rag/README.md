# Site2RAG

A CLI tool that uses **Hyperbrowser** to scrape webpage content, automatically cleans boilerplate, and outputs token-budgeted chunks ready for RAG or embedding pipelines.

## Features

- 🌐 **Hyperbrowser Integration**: Uses Hyperbrowser's powerful browser automation for reliable scraping
- 🔍 **Web Scraping**: Fetches rendered HTML from any webpage with anti-bot protection bypass
- 🧹 **Content Cleaning**: Automatically removes boilerplate (nav, header, footer, scripts)
- ✂️ **Smart Chunking**: Splits content into token-budgeted chunks (configurable)
- 📊 **Multiple Output Formats**: JSON, Markdown, or human-readable summary
- 🎯 **RAG-Ready**: Perfect for ingestion into embedding pipelines

## Prerequisites

1. **Hyperbrowser Account**: Sign up at [hyperbrowser.ai](https://hyperbrowser.ai/) to get your API key
2. **Node.js**: Version 16 or higher

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Key

Get your Hyperbrowser API key from [hyperbrowser.ai](https://hyperbrowser.ai/) and set it as an environment variable:

```bash
# Create a .env file
echo "HYPERBROWSER_API_KEY=your_api_key_here" > .env
```

Or export it directly:

```bash
export HYPERBROWSER_API_KEY=your_api_key_here
```

## Usage

### Basic Usage

```bash
npx ts-node index.ts --url https://example.com
```

### Command Line Options

- `--url, -u`: **Required.** URL to scrape
- `--json`: Output chunks in JSON format for programmatic use
- `--md`: Output chunks in Markdown format with headers and source citations
- `--maxTokens`: Maximum tokens per chunk (default: 1000)

### Examples

**Basic scraping with summary:**
```bash
npx ts-node index.ts --url https://blog.example.com
```

**JSON output for API integration:**
```bash
npx ts-node index.ts --url https://docs.example.com --json --maxTokens 500
```

**Markdown output for documentation:**
```bash
npx ts-node index.ts --url https://news.example.com --md --maxTokens 1500
```

## Output Formats

### JSON Format
Perfect for API integrations and automated workflows:

```json
{
  "source": "https://example.com",
  "created": "2024-01-15T10:30:00.000Z",
  "chunks": [
    {
      "id": 1,
      "tokens": 245,
      "source": "https://example.com",
      "text": "Main content chunk..."
    }
  ]
}
```

### Markdown Format
Great for documentation and human-readable output:

```markdown
# Context Pack for https://example.com

## Chunk 1 • 245 tokens

Main content chunk...

> _Source: https://example.com_
```

### Summary Format (Default)
Quick overview of extracted chunks:

```
Context Chunks
───────────────────────────
Chunk 1 — 245 tokens
Chunk 2 — 387 tokens
Chunk 3 — 492 tokens

Run with --md or --json for full output
```

## Powered by Hyperbrowser

This tool leverages [Hyperbrowser](https://hyperbrowser.ai/), a powerful browser automation platform that provides:

- **Rendered Content**: Gets fully rendered HTML including JavaScript-generated content
- **Anti-Bot Bypass**: Handles modern anti-scraping measures automatically
- **Reliable Scraping**: Built-in retries and error handling
- **Scalable**: Can handle high-volume scraping needs

## Use Cases

- **RAG Pipelines**: Generate embedding-ready content chunks
- **Content Analysis**: Extract and analyze web content at scale
- **Documentation**: Convert web content to structured markdown
- **Data Integration**: JSON output for seamless API integration
- **Research**: Gather and organize web content for analysis

## Development

### Build
```bash
npm run build
```

### Test
```bash
npm start -- --url https://example.com
```

## License

ISC 