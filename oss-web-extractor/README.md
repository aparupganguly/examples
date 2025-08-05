# OSS Web Extractor

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

A blazingly fast web data extractor powered by Hyperbrowser's scraping infrastructure and OpenAI's latest open-source `gpt-oss-20b` model. Extract structured data from any website with enterprise-grade reliability and **zero API costs** for AI inference.

## 🚀 Why This Rocks

- ✅ **Zero AI costs** - Local inference with open-source models
- ✅ **Enterprise reliability** - Hyperbrowser handles CAPTCHAs, proxies, rate limits  
- ✅ **Lightning fast** - gpt-oss-20b delivers lower latency and runs on consumer hardware
- ✅ **Fully customizable** - Modify extraction schemas for any use case
- ✅ **Growth-ready** - Built for scale with retry logic and error handling

## Prerequisites

1. **Get an API key** at https://hyperbrowser.ai
2. Install vLLM to run gpt-oss-20b locally (works on consumer hardware!)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Add your Hyperbrowser API key
echo "HYPERBROWSER_API_KEY=your_api_key_here" > .env
```

3. Start the gpt-oss-120b model server:
```bash
# Install vLLM with gpt-oss support (from official Hugging Face instructions)
uv pip install --pre vllm==0.10.1+gptoss \
    --extra-index-url https://wheels.vllm.ai/gpt-oss/ \
    --extra-index-url https://download.pytorch.org/whl/nightly/cu128 \
    --index-strategy unsafe-best-match

# Start the model server (auto-downloads from Hugging Face)
vllm serve openai/gpt-oss-120b
```

## Usage

Run the extractor:
```bash
npm run start
```

The tool will:
1. Scrape Wikipedia's list of largest cities
2. Extract structured data using gpt-oss-120b
3. Save results to `cities.json`

## 💡 Growth Use Cases

Perfect for **data-driven growth teams** who need to:

- 📊 **Monitor competitor pricing** from e-commerce sites for dynamic pricing strategies
- 📱 **Track social media metrics** across platforms for content optimization  
- 💼 **Extract job postings** for talent acquisition and market analysis
- ⭐ **Scrape product reviews** for sentiment analysis and feature insights
- 🎯 **Gather market data** for business intelligence dashboards
- 📈 **Auto-generate LinkedIn carousels** from scraped industry stats

## 📊 Example Output

```json
{
  "cities": [
    {
      "city": "Tokyo",
      "country": "Japan", 
      "population": 37393128,
      "rank": 1
    },
    {
      "city": "Delhi", 
      "country": "India",
      "population": 32941308,
      "rank": 2
    }
  ]
}
```

Follow @hyperbrowser for updates.