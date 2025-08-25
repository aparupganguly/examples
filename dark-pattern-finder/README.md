# Dark Pattern Finder

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

A CLI tool that scans websites for dark patterns using AI-powered analysis. Detects deceptive UX practices like fake scarcity, hidden fees, obstruction tactics, and more.

## Quick Start

1. **Get an API key** at [hyperbrowser.ai](https://hyperbrowser.ai)
2. Set up environment variables:
```bash
export HYPERBROWSER_API_KEY="your_key_here"
export GROQ_API_KEY="your_groq_key_here"
```

3. Install and run:
```bash
npm install
npx tsx dark-pattern-finder.ts scan https://example.com
```

## Usage

Scan single or multiple websites:
```bash
# Single site
npx tsx dark-pattern-finder.ts scan https://example.com

# Multiple sites
npx tsx dark-pattern-finder.ts scan https://site1.com https://site2.com
```

## What It Detects

- **Scarcity**: Fake urgency and countdown timers
- **Obstruction**: Difficult cancellation flows
- **Sneaking**: Hidden costs and pre-checked boxes
- **Misdirection**: Misleading buttons and buried info
- **Forced Action**: Required signups and sharing
- **Hidden Fees**: Surprise charges at checkout

## Documentation

Full API documentation: [docs.hyperbrowser.ai](https://docs.hyperbrowser.ai)

Follow [@hyperbrowser](https://twitter.com/hyperbrowser) for updates.
