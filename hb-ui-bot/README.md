# HB UI Bot 🎨📸

A powerful UI analysis tool that captures website screenshots using Hyperbrowser's official SDK and leverages OpenAI Vision for intelligent design analysis and improvement suggestions.

## Features

- 📸 **Screenshot Capture**: Uses Hyperbrowser's official screenshot API to capture actual website visuals
- 🧠 **AI Vision Analysis**: OpenAI GPT-4o analyzes screenshots for comprehensive UI/UX insights
- 🎨 **Color Detection**: Automatically extracts colors from HTML and visual analysis
- 🖋️ **Font Analysis**: Identifies typography choices and hierarchy
- 💡 **Smart Suggestions**: AI-powered improvement recommendations
- 🔍 **Accessibility Review**: Identifies potential accessibility issues
- 📊 **Flexible Output**: Human-readable or JSON format
- 🎯 **Visual Analysis**: Analyzes actual appearance, not just code structure

## What's New

🚀 **Now with Visual Analysis!** Instead of just parsing CSS, the bot captures actual screenshots and uses OpenAI's vision capabilities to provide intelligent analysis of:

- **Visual Design**: Layout, composition, and visual hierarchy
- **Color Schemes**: Actual colors as they appear to users
- **Typography**: Font choices and text readability
- **UI/UX Issues**: Real usability problems visible in screenshots
- **Accessibility**: Visual accessibility concerns
- **Modern Design Trends**: Current best practices

## Installation

```bash
npm install
```

## Configuration

### Getting API Keys

1. **Hyperbrowser API Key**: Get your API key from [https://hyperbrowser.ai](https://hyperbrowser.ai)
2. **OpenAI API Key**: Get your API key from [https://openai.com/api](https://openai.com/api) (optional, only needed for AI analysis)

### Setting Up Environment Variables

Set up your API keys as environment variables:

```bash
# Required: Hyperbrowser API Key
export HYPERBROWSER_API_KEY="your_hyperbrowser_api_key_here"

# Optional: OpenAI API Key (required for --analyze flag)
export OPENAI_API_KEY="your_openai_api_key_here"
```

Or create a `.env` file:
```
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage

### Basic Usage (Screenshot + Color/Font Extraction)
```bash
npx ts-node hb-ui-bot.ts --url https://example.com
```

### With AI Visual Analysis
```bash
npx ts-node hb-ui-bot.ts --url https://example.com --analyze
```

### JSON Output
```bash
npx ts-node hb-ui-bot.ts --url https://example.com --json
```

### Full Analysis with Custom API Keys
```bash
npx ts-node hb-ui-bot.ts --url https://example.com --key YOUR_HB_KEY --openai-key YOUR_OPENAI_KEY --analyze
```

## Command Line Options

- `-u, --url`: Target URL to analyze (required)
- `-k, --key`: Hyperbrowser API key (or use `HYPERBROWSER_API_KEY` env var)
- `--openai-key`: OpenAI API key (or use `OPENAI_API_KEY` env var)
- `--json`: Output results in JSON format
- `-a, --analyze`: Use OpenAI Vision to analyze the screenshot and provide insights
- `--help`: Show help information

## Example Output

### Without AI Analysis
```
🔍 Starting scrape job with screenshot...

🎨  Colors (4)
   • #ffffff
   • #000000
   • #1a73e8
   • rgba(255, 0, 0, 0.8)

🖋  Fonts (3)
   • Roboto
   • Arial
   • sans-serif
```

### With AI Visual Analysis
```
🔍 Starting scrape job with screenshot...
🧠 Analyzing UI screenshot with OpenAI Vision...

🎨  Colors (4)
   • #ffffff
   • #000000
   • #1a73e8
   • rgba(255, 0, 0, 0.8)

🖋  Fonts (3)
   • Roboto
   • Arial
   • sans-serif

🧠 AI Visual Analysis & Suggestions:
──────────────────────────────────────────────────
**Visual Summary**: The website features a clean, modern design with a white background and blue accent colors. The layout is well-structured with clear visual hierarchy...

**Colors**: Primary colors include white (#ffffff), dark text (#000000), and blue accent (#1a73e8) creating good contrast...

**Typography**: Uses modern sans-serif fonts with appropriate sizing and spacing...

**UI/UX Issues**: 
1. Some buttons could be more prominent
2. Navigation could be simplified
3. Call-to-action elements need better visibility

**Improvements**: 
1. Increase button sizes and contrast
2. Add more whitespace between sections
3. Implement consistent color scheme throughout

**Accessibility**: Ensure proper alt text for images and improve color contrast ratios...

**Modern Trends**: Consider implementing dark mode toggle, micro-interactions, and mobile-first responsive design...
```

## JSON Output Format

```json
{
  "colors": ["#ffffff", "#000000", "#1a73e8", "rgba(255, 0, 0, 0.8)"],
  "fonts": ["Roboto", "Arial", "sans-serif"],
  "analysis": "Detailed AI analysis of the screenshot...",
  "screenshotAvailable": true
}
```

## Technical Implementation

### Screenshot Capture
Uses Hyperbrowser's official `scrape.startAndWait()` method with:
- `formats: ['screenshot', 'html']` - captures both visual and structural data
- `timeout: 30000` - allows enough time for page loading
- `waitFor: 2000` - ensures page is fully rendered

### AI Vision Analysis
- **Model**: OpenAI GPT-4o with vision capabilities
- **Input**: Base64-encoded screenshot + analysis prompt
- **Output**: Comprehensive UI/UX analysis and recommendations

### Color & Font Detection
- **Colors**: Extracted from HTML using regex patterns for hex, rgb, and rgba values
- **Fonts**: Parsed from font-family declarations in the HTML
- **Enhanced**: AI provides additional visual color analysis from screenshots

## Requirements

- Node.js 16+
- TypeScript
- Hyperbrowser API key with screenshot permissions
- OpenAI API key (optional, for visual analysis features)

## Error Handling

The tool provides helpful error messages and tips:
- Missing API keys
- Authentication failures
- Screenshot capture issues
- Network timeouts
- Invalid URLs

## Performance Notes

- Screenshot capture typically takes 3-5 seconds
- AI analysis adds 2-3 seconds
- Total processing time: 5-10 seconds per URL
- Results are cached for the session

## License

ISC 