import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Hyperbrowser } from '@hyperbrowser/sdk';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

interface Chunk {
  content: string;
  tokens: number;
  source: string;
  rank: number;
}

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

const progressBar = (current: number, total: number): string => {
  const percent = current / total;
  const filled = Math.round(30 * percent);
  return `[${'█'.repeat(filled)}${' '.repeat(30 - filled)}] ${current}/${total}`;
};

const cleanHtml = (html: string, url: string): string[] => {
  const $ = cheerio.load(html);
  $('script, style, nav, footer, aside, form, button, iframe, .sidebar, .nav, .footer, .header').remove();
  
  const segments: string[] = [];
  
  // Extract title
  const title = $('title').text().trim();
  if (title && title.length >= 10) segments.push(title);
  
  // Extract meaningful content
  $('h1, h2, h3, h4, p, li, blockquote, code, pre').each((_: number, el: any) => {
    const text = $(el).text().trim();
    if (text && text.length >= 20 && text.length <= 2000) {
      segments.push(text);
    }
  });
  
  return segments
    .map(seg => seg.replace(/\s+/g, ' ').trim())
    .filter(seg => seg.length >= 40)
    .filter((seg, idx, arr) => arr.indexOf(seg) === idx);
};

const createChunks = (segments: string[], url: string): Chunk[] => {
  const chunks: Chunk[] = [];
  let current = '';
  let chunkId = 0;
  
  for (const segment of segments) {
    const combined = current ? `${current}\n\n${segment}` : segment;
    const tokens = estimateTokens(combined);
    const currentTokens = estimateTokens(current);
    
    if (tokens <= 800 && current) {
      current = combined;
    } else {
      if (current && currentTokens >= 20) {
        chunks.push({
          content: current,
          tokens: currentTokens,
          source: `${url}#chunk${chunkId}`,
          rank: current.split(/\s+/).length
        });
        chunkId++;
      }
      current = segment;
    }
  }
  
  const finalTokens = estimateTokens(current);
  if (current && finalTokens >= 20) {
    chunks.push({
      content: current,
      tokens: finalTokens,
      source: `${url}#chunk${chunkId}`,
      rank: current.split(/\s+/).length
    });
  }
  return chunks;
};

const calculateTfIdf = (chunks: Chunk[]): void => {
  const vocabulary = new Set<string>();
  const chunkWords = chunks.map(chunk => {
    const words = chunk.content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    words.forEach(word => vocabulary.add(word));
    return words;
  });
  
  const N = chunks.length;
  const idf: Record<string, number> = {};
  
  for (const word of vocabulary) {
    const docCount = chunkWords.filter(words => words.includes(word)).length;
    idf[word] = Math.log(N / (1 + docCount));
  }
  
  chunks.forEach((chunk, idx) => {
    const words = chunkWords[idx];
    const wordCounts: Record<string, number> = {};
    
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    let score = 0;
    for (const [word, count] of Object.entries(wordCounts)) {
      const tf = count / words.length;
      score += tf * (idf[word] || 0);
    }
    
    chunk.rank = score;
  });
};

const deduplicateChunks = (chunks: Chunk[]): Chunk[] => {
  const kept: Chunk[] = [];
  
  for (const chunk of chunks) {
    const words = new Set(chunk.content.toLowerCase().split(/\s+/));
    let isDuplicate = false;
    
    for (const existing of kept) {
      const existingWords = new Set(existing.content.toLowerCase().split(/\s+/));
      const intersection = new Set([...words].filter(x => existingWords.has(x)));
      const union = new Set([...words, ...existingWords]);
      const similarity = intersection.size / union.size;
      
      if (similarity >= 0.7) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) kept.push(chunk);
  }
  
  return kept;
};

const compressWithOpenAI = async (chunks: Chunk[]): Promise<Chunk[]> => {
  if (!process.env.OPENAI_API_KEY) {
    console.log('[LLM] OPENAI_API_KEY not found, skipping compression');
    return chunks;
  }

  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    console.log('[LLM] Compressing with OpenAI...');
    const compressed: Chunk[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      process.stdout.write(`\r[LLM] ${progressBar(i + 1, chunks.length)} Compressing...`);
      
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'system',
            content: 'Compress the following text to 25-60% of its original length while preserving all key information, facts, and context. Maintain readability and coherence.'
          }, {
            role: 'user',
            content: chunks[i].content
          }],
          max_tokens: Math.floor(chunks[i].tokens * 0.6),
          temperature: 0.1
        });
        
        const result = response.choices[0]?.message?.content?.trim();
        if (result) {
          compressed.push({
            ...chunks[i],
            content: result,
            tokens: estimateTokens(result)
          });
        } else {
          compressed.push(chunks[i]);
        }
      } catch (error) {
        console.log(`\n[LLM] Error compressing chunk ${i + 1}, keeping original`);
        compressed.push(chunks[i]);
      }
    }
    
    console.log('');
    return compressed;
  } catch (error) {
    console.log('[LLM] OpenAI not available, skipping compression');
    return chunks;
  }
};

const readUrlsFromFile = async (filePath: string): Promise<string[]> => {
  const urls: string[] = [];
  const rl = createInterface({ input: createReadStream(filePath) });
  
  for await (const line of rl) {
    const url = line.trim();
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      urls.push(url);
    }
  }
  
  return urls;
};

const writeOutputs = (chunks: Chunk[], outputDir: string, format: string, stats: any): void => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  
  console.log('[WRITE] Generating outputs...');
  
  if (format === 'jsonl') {
    const lines = chunks.map(c => JSON.stringify({
      chunk: c.content,
      tokens: c.tokens,
      source: c.source,
      rank: Number(c.rank.toFixed(4))
    }));
    fs.writeFileSync(path.join(outputDir, 'pack.jsonl'), lines.join('\n'));
  } else {
    const content = chunks.map(c => `## ${c.source}\n\n${c.content}\n\n---`).join('\n\n');
    fs.writeFileSync(path.join(outputDir, 'pack.md'), content);
  }
  
  fs.writeFileSync(path.join(outputDir, 'stats.json'), JSON.stringify(stats, null, 2));
  
  const citations = [...new Set(chunks.map(c => c.source.split('#')[0]))];
  fs.writeFileSync(path.join(outputDir, 'citations.md'), '# Citations\n\n' + citations.map(url => `- ${url}`).join('\n'));
};

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('url', { type: 'array', string: true, description: 'URLs to process' })
    .option('urls', { type: 'string', description: 'File containing newline-separated URLs' })
    .option('budget', { type: 'number', default: 8000, description: 'Total token budget across pack' })
    .option('out', { type: 'string', default: 'distill', description: 'Output directory' })
    .option('format', { choices: ['jsonl', 'md'], default: 'jsonl', description: 'Output format' })
    .option('llm', { type: 'boolean', default: false, description: 'Enable OpenAI compression' })
    .help()
    .argv;
  
  let urls: string[] = [];
  if (argv.url) urls.push(...argv.url);
  if (argv.urls) urls.push(...await readUrlsFromFile(argv.urls));
  
  if (urls.length === 0) {
    console.error('Error: No URLs provided. Use --url or --urls');
    process.exit(1);
  }

  if (!process.env.HYPERBROWSER_API_KEY) {
    console.error('Error: HYPERBROWSER_API_KEY environment variable is required');
    process.exit(1);
  }
  
  console.log(`[FETCH] Processing ${urls.length} URLs...`);
  
  const hb = new Hyperbrowser({ apiKey: process.env.HYPERBROWSER_API_KEY });
  const allChunks: Chunk[] = [];
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    process.stdout.write(`\r[FETCH] ${progressBar(i + 1, urls.length)} ${url.slice(0, 50)}...`);
    
    try {
      // Use official Hyperbrowser scrape method - simple approach like the docs
      const scrapeResult = await hb.scrape.startAndWait({
        url: url
      });

      // Hyperbrowser returns markdown content by default, which is perfect for RAG!
      const content = scrapeResult.data?.markdown || scrapeResult.data?.html;
      
      if (!content) {
        throw new Error('No content returned from scrape');
      }

      console.log(`\n    [SUCCESS] Scraped ${content.length} chars from ${url}`);

      // For markdown content, we can split by paragraphs instead of HTML parsing
      const segments = content.split('\n\n').filter(segment => 
        segment.trim().length >= 10 && !segment.startsWith('---')
      );
      const chunks = createChunks(segments, url);
      allChunks.push(...chunks);
      
    } catch (error) {
      console.log(`\n[FETCH] Scraping failed for ${url}: ${error}`);
    }
  }
  
  console.log(`\n[CLEAN] Created ${allChunks.length} chunks from ${urls.length} pages`);
  
  if (allChunks.length === 0) {
    console.error('Error: No content was successfully extracted from any URLs');
    process.exit(1);
  }

  const rawTokenCount = allChunks.reduce((sum, c) => sum + c.tokens, 0);
  
  // Calculate TF-IDF rankings
  console.log('[SCORE] Calculating TF-IDF scores...');
  calculateTfIdf(allChunks);
  
  // Sort by rank (descending)
  allChunks.sort((a, b) => b.rank - a.rank);
  
  // Deduplicate
  console.log('[SELECT] Deduplicating chunks...');
  const uniqueChunks = deduplicateChunks(allChunks);
  
  // Select within budget
  let selectedChunks: Chunk[] = [];
  let currentTokens = 0;
  
  for (const chunk of uniqueChunks) {
    if (currentTokens + chunk.tokens <= argv.budget) {
      selectedChunks.push(chunk);
      currentTokens += chunk.tokens;
    }
  }
  
  console.log(`[SELECT] Selected ${selectedChunks.length} chunks (${currentTokens} tokens)`);
  
  // Optional compression
  if (argv.llm && process.env.OPENAI_API_KEY) {
    selectedChunks = await compressWithOpenAI(selectedChunks);
    const compressedTokens = selectedChunks.reduce((sum, c) => sum + c.tokens, 0);
    console.log(`[LLM] Compressed to ${compressedTokens} tokens`);
  }
  
  const finalTokens = selectedChunks.reduce((sum, c) => sum + c.tokens, 0);
  const stats = {
    pages: urls.length,
    raw_chunks: allChunks.length,
    kept_chunks: selectedChunks.length,
    raw_tokens: rawTokenCount,
    kept_tokens: finalTokens,
    dedupe_rate: Number(((allChunks.length - uniqueChunks.length) / allChunks.length * 100).toFixed(2)),
    compression_ratio: argv.llm ? Number((finalTokens / currentTokens * 100).toFixed(2)) : 100
  };
  
  writeOutputs(selectedChunks, argv.out, argv.format, stats);
  
  console.log('[DONE] RAG pack created successfully');
  console.log(`       Output: ${argv.out}/pack.${argv.format}`);
  console.log(`       Stats: ${argv.out}/stats.json`);
  console.log(`       Citations: ${argv.out}/citations.md`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}