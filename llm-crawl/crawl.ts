import { Hyperbrowser } from '@hyperbrowser/sdk';
import chalk from 'chalk';

export interface CrawlResult {
  url: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

export class CrawlService {
  private client: Hyperbrowser;

  constructor(apiKey: string) {
    this.client = new Hyperbrowser({ apiKey });
  }

  /**
   * Crawl a website using Hyperbrowser's official API
   */
  async crawlWebsite(instruction: string): Promise<CrawlResult[]> {
    console.log(chalk.blue('🕷️  Starting crawl with Hyperbrowser...'));
    
    try {
      // Extract domain from instruction for crawling
      const urlMatch = instruction.match(/(?:from\s+)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const domain = urlMatch ? urlMatch[1] : null;
      
      if (!domain) {
        throw new Error('No valid domain found in instruction. Please specify a website to crawl.');
      }

      let url = domain.startsWith('http') ? domain : `https://${domain}`;
      
      // For specific sites, target more relevant sections
      if (domain.includes('techcrunch.com')) {
        if (instruction.toLowerCase().includes('ai') || instruction.toLowerCase().includes('startup')) {
          url = `${url}/category/artificial-intelligence/`;
        }
      }
      
      console.log(chalk.yellow(`📍 Crawling: ${url}`));

      // Use official Hyperbrowser SDK method exactly as shown in docs
      const result = await this.client.crawl.startAndWait({
        url,
        maxPages: this.getMaxPagesFromInstruction(instruction),
        waitFor: 3000,
        includePdf: false,
        onlyMainContent: true,
        removeTags: ['script', 'style', 'nav', 'footer', 'aside', 'header'],
        formats: ['markdown'],
        actions: [],
        // Add search patterns to find more relevant content
        includes: this.getSearchPatterns(instruction),
        excludes: ['newsletter', 'subscribe', 'promotion', 'advertising', 'partnership', 'events'],
        // Follow internal links to find article content
        followLinks: true
      });

      console.log(chalk.green(`✅ Crawled ${result.data?.length || 0} pages successfully`));

      // Transform crawl results to our interface
      const crawlResults: CrawlResult[] = (result.data || []).map(page => ({
        url: page.url || url,
        title: page.metadata?.title || 'Untitled',
        content: page.markdown || page.html || '',
        metadata: page.metadata
      }));

      return crawlResults;

    } catch (error) {
      console.error(chalk.red('❌ Crawl failed:'), error);
      throw error;
    }
  }

  private getMaxPagesFromInstruction(instruction: string): number {
    // Extract number of items requested
    const numberMatch = instruction.match(/(\d+)\s*(?:pages?|items?|results?|reviews?|papers?)/i);
    if (numberMatch) {
      const num = parseInt(numberMatch[1]);
      return Math.min(num, 100); // Cap at 100 pages
    }
    
    // Default based on instruction type - reduced for better token management
    if (instruction.toLowerCase().includes('review')) return 15;
    if (instruction.toLowerCase().includes('paper')) return 8;
    return 5;
  }

  private getSearchPatterns(instruction: string): string[] {
    const lowerInstruction = instruction.toLowerCase();
    
    if (lowerInstruction.includes('startup') || lowerInstruction.includes('launch')) {
      return ['startup', 'funding', 'launch', 'raises', 'seed', 'series', 'venture'];
    }
    
    if (lowerInstruction.includes('ai') || lowerInstruction.includes('artificial intelligence')) {
      return ['artificial intelligence', 'machine learning', 'AI startup', 'neural', 'GPT'];
    }
    
    if (lowerInstruction.includes('review')) {
      return ['review', 'rating', 'stars', 'pros', 'cons', 'customer'];
    }
    
    return [];
  }
}
