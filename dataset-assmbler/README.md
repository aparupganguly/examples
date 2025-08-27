# Dataset Assembler CLI

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

A single-file TypeScript CLI tool that assembles datasets by:
1. Searching the web for topic-relevant pages using Serper.dev
2. Extracting structured text using Hyperbrowser's official scraping methods
3. Cleaning, deduplicating, and splitting into train/eval sets
4. Exporting to JSONL or CSV format

## Installation

```bash
# Clone the repository
git clone https://github.com/hyperbrowserai/examples
cd dataset-assembler

# Install dependencies
npm install

# TypeScript file runs directly with ts-node (no build step needed)
```

## Get an API key

To use this tool, you'll need API keys from:
- [Hyperbrowser](https://hyperbrowser.ai) - For web scraping
- [Serper.dev](https://serper.dev) - For web search

## Environment Setup

Create a `.env` file in the project directory with your API keys:

```
SERPER_API_KEY=your_serper_api_key
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key
```

## Usage

```bash
npx ts-node dataset-assembler.ts --topic "retrieval augmented generation security" --sources "arxiv.org,ai.googleblog.com"
```

### CLI Arguments

- `--topic` (required): Query string for search (e.g., "retrieval augmented generation security")
- `--sources` (optional): Comma-separated domains to bias results (e.g., arxiv.org,ai.googleblog.com)
- `--max` (default: 200): Total records to collect
- `--format` (default: jsonl): Output format (jsonl or csv)
- `--out` (default: dataset): Output file prefix
- `--train-split` (default: 0.9): Proportion of data for training
- `--fields` (default: url,title,content): Fields to include in the output
- `--concurrency` (default: 5): Number of concurrent requests

## Example

```bash
npx ts-node dataset-assembler.ts --topic "AI safety research" --sources "openai.com,anthropic.com" --max 100 --format csv
```

This command will:
1. Search for "AI safety research" on openai.com and anthropic.com
2. Scrape up to 100 pages
3. Clean and deduplicate the content
4. Split into training and evaluation sets (90/10 by default)
5. Export to CSV format as dataset.train.csv and dataset.eval.csv

## Use Case

This tool is perfect for quickly assembling high-quality training datasets for fine-tuning language models, creating search indexes, or building knowledge bases from specific domains.

Follow [@hyperbrowser](https://x.com/hyperbrowser) for updates.