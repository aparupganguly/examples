import 'dotenv/config';
import readline from 'readline/promises';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Hyperbrowser } from '@hyperbrowser/sdk';
import { parse } from 'tldts';

const HB_KEY = process.env.HYPERBROWSER_API_KEY;
if (!HB_KEY) throw new Error('Set HYPERBROWSER_API_KEY in env.');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const target = (await rl.question('Enter site URL to crawl: ')).trim();
const depthIn = await rl.question('Max depth (default 3): ');
rl.close();
const depth = Number(depthIn) || 3;

if (!/^https?:\/\//.test(target)) {
  console.error('URL must start with http:// or https://');
  process.exit(1);
}

const client = new Hyperbrowser({ apiKey: HB_KEY });

console.log(chalk.cyan(`\n🔍 Crawling ${target} (depth ${depth}) …`));

const crawlResult = await client.crawl.startAndWait({
  url: target,
  maxPages: depth * 10, 
  followLinks: true,
  scrapeOptions: {
    formats: ['links', 'html', 'markdown']
  }
});

const origin = parse(target).domain!;
type PageMeta = { links: Set<string>; bytes: number };
const pages: Record<string, PageMeta> = {};

for (const p of crawlResult.data || []) {
  const path = new URL(p.url).pathname || '/';
  const estimatedBytes = (p.html?.length || 0) + (p.markdown?.length || 0);
  pages[path] = pages[path] || { links: new Set(), bytes: estimatedBytes };
  (p.links || [])
    .filter((l: string) => parse(l).domain === origin)
    .forEach((l: string) => pages[path].links.add(new URL(l).pathname || '/'));
}

console.log(chalk.bold('\nSite map'));
const seen = new Set<string>();
const print = (p = '/', ind = '') => {
  console.log(ind + chalk.green(p));
  seen.add(p);
  pages[p]?.links.forEach(l => !seen.has(l) && print(l, ind + '  '));
};
print();

/* orphans */
const inbound = new Map<string, number>();
Object.values(pages).forEach(m => m.links.forEach(l => inbound.set(l, (inbound.get(l) || 0) + 1)));
const orphans = Object.keys(pages).filter(p => !inbound.has(p) && p !== '/');
if (orphans.length) {
  console.log(chalk.bold('\nOrphan pages'));
  orphans.forEach(o => console.log('•', chalk.yellow(o)));
}

const tbl = new Table({ head: ['Path', 'KB'], colWidths: [40, 10], style: { head: ['cyan'] } });
Object.entries(pages)
  .sort((a, b) => b[1].bytes - a[1].bytes)
  .slice(0, 10)
  .forEach(([p, m]) => tbl.push([p, (m.bytes / 1024).toFixed(1)]));
console.log(chalk.bold('\nHeaviest paths'));
console.log(tbl.toString());