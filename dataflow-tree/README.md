# DataFlowTree

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

A CLI tool that analyzes websites for PII data collection and privacy compliance. Uses AI to detect forms, tracking scripts, and personal data flows.

## Features

🔍 **Detects PII collection** - Forms collecting email, phone, addresses, payment info  
📊 **Analytics tracking** - Google Analytics, Segment, Facebook pixels  
🌳 **Visual flow trees** - Colored ASCII output showing data flows  
🚨 **CI mode** - Alerts on new PII endpoints for compliance monitoring  

## Setup

1. **Get an API key** at https://hyperbrowser.ai

2. **Create environment file:**
   ```bash
   echo "HYPERBROWSER_API_KEY=your_api_key_here" > .env
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

## Usage

**Analyze a website:**
```bash
npx ts-node index.ts --url https://example.com
```

**JSON output:**
```bash
npx ts-node index.ts --url https://github.com --json
```

**CI mode (exits 1 on new PII):**
```bash
npx ts-node index.ts --url https://openai.com --ci
```

**Help:**
```bash
npx ts-node index.ts --help
```

## Output

```
🌳 Data Flow Tree:
https://github.com
├─ POST /api/form   [PII: email, password, name]
└─ POST /collect   [Analytics]

📊 Summary:
🔴 PII requests: 1
🔵 Analytics requests: 1
⚪ Business requests: 1
```

Results are saved to `out/flows.json` for further analysis.

---

Follow @hyperbrowser_ai for updates.
