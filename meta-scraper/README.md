# Meta Scraper Tool

A powerful web scraping tool that extracts and analyzes meta tags from websites using AI. This tool combines Hyperbrowser's web scraping capabilities with OpenAI's GPT-4 to provide comprehensive meta tag analysis and insights.

## Features

- 🌐 Interactive URL input via terminal
- 🔍 Reliable web scraping with Hyperbrowser
- 🤖 AI-powered meta tag analysis using GPT-4
- 📊 Structured JSON output with:
  - Page title and description
  - Open Graph tags (title, description, image)
  - Twitter Card information
  - AI-generated summary and use cases

## Prerequisites

- Node.js (v14 or higher)
- TypeScript
- Hyperbrowser API key
- OpenAI API key

## Setup

1. **Clone or download this project**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Get your API keys**
   - Get your Hyperbrowser API key from [hyperbrowser.ai](https://hyperbrowser.ai)
   - Get your OpenAI API key from OpenAI

4. **Create environment file**
   Create a `.env` file in the project root:
   ```env
   HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

## Usage

Run the tool:
```bash
npx ts-node meta-scrapper.ts
```

The tool will prompt you to enter a URL:
```
🌐 Meta Scraper Tool
Enter a single URL to analyze
URL: https://example.com
```

Enter any website URL and the tool will:
1. Scrape the website content
2. Extract meta tags
3. Analyze the content with AI
4. Return structured JSON results

## Example Output

```json
{
  "url": "https://anthropic.com",
  "title": "Home \\ Anthropic",
  "description": "Anthropic is an AI safety and research company...",
  "ogTitle": "Home \\ Anthropic",
  "ogDescription": "Anthropic is an AI safety and research company...",
  "ogImage": "https://cdn.prod.website-files.com/...",
  "twitterCard": "summary_large_image",
  "summary": "Anthropic is focused on building AI to serve humanity's long-term well-being...",
  "useCases": [
    "AI safety research",
    "Interpretable AI systems",
    "Steerable AI systems"
  ]
}
```

## How It Works

1. **Web Scraping**: Uses Hyperbrowser to reliably scrape website content, handling JavaScript-heavy sites
2. **Meta Extraction**: Extracts various meta tags including standard HTML meta tags and Open Graph properties
3. **AI Analysis**: Uses GPT-4 to analyze the content and generate insights about the website's purpose and use cases
4. **Structured Output**: Returns clean, structured JSON data for easy integration with other tools

## Troubleshooting

- **"No content received from OpenAI"**: Check your OpenAI API key and ensure you have credits
- **"Failed to scrape [URL]"**: Check your Hyperbrowser API key and ensure the URL is accessible
- **JSON parsing errors**: The tool automatically handles various response formats from OpenAI

## License

MIT License
