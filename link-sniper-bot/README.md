# Link Sniper Bot

Automatically scan any webpage to find and check all external links for broken ones.

## Setup

1. Get your API key from https://hyperbrowser.ai
2. Create a `.env` file with:
   ```
   HYPERBROWSER_API_KEY=your_api_key_here
   ```
3. Install dependencies: `npm install`
4. Run: `npm start`

Enter any URL and the bot will extract all external links, check their status, and categorize them as working, broken, bot-blocked, or suspicious.
