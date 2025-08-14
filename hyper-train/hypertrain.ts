import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import Hyperbrowser from '@hyperbrowser/sdk';
import OpenAI from 'openai';

interface Config {
  input: string;
  out: string;
  format: string[];
  chunk: number;
  concurrency: number;
  embed: boolean;
  qa: number | null;
  tag: string | null;
}

interface ChunkData {
  id: string;
  url: string;
  title: string;
  chunk_id: string;
  text: string;
  metadata: {
    collected_at: string;
    tag?: string;
  };
}

class HyperTrain {
  private config: Config;
  private hyperbrowser: Hyperbrowser = null as any;
  private openai: OpenAI | null = null;

  constructor(config: Config) {
    this.config = config;
    this.initializeClients();
  }

  private initializeClients(): void {
    const hyperbrowserApiKey = process.env.HYPERBROWSER_API_KEY;
    if (!hyperbrowserApiKey) {
      console.error('❌ HYPERBROWSER_API_KEY environment variable is required');
      console.log('Get your API key at https://hyperbrowser.ai');
      process.exit(1);
    }

    this.hyperbrowser = new Hyperbrowser({
      apiKey: hyperbrowserApiKey,
    });

    if (this.config.embed || this.config.qa) {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        console.error('❌ OPENAI_API_KEY environment variable is required for --embed or --qa options');
        process.exit(1);
      }
      this.openai = new OpenAI({ apiKey: openaiApiKey });
    }
  }

  private async readUrls(): Promise<string[]> {
    const content = await fs.promises.readFile(this.config.input, 'utf-8');
    return content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  }

  private async scrapeUrl(url: string): Promise<{ title: string; content: string } | null> {
    try {
      console.log(`🔍 Scraping: ${url}`);
      
      const response = await this.hyperbrowser.scrape.startAndWait({
        url: url,
        scrapeOptions: {
          formats: ['markdown', 'html']
        }
      });

      if (!response?.data) {
        console.warn(`⚠️  No data returned for ${url}`);
        return null;
      }

      const title = response.data.metadata?.title?.[0] || response.data.metadata?.title || new URL(url).hostname;
      const content = response.data.markdown || response.data.html || '';

      console.log(`✅ Scraped ${url} (${content.length} chars)`);
      return { title: String(title), content };
    } catch (error) {
      console.error(`❌ Failed to scrape ${url}: ${error}`);
      return null;
    }
  }

  private chunkText(text: string): string[] {
    if (text.length <= this.config.chunk) return [text];
    
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\s*\n/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > this.config.chunk && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks.filter(chunk => chunk.length > 0);
  }

  private async generateEmbeddings(chunks: ChunkData[]): Promise<void> {
    if (!this.openai) return;
    
    console.log(`🧮 Generating embeddings for ${chunks.length} chunks...`);
    const embeddings = [];

    for (const chunk of chunks) {
      try {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk.text,
        });
        
        const vector = response.data[0]?.embedding;
        if (vector) {
          embeddings.push({
            id: chunk.chunk_id,
            vector: vector,
            dims: vector.length,
          });
        }
      } catch (error) {
        console.error(`❌ Failed to generate embedding for ${chunk.chunk_id}: ${error}`);
      }
    }

    const outputPath = path.join(this.config.out, 'embeddings.jsonl');
    const writeStream = fs.createWriteStream(outputPath);
    embeddings.forEach(emb => writeStream.write(JSON.stringify(emb) + '\n'));
    writeStream.end();
    console.log(`🧮 Wrote embeddings to ${outputPath}`);
  }

  private async generateQAPairs(chunks: ChunkData[]): Promise<void> {
    if (!this.openai || !this.config.qa) return;
    
    console.log(`💭 Generating QA pairs...`);
    const qaPairs: any[] = [];

    for (const chunk of chunks) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'user',
            content: `Generate ${this.config.qa} question-answer pair(s) from this text:\n\n${chunk.text}\n\nFormat: Q: [question]\nA: [answer]`
          }],
          temperature: 0.7,
        });

        const content = response.choices[0]?.message?.content || '';
        const pairs = this.parseQAPairs(content);
        
        pairs.forEach(pair => {
          qaPairs.push({
            messages: [
              { role: 'user', content: pair.question },
              { role: 'assistant', content: pair.answer }
            ],
            source_id: chunk.chunk_id,
          });
        });
      } catch (error) {
        console.error(`❌ Failed to generate QA for ${chunk.chunk_id}: ${error}`);
      }
    }

    const outputPath = path.join(this.config.out, 'qa.jsonl');
    const writeStream = fs.createWriteStream(outputPath);
    qaPairs.forEach(qa => writeStream.write(JSON.stringify(qa) + '\n'));
    writeStream.end();
    console.log(`❓ Wrote QA pairs to ${outputPath}`);
  }

  private parseQAPairs(content: string): Array<{ question: string; answer: string }> {
    const pairs: Array<{ question: string; answer: string }> = [];
    const lines = content.split('\n');
    let question = '', answer = '';

    for (const line of lines) {
      if (line.startsWith('Q:')) {
        question = line.substring(2).trim();
      } else if (line.startsWith('A:')) {
        answer = line.substring(2).trim();
        if (question && answer) {
          pairs.push({ question, answer });
          question = answer = '';
        }
      }
    }
    return pairs;
  }

  async run(): Promise<void> {
    console.log('🚀 Starting HyperTrain...');
    
    const urls = await this.readUrls();
    await fs.promises.mkdir(this.config.out, { recursive: true });
    
    const allChunks: ChunkData[] = [];
    const urlData = new Map();

    // Process URLs with concurrency
    for (let i = 0; i < urls.length; i += this.config.concurrency) {
      const batch = urls.slice(i, i + this.config.concurrency);
      const results = await Promise.allSettled(batch.map(url => this.scrapeUrl(url)));

      results.forEach((result, j) => {
        if (result.status === 'fulfilled' && result.value) {
          const url = batch[j];
          if (!url) return;
          
          const { title, content } = result.value;
          const chunks = this.chunkText(content);
          const timestamp = new Date().toISOString();

          const chunkData = chunks.map((chunk, index) => ({
            id: `${new URL(url).hostname.replace(/\./g, '_')}_${Date.now()}_${index}`,
            url,
            title,
            chunk_id: `chunk_${i + j}_${index}`,
            text: chunk,
            metadata: {
              collected_at: timestamp,
              ...(this.config.tag && { tag: this.config.tag }),
            },
          }));

          allChunks.push(...chunkData);
          urlData.set(url, { title, chunks: chunkData });
        }
      });
    }

    // Write outputs
    if (this.config.format.includes('jsonl')) {
      const outputPath = path.join(this.config.out, 'dataset.jsonl');
      const writeStream = fs.createWriteStream(outputPath);
      allChunks.forEach(chunk => writeStream.write(JSON.stringify(chunk) + '\n'));
      writeStream.end();
      console.log(`💾 Wrote JSONL dataset to ${outputPath}`);
    }

    if (this.config.format.includes('md')) {
      for (const [url, data] of urlData) {
        if (!url || !data) continue;
        
        const fileName = (data.title || 'scraped').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.md';
        const outputPath = path.join(this.config.out, fileName);
        let content = `# ${data.title || 'Scraped Content'}\n\n**Source:** ${url}\n**Collected:** ${data.chunks[0]?.metadata.collected_at || new Date().toISOString()}\n\n---\n\n`;
        data.chunks.forEach((chunk: any, i: number) => {
          content += `## Chunk ${i + 1}\n\n${chunk.text || ''}\n\n`;
        });
        await fs.promises.writeFile(outputPath, content);
      }
      console.log(`📝 Wrote Markdown files`);
    }

    if (this.config.embed) await this.generateEmbeddings(allChunks);
    if (this.config.qa) await this.generateQAPairs(allChunks);

    console.log(`🎉 Completed! Created ${allChunks.length} chunks from ${urls.length} URLs`);
    console.log('\nFollow @hyperbrowser_ai for updates.');
  }
}

function parseArgs(): Config {
  const args = process.argv.slice(2);
  const config: Config = {
    input: '',
    out: './dataset',
    format: ['jsonl'],
    chunk: 900,
    concurrency: os.cpus().length,
    embed: false,
    qa: null,
    tag: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--input': config.input = args[++i] || ''; break;
      case '--out': config.out = args[++i] || './dataset'; break;
      case '--format': config.format = (args[++i] || 'jsonl').split(','); break;
      case '--chunk': config.chunk = parseInt(args[++i] || '900'); break;
      case '--concurrency': config.concurrency = parseInt(args[++i] || '4'); break;
      case '--embed': config.embed = true; break;
      case '--qa': config.qa = parseInt(args[++i] || '0') || null; break;
      case '--tag': config.tag = args[++i] || null; break;
      case '--help': case '-h':
        console.log(`
**Built with Hyperbrowser (https://hyperbrowser.ai)**

Usage: ts-node hypertrain.ts [options]

Options:
  --input <file>        Input file with URLs (required)
  --out <dir>           Output directory (default: ./dataset)
  --format <formats>    Output formats: jsonl,md (default: jsonl)
  --chunk <chars>       Max characters per chunk (default: 900)
  --concurrency <num>   Concurrent requests (default: CPU count)
  --embed               Generate embeddings
  --qa <N>              Generate N QA pairs per chunk
  --tag <string>        Add custom tag to metadata
  --help, -h            Show this help

Environment Variables:
  HYPERBROWSER_API_KEY  Your Hyperbrowser API key (required)
  OPENAI_API_KEY        Your OpenAI API key (for --embed or --qa)

Example:
  ts-node hypertrain.ts --input urls.txt --out ./dataset --format jsonl,md --embed --qa 2

Get your API key at: https://hyperbrowser.ai
        `);
        process.exit(0);
    }
  }

  if (!config.input) {
    console.error('❌ --input is required');
    process.exit(1);
  }

  return config;
}

async function main(): Promise<void> {
  try {
    const config = parseArgs();
    const hyperTrain = new HyperTrain(config);
    await hyperTrain.run();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { HyperTrain, parseArgs };