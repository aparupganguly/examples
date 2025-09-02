**Built with [Hyperbrowser](https://hyperbrowser.ai)**

### Internet Zip (kzip)
Minimal CLI that scrapes any URL with Hyperbrowser and compresses it into a semantic knowledge shard (`.kzip.json`). Great for building growth-data archives from live pages (e.g., auto-curated summaries, link graphs, and key points to power sign-ups and content workflows).

### Get an API key
- Get your key at `https://hyperbrowser.ai`

### Setup
```bash
npm i
npm i -D @types/node
```

Create a `.env` in this folder:
```bash
echo "HYPERBROWSER_API_KEY=YOUR_KEY_HERE" > .env
```

### Quick start
```bash
npx ts-node kzip.ts <url> [--out file.kzip.json]

# Example
npx ts-node kzip.ts https://news.ycombinator.com --out hn.kzip.json
```

### What it does
- **Scrape**: Uses Hyperbrowser SDK `scrape.startAndWait(...)` to fetch HTML and metadata
- **Compress**: Calls `extract.startAndWait(...)` to generate summary, 5 key points, and outbound links
- **Save**: Writes `<hostname>.kzip.json` (or `--out`), printing compression ratio

### Output format (.kzip.json)
```json
{
  "url": "https://example.com/",
  "scrapedAt": "2025-01-01T00:00:00.000Z",
  "title": "...",
  "summary": "...",
  "keyPoints": ["..."],
  "outboundLinks": ["https://..."],
  "rawSize": 12345,
  "compressedSize": 1111
}
```

### Notes
- Uses only official Hyperbrowser SDK methods (`@hyperbrowser/sdk`). No mock data.
- Default output name is `<hostname>.kzip.json` if `--out` is omitted.

Follow @hyperbrowser for updates.


