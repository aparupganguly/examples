# Site Graph Crawler

A TypeScript-based web crawler that generates visual site maps, identifies orphan pages, and analyzes page sizes using the Hyperbrowser API.

## Features

- 🗺️ **Visual Site Map**: Generate ASCII tree-style site maps showing page hierarchy
- 🔍 **Orphan Page Detection**: Identify pages with no inbound links
- 📊 **Page Size Analysis**: Display the heaviest pages by content size
- 🌐 **Domain-focused Crawling**: Only follows links within the same domain
- 🎨 **Colorized Output**: Beautiful terminal output with syntax highlighting

## Prerequisites

- Node.js 18+ (for ES modules and top-level await support)
- TypeScript
- A Hyperbrowser API key

## Installation

1. Clone or download this project
2. Install dependencies:

```bash
npm install
```

## Getting Your API Key

1. Visit [hyperbrowser.ai](https://hyperbrowser.ai)
2. Sign up for an account or log in
3. Navigate to your dashboard/API section
4. Generate a new API key
5. Copy the API key for use in the next step

## Configuration

Create a `.env` file in the project root and add your Hyperbrowser API key:

```env
HYPERBROWSER_API_KEY=your_api_key_here
```

## Usage

### Running the Crawler

```bash
npm run dev
# or
npx ts-node site-graph.ts
```

### Interactive Prompts

The script will prompt you for:

1. **Site URL**: Enter the website you want to crawl (must include `http://` or `https://`)
2. **Max Pages**: Maximum number of pages to crawl (default: 30, which is 3 * 10)

### Example Session

```
$ npx ts-node site-graph.ts
Enter site URL to crawl: https://example.com
Max depth (default 3): 5

🔍 Crawling https://example.com (depth 5) …

Site map
/
  /about
  /contact
  /blog
    /blog/post-1
    /blog/post-2
  /services

Orphan pages
• /old-page
• /forgotten-section

Heaviest paths
┌────────────────────────────────────────┬──────────┐
│ Path                                   │ KB       │
├────────────────────────────────────────┼──────────┤
│ /                                      │ 245.7    │
│ /about                                 │ 123.4    │
│ /services                              │ 98.2     │
│ /contact                               │ 67.8     │
│ /blog                                  │ 45.3     │
└────────────────────────────────────────┴──────────┘
```

## Output Explanation

### Site Map
Shows the hierarchical structure of your website as discovered through link crawling. Pages are displayed in a tree format showing the relationship between parent and child pages.

### Orphan Pages
Lists pages that were found during crawling but have no inbound links from other pages on your site. These might be:
- Old pages that should be removed
- Pages that need better internal linking
- Landing pages accessed through external links only

### Heaviest Pages
A table showing the top 10 largest pages by content size, which can help identify:
- Pages that might be slow to load
- Content that could be optimized
- Resource-heavy pages that need attention

## Technical Details

- **Language**: TypeScript with ES modules
- **Crawling**: Uses Hyperbrowser's cloud-based crawling service
- **Domain Parsing**: Uses `tldts` for reliable domain extraction
- **Output**: Styled with `chalk` and `cli-table3` for beautiful terminal display

## Configuration Options

You can modify the crawler behavior by editing the `StartCrawlJobParams` in `site-graph.ts`:

```typescript
const crawlResult = await client.crawl.startAndWait({
  url: target,
  maxPages: depth * 10,     // Maximum pages to crawl
  followLinks: true,        // Follow links to discover new pages
  scrapeOptions: {
    formats: ['links']      // Extract link information
  }
});
```

## Troubleshooting

### Common Issues

1. **"Set HYPERBROWSER_API_KEY in env" Error**
   - Make sure you've created a `.env` file with your API key
   - Verify the API key is correct and active

2. **Module Resolution Errors**
   - Ensure you're using Node.js 18+ for proper ES module support
   - Run `npm install` to ensure all dependencies are installed

3. **TypeScript Compilation Errors**
   - Run `npx tsc --noEmit` to check for type errors
   - Ensure your `tsconfig.json` matches the project requirements

4. **Empty Results**
   - Check that the target URL is accessible
   - Verify the site allows crawling (check robots.txt)
   - Try a smaller depth/maxPages value

## Dependencies

- `@hyperbrowser/sdk` - Cloud-based web crawling service
- `chalk` - Terminal styling and colors
- `cli-table3` - ASCII table formatting
- `dotenv` - Environment variable management
- `tldts` - Domain parsing and validation
- `readline/promises` - Interactive command-line input

## License

ISC

## Contributing

Feel free to submit issues and enhancement requests!
