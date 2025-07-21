# 🕵️ DeepForm

**Automatically reverse-engineer any website's form flows with AI-powered analysis.**

DeepForm is a CLI app that uses Hyperbrowser to automatically reverse-engineer any website's form flows — identifying input fields, validation rules, submission logic, and UI patterns — so developers can understand, replicate, or debug them instantly without inspecting code manually.

## ✨ Features

- 🔍 **Intelligent Form Detection** - Automatically discovers all input fields on any webpage
- 🛡️ **Security Analysis** - AI-powered detection of phishing patterns and suspicious form behaviors
- 🚀 **Fast Scanning** - Powered by Hyperbrowser's headless browser technology
- 🎯 **Developer-Friendly** - Clean, actionable insights for form structure analysis
- 🎨 **Beautiful CLI** - Color-coded output with emoji indicators

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- Hyperbrowser API key from [hyperbrowser.ai](https://hyperbrowser.ai)
- OpenAI API key from [openai.com](https://openai.com)

### Installation

1. **Clone or download this project**
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the project root:
   ```env
   HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

### Getting API Keys

- **Hyperbrowser API Key**: Sign up at [hyperbrowser.ai](https://hyperbrowser.ai) to get your API key
- **OpenAI API Key**: Get your API key from [openai.com](https://openai.com)

## 🎯 Usage

Run DeepForm with:

```bash
npx tsx index.ts
```

Then enter any URL when prompted:

```
🔗 Enter URL to scan: https://example.com
```

DeepForm will:
1. 🕷️ Scrape the webpage using Hyperbrowser
2. 🔎 Extract all form input fields
3. 🧠 Analyze the form structure with AI
4. 📋 Provide security insights and recommendations

## 📊 Example Output

```
🔗 Enter URL to scan: https://login.example.com

⚙️  Scraping with Hyperbrowser...

✅ Found 3 inputs:
1. <input type="text" name="username" placeholder="Username">...
2. <input type="password" name="password" placeholder="Password">...
3. <input type="hidden" name="csrf_token" value="abc123">...

🧠 Analyzing form structure with OpenAI...

📋 Security Analysis:

This appears to be a standard login form with proper security measures:
- Username and password fields are correctly configured
- CSRF token present for protection against cross-site attacks
- No suspicious hidden fields or unusual patterns detected
- Standard field naming conventions used
```

## 🛠️ How It Works

1. **Web Scraping**: Uses Hyperbrowser's powerful browser automation to access any website
2. **Form Extraction**: Intelligently parses HTML to find all input elements
3. **AI Analysis**: Leverages OpenAI's GPT models to analyze form patterns and identify potential security issues
4. **Actionable Insights**: Provides clear, developer-friendly analysis of form structure and security

## 🔒 Security & Privacy

- All web scraping is done through Hyperbrowser's secure infrastructure
- No sensitive data is stored locally
- API keys are kept in environment variables
- Form analysis helps identify potential security vulnerabilities

## 💡 Use Cases

- **Security Auditing**: Identify phishing attempts and suspicious form patterns
- **Competitive Analysis**: Understand how other websites structure their forms
- **Development Research**: Learn form best practices from successful sites
- **QA Testing**: Verify form implementations across different websites
- **Accessibility Review**: Analyze form field labeling and structure

## 🚦 Requirements

- Node.js 16 or higher
- Valid Hyperbrowser API key
- Valid OpenAI API key
- Internet connection for API calls

## 🎨 Tech Stack

- **TypeScript** - Type-safe development
- **Hyperbrowser SDK** - Web scraping and browser automation
- **OpenAI GPT-4** - AI-powered form analysis
- **Chalk** - Beautiful terminal colors
- **Dotenv** - Environment variable management

## 🆘 Troubleshooting

**"Cannot find module" errors**: Run `npm install` to install dependencies

**API key errors**: Make sure your `.env` file is in the project root with valid API keys

**Scraping fails**: Some websites may block automated access - try different URLs

**No forms found**: The website might use dynamic forms loaded with JavaScript

---

**Ready to analyze forms like never before?** Get started at [hyperbrowser.ai](https://hyperbrowser.ai) 🚀 