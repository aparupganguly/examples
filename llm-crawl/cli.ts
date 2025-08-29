#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { CrawlService } from './crawl.js';
import { LLMService } from './llm.js';

// Load environment variables
dotenv.config();

const program = new Command();

interface CLIOptions {
  json?: boolean;
  out?: string;
  model?: string;
  verbose?: boolean;
}


async function runLLMCrawl(instruction: string, options: CLIOptions): Promise<void> {
  try {
    const hyperbrowserKey = process.env.HYPERBROWSER_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!hyperbrowserKey) {
      console.error(chalk.red('❌ HYPERBROWSER_API_KEY not found in environment variables'));
      console.log(chalk.yellow('💡 Get your API key at: https://hyperbrowser.ai'));
      process.exit(1);
    }

    if (!openaiKey) {
      console.error(chalk.red('❌ OPENAI_API_KEY not found in environment variables'));
      console.log(chalk.yellow('💡 Get your API key at: https://platform.openai.com'));
      process.exit(1);
    }

    console.log(chalk.green('🚀 Starting LLMCrawl...'));
    if (options.verbose) {
      console.log(chalk.gray(`📝 Instruction: ${instruction}`));
    }

    // Initialize services
    const crawlService = new CrawlService(hyperbrowserKey);
    const llmService = new LLMService(openaiKey, options.model ? { model: options.model } : {});

    // Step 1: Crawl the website
    const crawlResults = await crawlService.crawlWebsite(instruction);

    if (crawlResults.length === 0) {
      console.log(chalk.yellow('⚠️  No data crawled. Please check the website URL and try again.'));
      return;
    }

    if (options.verbose) {
      console.log(chalk.gray('\n🔍 Crawled URLs:'));
      crawlResults.forEach((result, i) => {
        console.log(chalk.gray(`  ${i + 1}. ${result.url}`));
        console.log(chalk.gray(`     Title: ${result.title}`));
        console.log(chalk.gray(`     Content preview: ${result.content.substring(0, 200)}...`));
      });
    }

    // Step 2: Process with LLM
    const processedResult = await llmService.processCrawlData(crawlResults, instruction);

    // Step 3: Handle output based on instruction and flags
    await handleOutput(processedResult, crawlResults, instruction, options, llmService);

  } catch (error) {
    console.error(chalk.red('💥 Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Handle different output formats and destinations
 */
async function handleOutput(
  processedResult: string,
  crawlResults: any[],
  instruction: string,
  options: CLIOptions,
  llmService: LLMService
): Promise<void> {
  const lowerInstruction = instruction.toLowerCase();

  // Handle FAISS database export
  if (lowerInstruction.includes('faiss')) {
    console.log(chalk.blue('📊 Creating FAISS database...'));
    
    try {
      // Dynamic import for faiss-node since it's optional
      const { IndexFlatL2 } = await import('faiss-node');
      
      const texts = crawlResults.map(r => `${r.title}\n${r.content}`);
      const embeddings = await llmService.generateEmbeddings(texts);
      
      if (embeddings.length === 0) {
        console.log(chalk.yellow('⚠️  No embeddings generated'));
        return;
      }
      
      // Create FAISS index
      const dimension = embeddings[0]!.length;
      const index = new IndexFlatL2(dimension);
      
      // Add vectors to index
      const vectors = embeddings.flat();
      index.add(vectors);
      
      const outputFile = options.out || 'faiss_index.bin';
      index.write(outputFile);
      
      console.log(chalk.green(`✅ FAISS database saved to: ${outputFile}`));
      console.log(chalk.gray(`📈 Indexed ${embeddings.length} documents with ${dimension}D embeddings`));
      return;
    } catch (error) {
      console.error(chalk.red('❌ FAISS processing failed:'), error);
      console.log(chalk.yellow('💡 Install faiss-node: npm install faiss-node'));
      return;
    }
  }

  // Handle JSON/JSONL output
  if (options.json || lowerInstruction.includes('jsonl') || lowerInstruction.includes('json')) {
    if (options.out) {
      writeFileSync(options.out, processedResult, 'utf8');
      console.log(chalk.green(`✅ Results saved to: ${options.out}`));
    } else {
      console.log(processedResult);
    }
    return;
  }

  // Handle file output
  if (options.out) {
    writeFileSync(options.out, processedResult, 'utf8');
    console.log(chalk.green(`✅ Results saved to: ${options.out}`));
    return;
  }

  // Default: print to terminal with formatting
  console.log(chalk.green('\n📋 Results:\n'));
  console.log(processedResult);
  console.log(chalk.gray(`\n📊 Processed ${crawlResults.length} pages`));
}

// Configure CLI
program
  .name('llmcrawl')
  .description('CLI tool that uses Hyperbrowser\'s Crawl API to fetch structured web data and process it with LLMs')
  .version('1.0.0');

program
  .argument('<instruction>', 'Natural language instruction for crawling and processing')
  .option('--json', 'Output results in JSON format')
  .option('-o, --out <file>', 'Save output to file')
  .option('-m, --model <model>', 'OpenAI model to use (default: gpt-4o)')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(runLLMCrawl);

// Add example commands
program.addHelpText('after', `
Examples:
  $ llmcrawl "Find all AI startup launches in 2025 from techcrunch.com and summarize in 3 bullets"
  $ llmcrawl "Collect 50 reviews of iPhone 16 Pro from bestbuy.com, return JSONL with {rating, pros, cons, sentiment}" --json -o reviews.jsonl
  $ llmcrawl "Crawl arxiv.org for latest multimodal LLM papers and export FAISS db" -o papers.bin
  
Environment Variables:
  HYPERBROWSER_API_KEY    Your Hyperbrowser API key (get it at https://hyperbrowser.ai)
  OPENAI_API_KEY          Your OpenAI API key
`);

// Handle execution  
if (typeof process !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
