import OpenAI from 'openai';
import chalk from 'chalk';
import type { CrawlResult } from './crawl.js';

export interface LLMOptions {
  model?: string | undefined;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
}

export class LLMService {
  private openai: OpenAI;

  constructor(apiKey: string, options: LLMOptions = {}) {
    this.openai = new OpenAI({ apiKey });
  }

  async processCrawlData(
    crawlResults: CrawlResult[], 
    instruction: string,
    options: LLMOptions = {}
  ): Promise<string> {
    console.log(chalk.blue('🤖 Processing data with LLM...'));

    try {
      const model = options.model || 'gpt-4o-mini';
      
      const combinedContent = crawlResults
        .map(result => `URL: ${result.url}\nTitle: ${result.title}\nContent: ${this.truncateContent(result.content, 2000)}`)
        .join('\n\n---\n\n');

      const systemPrompt = this.createSystemPrompt(instruction);
      const userPrompt = `${instruction}\n\nCrawled Data:\n${this.truncateContent(combinedContent, 15000)}`;  // Keep under 20k tokens total

      const completion = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
      });

      const result = completion.choices[0]?.message?.content || '';
      
      console.log(chalk.green('✅ LLM processing complete'));
      return result;

    } catch (error) {
      console.error(chalk.red('❌ LLM processing failed:'), error);
      throw error;
    }
  }

  /**
   * Extract embeddings for FAISS database creation
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    console.log(chalk.blue('🔢 Generating embeddings...'));

    try {
      const embeddings: number[][] = [];
      
      // Process in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: batch,
        });

        embeddings.push(...response.data.map(d => d.embedding));
        
        // Rate limiting
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(chalk.green(`✅ Generated ${embeddings.length} embeddings`));
      return embeddings;

    } catch (error) {
      console.error(chalk.red('❌ Embedding generation failed:'), error);
      throw error;
    }
  }

  private createSystemPrompt(instruction: string): string {
    const lowerInstruction = instruction.toLowerCase();

    if (lowerInstruction.includes('jsonl') || lowerInstruction.includes('json')) {
      return `You are a data extraction specialist. Extract structured data from web content and return it in JSONL format (one JSON object per line).
Focus on the specific fields requested in the user instruction. Ensure each line is valid JSON.
Do not include markdown formatting or explanations - only return the JSONL data.`;
    }

    if (lowerInstruction.includes('summarize') || lowerInstruction.includes('summary')) {
      return `You are a content summarization expert. Create concise, well-structured summaries from web content.
Use markdown formatting with bullet points, headers, and emphasis where appropriate.
Focus on the key insights and main points requested in the user instruction.`;
    }

    if (lowerInstruction.includes('review')) {
      return `You are a review analysis expert. Extract and analyze review data from web content.
Focus on ratings, sentiment, pros/cons, and other review-specific information.
Structure your output according to the user's specific requirements.`;
    }

    if (lowerInstruction.includes('paper') || lowerInstruction.includes('research')) {
      return `You are a research paper analysis expert. Extract and organize academic paper information.
Focus on abstracts, methodologies, findings, and research insights.
Structure the output for easy consumption and further processing.`;
    }

    return `You are a web content analysis expert. Process the crawled web data according to the user's specific instruction.
Provide clear, well-structured output that directly addresses what the user requested.
Use appropriate formatting (markdown, JSON, etc.) based on the context of the request.`;
  }


  private truncateContent(content: string, maxChars: number): string {
    if (content.length <= maxChars) return content;
    
    // Try to cut at sentence boundaries
    const truncated = content.substring(0, maxChars);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > maxChars * 0.8) {
      return truncated.substring(0, lastSentence + 1) + '\n\n[Content truncated...]';
    }
    
    return truncated + '\n\n[Content truncated...]';
  }
}
