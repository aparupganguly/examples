import HyperbrowserClient from '../hyperbrowser-client.js';
import { ScrapedResult } from '../types.js';
import { extractDomain, addJitter, sleep } from '../utils.js';

export async function scrapeReddit(apiKey: string, subreddits: string[]): Promise<ScrapedResult[]> {
  const hb = new HyperbrowserClient({ apiKey });
  const results: ScrapedResult[] = [];

  for (const sub of subreddits) {
    try {
      // Scrape hot posts
      await scrapeSubreddit(hb, sub, 'hot', results);
      
      // Small delay between subreddits
      await sleep(addJitter(1500));
      
      // Scrape new posts
      await scrapeSubreddit(hb, sub, 'new', results);
      
      // Delay before next subreddit
      await sleep(addJitter(2000));
      
    } catch (error) {
      console.error(`Error scraping r/${sub}:`, error);
    }
  }

  return results;
}

async function scrapeSubreddit(
  hb: HyperbrowserClient, 
  subreddit: string, 
  sort: 'hot' | 'new',
  results: ScrapedResult[]
): Promise<void> {
  const url = `https://www.reddit.com/r/${subreddit}/${sort}/.json?limit=25`;
  
  try {
    const response = await hb.extract({
      url,
      data_schema: {
        data: {
          children: {
            _many: true,
            data: {
              title: 'string',
              url: 'string?',
              permalink: 'string',
              score: 'number?',
              num_comments: 'number?',
              author: 'string?',
              created_utc: 'number?',
              subreddit: 'string?',
              is_self: 'boolean?',
              selftext: 'string?'
            }
          }
        }
      }
    });

    if (response.data?.data?.children) {
      for (const child of response.data.data.children) {
        const post = child.data;
        if (post?.title) {
          const permalink = `https://www.reddit.com${post.permalink}`;
          const externalUrl = post.is_self ? permalink : post.url;
          
          // Avoid duplicates
          const exists = results.some(r => r.title === post.title && r.subreddit === post.subreddit);
          if (!exists) {
            results.push({
              title: post.title,
              url: externalUrl || permalink,
              permalink,
              points: post.score || 0,
              comments: post.num_comments || 0,
              author: post.author,
              subreddit: post.subreddit || subreddit,
              created_at: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : new Date().toISOString(),
              domain: externalUrl && !post.is_self ? extractDomain(externalUrl) : 'reddit.com'
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error scraping r/${subreddit}/${sort}:`, error);
  }
}
