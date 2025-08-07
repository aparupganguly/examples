#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as cheerio from 'cheerio';
import { Hyperbrowser } from '@hyperbrowser/sdk';

dotenv.config();

interface PromptBlock {
  url: string;
  title: string;
  content: string;
  tokens: number;
  hash: string;
}

interface Stats {
  totalUrls: number;
  successfulScrapes: number;
  failedScrapes: number;
  totalTokens: number;
  deduplicatedBlocks: number;
  finalBlocks: number;
  llmCompressed: boolean;
}

// Simple token counter (rough estimation)
function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Generate hash for deduplication
function generateHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Jaccard similarity for deduplication
function jaccardSimilarity(text1: string, text2: string): number {
  const set1 = new Set(text1.toLowerCase().split(/\s+/));
  const set2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

// Clean HTML content
function cleanHtml(html: string, url: string): { title: string; content: string } {
  const $ = cheerio.load(html);
  
  // Extract title
  const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
  
  // Remove unwanted elements
  $('script, style, nav, footer, header, aside, .menu, .sidebar, .ad, .advertisement').remove();
  
  // Extract meaningful content
  const contentParts: string[] = [];
  
  // Add headings
  $('h1, h2, h3').each((_: number, el: any) => {
    const text = $(el).text().trim();
    if (text && text.length > 5) {
      contentParts.push(`# ${text}`);
    }
  });
  
  // Add paragraphs
  $('p').each((_: number, el: any) => {
    const text = $(el).text().trim();
    if (text && text.length > 20) {
      contentParts.push(text);
    }
  });
  
  // Add list items
  $('li').each((_: number, el: any) => {
    const text = $(el).text().trim();
    if (text && text.length > 10) {
      contentParts.push(`- ${text}`);
    }
  });
  
  // Add code blocks
  $('pre, code').each((_: number, el: any) => {
    const text = $(el).text().trim();
    if (text && text.length > 5) {
      contentParts.push(`\`\`\`\n${text}\n\`\`\``);
    }
  });
  
  return {
    title,
    content: contentParts.join('\n\n').slice(0, 3000) // Limit content size
  };
}

// Compress content using OpenAI (if available)
async function compressWithLLM(content: string): Promise<string> {
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [{
        role: 'user',
        content: `Compress this content into key insights, preserving technical details. Keep under 100 tokens:\n\n${content}`
      }],
      max_tokens: 100
    });
    
    return response.choices[0]?.message?.content || content;
  } catch (error) {
    return content; // Fallback to original content
  }
}

// Heuristic compression
function compressHeuristic(content: string): string {
  const lines = content.split('\n').filter(line => line.trim());
  const important = lines.filter(line => {
    const lower = line.toLowerCase();
    return lower.includes('key') || lower.includes('important') || 
           lower.includes('main') || lower.includes('summary') ||
           line.startsWith('#') || line.startsWith('-');
  });
  
  return important.slice(0, 10).join('\n');
}

// Create prompt blocks
function createBlocks(content: string, url: string, title: string): PromptBlock[] {
  const maxTokensPerBlock = 120;
  const sentences = content.split(/[.!?]\s+/);
  const blocks: PromptBlock[] = [];
  
  let currentBlock = '';
  for (const sentence of sentences) {
    const testBlock = currentBlock + (currentBlock ? '. ' : '') + sentence;
    
    if (countTokens(testBlock) <= maxTokensPerBlock) {
      currentBlock = testBlock;
    } else {
      if (currentBlock) {
        blocks.push({
          url,
          title,
          content: currentBlock,
          tokens: countTokens(currentBlock),
          hash: generateHash(currentBlock)
        });
      }
      currentBlock = sentence;
    }
  }
  
  if (currentBlock) {
    blocks.push({
      url,
      title,
      content: currentBlock,
      tokens: countTokens(currentBlock),
      hash: generateHash(currentBlock)
    });
  }
  
  return blocks;
}

// Deduplicate blocks
function deduplicateBlocks(blocks: PromptBlock[]): PromptBlock[] {
  const unique: PromptBlock[] = [];
  
  for (const block of blocks) {
    const isDuplicate = unique.some(existing => 
      jaccardSimilarity(block.content, existing.content) >= 0.8
    );
    
    if (!isDuplicate) {
      unique.push(block);
    }
  }
  
  return unique;
}

// Main CLI function
async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('url', {
      type: 'array',
      string: true,
      description: 'URLs to scrape (repeatable)'
    })
    .option('urls', {
      type: 'string',
      description: 'File containing newline-separated URLs'
    })
    .option('budget', {
      type: 'number',
      default: 8000,
      description: 'Total token budget'
    })
    .option('out', {
      type: 'string',
      default: 'distill',
      description: 'Output directory'
    })
    .option('llm', {
      type: 'boolean',
      default: false,
      description: 'Enable OpenAI compression'
    })
    .help()
    .argv;

  // Collect URLs
  const urls: string[] = [];
  
  if (argv.url) {
    urls.push(...argv.url);
  }
  
  if (argv.urls) {
    try {
      const fileContent = fs.readFileSync(argv.urls, 'utf-8');
      const fileUrls = fileContent.split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line && line.startsWith('http'));
      urls.push(...fileUrls);
    } catch (error) {
      console.error(`[ERROR] Failed to read URLs file: ${argv.urls}`);
      process.exit(1);
    }
  }
  
  if (urls.length === 0) {
    console.error('[ERROR] No URLs provided. Use --url or --urls flags.');
    process.exit(1);
  }

  // Initialize Hyperbrowser
  const apiKey = process.env.HYPERBROWSER_API_KEY;
  if (!apiKey) {
    console.error('[ERROR] HYPERBROWSER_API_KEY environment variable is required');
    process.exit(1);
  }

  const hbClient = new Hyperbrowser({ apiKey });
  
  console.log(`[START] Processing ${urls.length} URLs with budget ${argv.budget} tokens`);
  
  const stats: Stats = {
    totalUrls: urls.length,
    successfulScrapes: 0,
    failedScrapes: 0,
    totalTokens: 0,
    deduplicatedBlocks: 0,
    finalBlocks: 0,
    llmCompressed: argv.llm && !!process.env.OPENAI_API_KEY
  };
  
  const allBlocks: PromptBlock[] = [];
  
  // Process each URL
  for (const url of urls) {
    try {
      console.log(`[FETCH] ${url}`);
      
      const result = await hbClient.scrape.startAndWait({
        url,
      });
      
      if (result.data?.markdown || result.data?.html) {
        const title = Array.isArray(result.data?.metadata?.title) 
          ? result.data.metadata.title[0] 
          : result.data?.metadata?.title || 'Untitled';
        const content = result.data.markdown || (result.data.html ? cleanHtml(result.data.html, url).content : '');
        
        if (content.trim()) {
          let processedContent = content;
          
          if (argv.llm && process.env.OPENAI_API_KEY) {
            processedContent = await compressWithLLM(content);
          } else {
            processedContent = compressHeuristic(content);
          }
          
          const blocks = createBlocks(processedContent, url, title);
          allBlocks.push(...blocks);
          stats.successfulScrapes++;
          
          console.log(`[SCRAPED] ${title} - ${blocks.length} blocks`);
        }
      } else {
        console.log(`[WARNING] No markdown or HTML data found in result for ${url}`);
      }
    } catch (error) {
      console.error(`[FAILED] ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // console.error(`[ERROR DETAILS]`, error);
      stats.failedScrapes++;
    }
  }
  
  // Note: Hyperbrowser client doesn't need explicit shutdown
  
  // Deduplicate and apply budget
  const uniqueBlocks = deduplicateBlocks(allBlocks);
  stats.deduplicatedBlocks = uniqueBlocks.length;
  
  const finalBlocks: PromptBlock[] = [];
  let usedTokens = 0;
  
  for (const block of uniqueBlocks) {
    if (usedTokens + block.tokens <= argv.budget) {
      finalBlocks.push(block);
      usedTokens += block.tokens;
    } else {
      break;
    }
  }
  
  stats.totalTokens = usedTokens;
  stats.finalBlocks = finalBlocks.length;
  
  // Create output directory
  if (!fs.existsSync(argv.out)) {
    fs.mkdirSync(argv.out, { recursive: true });
  }
  
  // Write outputs
  const jsonlPath = path.join(argv.out, 'prompts.jsonl');
  const csvPath = path.join(argv.out, 'prompts.csv');
  const citationsPath = path.join(argv.out, 'citations.md');
  const statsPath = path.join(argv.out, 'stats.json');
  
  // Write JSONL
  const jsonlContent = finalBlocks.map(block => 
    JSON.stringify({ 
      prompt: block.content, 
      metadata: { url: block.url, title: block.title, tokens: block.tokens }
    })
  ).join('\n');
  fs.writeFileSync(jsonlPath, jsonlContent);
  
  // Write CSV
  const csvContent = [
    'url,title,content,tokens',
    ...finalBlocks.map(block => 
      `"${block.url}","${block.title}","${block.content.replace(/"/g, '""')}",${block.tokens}`
    )
  ].join('\n');
  fs.writeFileSync(csvPath, csvContent);
  
  // Write citations
  const citationsContent = [
    '# Citations',
    '',
    ...Array.from(new Set(finalBlocks.map(b => b.url))).map((url, i) => 
      `${i + 1}. [${finalBlocks.find(b => b.url === url)?.title || 'Untitled'}](${url})`
    )
  ].join('\n');
  fs.writeFileSync(citationsPath, citationsContent);
  
  // Write stats
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  
  console.log(`[DONE] Generated ${stats.finalBlocks} blocks (${stats.totalTokens} tokens) in ${argv.out}/`);
  console.log(`[STATS] Success: ${stats.successfulScrapes}/${stats.totalUrls}, Deduplicated: ${allBlocks.length} -> ${stats.deduplicatedBlocks}`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('[FATAL]', error);
    process.exit(1);
  });
}
