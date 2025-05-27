# SEO Analyzer Tool 🔍

A powerful SEO analysis tool that uses AI to analyze websites and provide actionable recommendations for improving search engine optimization.

## Features ✨

- **Comprehensive SEO Analysis**: Analyzes title tags, meta descriptions, headings, content, images, links, and technical SEO factors
- **AI-Powered Insights**: Uses OpenAI's GPT-4 to provide intelligent recommendations
- **Severity Classification**: Issues are categorized as Critical, High, Medium, or Low priority
- **Quick Wins**: Identifies easy improvements for immediate impact
- **Detailed Reports**: Generates JSON reports with timestamps for tracking improvements
- **Web Scraping**: Uses Hyperbrowser to extract webpage content and structure

## Prerequisites 📋

1. **Node.js** (v16 or higher)
2. **API Keys**:
   - [Hyperbrowser API Key](https://hyprbrowser.ai) - for web scraping
   - [OpenAI API Key](https://platform.openai.com) - for AI analysis

## Setup 🛠️

1. **Install dependencies**:
```bash
npm install
```

2. **Environment Setup**:
Create a `.env` file in the project root:
```env
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage 🚀

### Command Line Usage

```bash
# Analyze any website
npx tsx SEO-Analyzer.ts https://example.com

# Analyze your own website
npx tsx SEO-Analyzer.ts https://yourwebsite.com
```

### Example Output

```
🔍 Starting SEO analysis for: https://example.com
📄 Scraping webpage content...
🤖 Analyzing SEO with AI...
✅ SEO analysis completed!

================================================================================
🎯 SEO ANALYSIS REPORT FOR: https://example.com
================================================================================

📊 OVERALL SEO SCORE: 75/100

📋 SUMMARY:
The website has a solid foundation but needs improvements in meta descriptions and image optimization...

🚨 CRITICAL ISSUES (1):

1. TITLE: Missing or duplicate title tags detected
   💡 Recommendation: Add unique, descriptive title tags (50-60 characters)
   🎯 Priority: 9/10

⚠️ HIGH ISSUES (2):

1. META_DESCRIPTION: Meta description is too short
   💡 Recommendation: Expand meta description to 150-160 characters with compelling copy
   🎯 Priority: 8/10

✅ STRENGTHS:
1. Strong heading structure with proper H1-H6 hierarchy
2. Fast loading times and good technical performance

⚡ QUICK WINS:
1. Add alt text to 5 images missing descriptions
2. Optimize meta description length for better click-through rates
```

## SEO Analysis Categories 📊

The tool analyzes these key SEO factors:

| Category | What it Checks |
|----------|----------------|
| **Title Tags** | Length, uniqueness, keyword inclusion |
| **Meta Descriptions** | Length, compelling copy, keyword usage |
| **Headings** | H1-H6 hierarchy, keyword usage, structure |
| **Content** | Quality, length, keyword density, readability |
| **Images** | Alt text, file names, optimization |
| **Links** | Internal/external linking, anchor text |
| **Technical** | Page structure, schema markup, accessibility |

## Issue Severity Levels 🚨

- **🚨 Critical**: Severely impacts SEO (missing titles, broken structure)
- **⚠️ High**: Important issues to fix soon (poor meta descriptions, missing H1)
- **🔶 Medium**: Optimization opportunities (image alt text, internal linking)
- **ℹ️ Low**: Minor improvements (keyword density, content length)

## Output Files 📁

Analysis results are saved as JSON files:
- **Filename**: `seo-analysis-{domain}-{timestamp}.json`
- **Content**: Complete analysis data including URL, timestamp, and all findings
- **Use Case**: Track improvements over time, share with team members

## Integration Options 🔧

### Use as a Module

```typescript
import { analyzeSEO } from './SEO-Analyzer';

const analysis = await analyzeSEO('https://example.com');
if (analysis) {
  console.log(`SEO Score: ${analysis.overall_score}/100`);
  console.log(`Issues found: ${analysis.issues.length}`);
}
```

### Web Interface Integration

The tool can be easily integrated into:
- Next.js applications
- Express.js APIs
- React dashboards
- Chrome extensions

## Troubleshooting 🐛

**Common Issues:**

1. **"API Key not found"**
   - Ensure `.env` file exists with correct API keys
   - Check that environment variables are properly loaded

2. **"Scrape failed"**
   - Website might be blocking scrapers
   - Check if URL is accessible and valid
   - Some sites require authentication

3. **"No content found"**
   - Website might be heavily JavaScript-based
   - Content might be dynamically loaded
   - Try a different URL or page

## Examples 💡

**Good for analyzing:**
- Blog posts and articles
- Product pages
- Landing pages
- Company websites
- E-commerce pages

**Best practices:**
- Analyze multiple pages from your site
- Run analysis before and after SEO changes
- Focus on critical and high-priority issues first
- Monitor scores over time

## API Costs 💰

- **Hyperbrowser**: ~$0.01-0.05 per analysis (depending on page size)
- **OpenAI GPT-4**: ~$0.03-0.10 per analysis (depending on content length)

## Contributing 🤝

Feel free to submit issues, feature requests, or pull requests to improve the tool!

## License 📝

MIT License - feel free to use this tool for your SEO analysis needs!
