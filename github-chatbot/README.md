# GitHub Repository Chatbot 🤖

An intelligent chatbot that scrapes GitHub repositories and answers questions about their content using AI. Simply provide a GitHub repository URL, and the bot will analyze the codebase, documentation, and repository structure to answer your questions.

## Features

- 🔍 **Repository Scraping**: Automatically scrapes GitHub repositories including README files, code structure, and metadata
- 🤖 **AI-Powered Responses**: Uses OpenAI's GPT-4o-mini to provide intelligent answers about the repository
- 💬 **Interactive Chat**: Real-time question and answer interface
- 📊 **Comprehensive Analysis**: Analyzes file structure, documentation, issues, pull requests, and more

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- OpenAI API key
- Hyperbrowser API key

## Installation

1. Clone this repository:
```bash
git clone <your-repo-url>
cd github-chatbot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key
OPENAI_API_KEY=your_openai_api_key
```

## Getting API Keys

### Hyperbrowser API Key
Get your Hyperbrowser API key at **[hyperbrowser.ai](https://hyperbrowser.ai)**

### OpenAI API Key
1. Visit [OpenAI's platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key

## Usage

1. Compile the TypeScript code:
```bash
npx tsc
```

2. Run the chatbot:
```bash
node github-chatbot.js
```

3. Follow the prompts:
   - Enter a GitHub repository URL when prompted
   - Wait for the repository to be scraped and analyzed
   - Start asking questions about the repository!

### Example Usage

```
🔗 Enter GitHub repository URL: https://github.com/microsoft/vscode
🔎 Scraping GitHub repository: https://github.com/microsoft/vscode
🤖 Ready to chat about this repository!

💬 Ask a question (or type 'exit' to quit): What is this repository about?
🤖 This is the Visual Studio Code repository, a free and open-source code editor developed by Microsoft...

💬 Ask a question (or type 'exit' to quit): What programming languages are used?
🤖 The repository primarily uses TypeScript (78.2%), JavaScript (12.1%), CSS (4.8%)...
```

## What Can You Ask?

The chatbot can answer questions about:
- Repository purpose and description
- Programming languages used
- File structure and organization
- Recent commits and changes
- Issues and pull requests
- Documentation content
- Installation and setup instructions
- Code functionality and features

## Technical Details

- **Web Scraping**: Uses Hyperbrowser SDK for intelligent GitHub scraping
- **AI Processing**: Leverages OpenAI's GPT-4o-mini for natural language processing
- **Data Extraction**: Focuses on markdown content, file structures, and repository metadata
- **Interactive Interface**: Built with readline-sync for seamless command-line interaction

## Limitations

- Requires valid API keys for both Hyperbrowser and OpenAI
- Scraping large repositories may take some time
- Responses are based on publicly available repository information
- Rate limits may apply based on your API plan

## Troubleshooting

**Scraping failed error**: 
- Ensure the GitHub URL is valid and publicly accessible
- Check your Hyperbrowser API key is correct

**OpenAI errors**:
- Verify your OpenAI API key is valid
- Ensure you have sufficient API credits

**TypeScript compilation errors**:
- Run `npm install` to ensure all dependencies are installed
- Check that you're using Node.js v16 or higher

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve this chatbot!

## License

This project is licensed under the ISC License.
