import { writeFileSync } from 'fs';
import { createHash } from 'crypto';
import axios from 'axios';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { config } from 'dotenv';
import chalk from 'chalk';
import { Hyperbrowser } from '@hyperbrowser/sdk';

config();

const argv = yargs(hideBin(process.argv))
  .option('topic', { type: 'string', demandOption: true, describe: 'Search query' })
  .option('sources', { type: 'string', describe: 'Comma-separated domains' })
  .option('max', { type: 'number', default: 200, describe: 'Max records' })
  .option('format', { choices: ['jsonl', 'csv'] as const, default: 'jsonl' as const })
  .option('out', { type: 'string', default: 'dataset' })
  .option('train-split', { type: 'number', default: 0.9 })
  .parseSync();

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const HYPERBROWSER_API_KEY = process.env.HYPERBROWSER_API_KEY;

if (!SERPER_API_KEY || !HYPERBROWSER_API_KEY) {
  console.error(chalk.red('❌ Missing API keys'));
  console.error(chalk.red(`SERPER_API_KEY: ${SERPER_API_KEY ? 'Set' : 'Missing'}`));
  console.error(chalk.red(`HYPERBROWSER_API_KEY: ${HYPERBROWSER_API_KEY ? 'Set' : 'Missing'}`));
  process.exit(1);
}

console.log(chalk.green(`🔑 API keys loaded successfully`));

// Initialize Hyperbrowser client
const hyperbrowser = new Hyperbrowser({
  apiKey: HYPERBROWSER_API_KEY,
});

// Search with Serper
async function search(query: string, domains?: string[]): Promise<string[]> {
  console.log(chalk.blue('🔍 Searching:'), query);
  
  const payload: any = { q: query };
  if (domains) payload.domains = domains;
  
  const response = await axios.post('https://google.serper.dev/search', payload, {
    headers: { 
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  const urls = response.data.organic?.map((r: any) => r.link) || [];
  console.log(chalk.green(`✅ Found ${urls.length} URLs`));
  return urls.slice(0, argv.max);
}

// Batch scrape with Hyperbrowser SDK
async function scrapeUrls(urls: string[]): Promise<any[]> {
  console.log(chalk.blue(`🔄 Batch scraping ${urls.length} URLs with Hyperbrowser SDK...`));
  
  try {
    // Use batch scrape if available (Ultra plan)
    const scrapeResult = await hyperbrowser.scrape.batch.startAndWait({
      urls,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
      },
    });
    
    console.log(chalk.green(`✅ Batch scraping completed`));
    
    return scrapeResult.data?.map((item: any) => ({
      url: item.url,
      title: item.metadata?.title || '',
      content: item.markdown || ''
    })) || [];
    
  } catch (error) {
    console.log(chalk.yellow('⚠️ Batch scrape failed, falling back to individual scraping...'));
    
    // Fallback to individual scraping
    const results = [];
    for (const url of urls) {
      try {
        console.log(chalk.blue('🌐 Scraping:'), chalk.dim(url));
        
        const scrapeResult = await hyperbrowser.scrape.startAndWait({
          url,
          scrapeOptions: {
            formats: ['markdown'],
            onlyMainContent: true,
          },
        });
        
        console.log(chalk.green('✅'), chalk.dim(url));
        results.push({
          url,
          title: scrapeResult.data?.metadata?.title || '',
          content: scrapeResult.data?.markdown || ''
        });
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(chalk.red('❌'), chalk.dim(url), (error as Error).message);
      }
    }
    
    return results;
  }
}

// Clean and dedupe
function dedupe(records: any[]): any[] {
  const seen = new Set();
  return records.filter(r => {
    if (!r?.content) return false;
    const hash = createHash('sha256').update(r.content).digest('hex');
    if (seen.has(hash)) return false;
    seen.add(hash);
    return true;
  });
}

// Write output
function writeOutput(data: any[], filename: string) {
  if (argv.format === 'jsonl') {
    const content = data.map(item => JSON.stringify(item)).join('\n');
    writeFileSync(filename, content);
  } else {
    const header = 'url,title,content\n';
    const rows = data.map(item => {
      const url = String(item.url || '');
      const title = String(item.title || '');
      const content = String(item.content || '');
      return `"${url}","${title.replace(/"/g, '""')}","${content.replace(/"/g, '""')}"`;
    }).join('\n');
    writeFileSync(filename, header + rows);
  }
}

async function main() {
  console.log(chalk.green.bold('🚀 Dataset Assembler'));
  console.log(chalk.green('Built with Hyperbrowser (https://hyperbrowser.ai)\n'));
  
  try {
    // 1. Search
    const domains = argv.sources?.split(',');
    const urls = await search(argv.topic, domains);
    
    // 2. Scrape URLs
    const results = await scrapeUrls(urls);
    
    // 3. Clean and dedupe
    const unique = dedupe(results);
    console.log(chalk.green(`✅ ${unique.length} unique records`));
    
    // 4. Split and save
    const trainSize = Math.floor(unique.length * argv['train-split']);
    const shuffled = unique.sort(() => Math.random() - 0.5);
    const train = shuffled.slice(0, trainSize);
    const evalSet = shuffled.slice(trainSize);
    
    writeOutput(train, `${argv.out}.train.${argv.format}`);
    writeOutput(evalSet, `${argv.out}.eval.${argv.format}`);
    
    console.log(chalk.green(`\n📊 Complete! Train: ${train.length}, Eval: ${evalSet.length}`));
    console.log(chalk.blue('Follow @hyperbrowser for updates.'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), (error as Error).message);
    process.exit(1);
  }
}

main();