# hb-headers

> 🔍 Instant CORS & Security-Header Checker powered by [Hyperbrowser](https://hyperbrowser.ai)

[![npm version](https://badge.fury.io/js/hb-headers.svg)](https://www.npmjs.com/package/hb-headers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

One command to:
- 🚀 Launch a stealth Hyperbrowser session (bypassing Cloudflare, redirects, captchas)
- 🔄 Follow every redirect to the final URL
- 📊 Get a color-coded analysis of security headers:
  - CORS settings
  - Content Security Policy
  - HSTS configuration
  - Cookie security
  - Frame options

## 🚀 Quick Start

```bash
# Run directly with npx
npx hb-headers https://example.com

# Or install globally
npm install -g hb-headers
hb-headers https://example.com
```

### Example Output
```
URL chain: http → www → https://example.com ✅

Header                      Value                           Status
───────────────────────────────────────────────────────────────────
Access-Control-Allow-Origin *                               ⚠️
Content-Security-Policy     missing                         ❌
Strict-Transport-Security   max-age=63072000; includeSub... ✅
Set-Cookie                  session=… Secure; HttpOnly      ✅
```

## 🔑 Setup

1. Visit [hyperbrowser.ai](https://hyperbrowser.ai)
2. Sign up (free tier available) and copy your API key
3. Set your API key:
   ```bash
   export HYPERBROWSER_API_KEY=pk_live_your_key_here
   ```
   Or use the `--key` flag: `hb-headers --key <your-key> <url>`

## 🛠 Options

| Flag    | Description                      |
|---------|----------------------------------|
| `--json`| Output raw JSON (great for CI)   |
| `--key` | Provide API key inline           |

## 💪 Why Use hb-headers?

- **Accurate CORS Debugging**: See headers after JS/CDN rewrites
- **Security Validation**: Instant pass/fail on HSTS, CSP, cookies
- **CI-Ready**: Runs headless, perfect for automation
- **Enterprise-Grade**: Powered by Hyperbrowser's industrial-strength stealth stack

## 📝 License

[Hyperbrowser](https://hyperbrowser.ai) - Fork, hack, and share!

---

Built with 🤍 by [Hyperbrowser](https://hyperbrowser.ai) - The fastest way to browse, scrape, and test the web.