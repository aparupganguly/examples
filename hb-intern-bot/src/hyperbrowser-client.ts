import { Hyperbrowser } from '@hyperbrowser/sdk';
import { z } from 'zod';

export interface HyperbrowserConfig {
  apiKey: string;
}

export interface ExtractOptions {
  url: string;
  data_schema?: any;
}

export interface ExtractResponse {
  data?: any;
  error?: string;
}

export default class HyperbrowserClient {
  private client: Hyperbrowser;

  constructor(config: HyperbrowserConfig) {
    this.client = new Hyperbrowser({
      apiKey: config.apiKey,
    });
  }

  async extract(options: ExtractOptions): Promise<ExtractResponse> {
    try {
      console.log(`🔄 Extracting data from: ${options.url}`);
      
      // Generate appropriate Zod schema and prompt based on URL
      const { schema, prompt } = this.getSchemaAndPrompt(options.url);
      
      // Use the official extract.startAndWait method
      const result = await this.client.extract.startAndWait({
        urls: [options.url],
        prompt,
        schema
      });

      console.log(`✅ Successfully extracted data from: ${options.url}`);
      return { data: result };
      
    } catch (error) {
      console.error(`❌ Error extracting from ${options.url}:`, error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null 
      };
    }
  }

  private getSchemaAndPrompt(url: string): { schema: z.ZodType<any>, prompt: string } {
    if (url.includes('news.ycombinator.com')) {
      return {
        schema: z.object({
          articles: z.array(z.object({
            title: z.string(),
            url: z.string().optional(),
            points: z.number().optional(),
            comments_count: z.number().optional(),
            author: z.string().optional(),
            time_ago: z.string().optional(),
            article_url: z.string().optional(),
            id: z.string().optional()
          }))
        }),
        prompt: 'Extract articles from this Hacker News page. For each article, get the title, URL, points (score), number of comments, author, time posted, and article ID.'
      };
    } else if (url.includes('reddit.com')) {
      return {
        schema: z.object({
          posts: z.array(z.object({
            title: z.string(),
            url: z.string().optional(),
            permalink: z.string(),
            score: z.number().optional(),
            num_comments: z.number().optional(),
            author: z.string().optional(),
            created_utc: z.number().optional(),
            subreddit: z.string().optional(),
            is_self: z.boolean().optional(),
            selftext: z.string().optional()
          }))
        }),
        prompt: 'Extract posts from this Reddit page. For each post, get the title, URL, permalink, score (upvotes), number of comments, author, subreddit, creation time, and post content.'
      };
    } else if (url.includes('producthunt.com')) {
      return {
        schema: z.object({
          products: z.array(z.object({
            name: z.string(),
            tagline: z.string().optional(),
            url: z.string().optional(),
            votes: z.number().optional(),
            comments_count: z.number().optional(),
            maker: z.string().optional(),
            product_url: z.string().optional()
          }))
        }),
        prompt: 'Extract products from this Product Hunt page. For each product, get the name, tagline, URL, number of votes, number of comments, and maker/creator.'
      };
    } else {
      // Blog or general site
      return {
        schema: z.object({
          posts: z.array(z.object({
            title: z.string(),
            url: z.string().optional(),
            date: z.string().optional(),
            author: z.string().optional(),
            excerpt: z.string().optional(),
            link: z.string().optional()
          }))
        }),
        prompt: 'Extract recent blog posts or articles from this page. For each post, get the title, URL, publication date, author, and excerpt if available.'
      };
    }
  }
}