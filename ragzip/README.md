# RAGZip

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

A single-file CLI that uses Hyperbrowser's official scrape API to extract website content and builds citation-tagged context packs for LLMs.

## Setup

1. **Get an API key** from [https://hyperbrowser.ai](https://hyperbrowser.ai)

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set environment variables**
   ```bash
   cp env.example .env
   # Add your keys to .env:
   # HYPERBROWSER_API_KEY=hb_your_key_here
   # OPENAI_API_KEY=sk_your_key_here  # optional for compression
   ```

## Usage

```bash
# Basic usage
npm start -- --url https://example.com --budget 2000

# Multiple URLs with compression
npm start -- --url https://docs.example.com --url https://blog.example.com --llm --format md

# From file
echo "https://example.com" > urls.txt
npm start -- --urls urls.txt --budget 5000
```

## Options

- `--url <url>` - URLs to process (can repeat)
- `--urls <file>` - File with newline-separated URLs  
- `--budget <n>` - Token budget (default: 8000)
- `--out <dir>` - Output directory (default: "distill")
- `--format <jsonl|md>` - Output format (default: jsonl)
- `--llm` - Enable OpenAI compression

## Output

- `pack.jsonl` - Main context pack with chunks
- `stats.json` - Processing statistics  
- `citations.md` - Source URLs

**Follow @hyperbrowser_ai for updates.**