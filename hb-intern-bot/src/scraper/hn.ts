import HyperbrowserClient from '../hyperbrowser-client.js';
import { ScrapedResult } from '../types.js';
import { extractDomain, addJitter, sleep } from '../utils.js';

export async function scrapeHN(apiKey: string): Promise<ScrapedResult[]> {
  const hb = new HyperbrowserClient({ apiKey });
  const results: ScrapedResult[] = [];

  try {
    // Scrape front page
    const frontPage = await hb.extract({
      url: 'https://news.ycombinator.com/'
    });

    console.log('HN Front Page Response:', JSON.stringify(frontPage.data, null, 2));

    if (frontPage.data?.data?.articles) {
      for (const article of frontPage.data.data.articles) {
        if (article.title) {
          const permalink = `https://news.ycombinator.com/item?id=${article.id || 'unknown'}`;
          const externalUrl = article.url || article.article_url;
          
          results.push({
            title: article.title,
            url: externalUrl || permalink,
            permalink,
            points: article.points || 0,
            comments: article.comments_count || 0,
            author: article.author,
            created_at: parseHNTime(article.time_ago),
            domain: externalUrl ? extractDomain(externalUrl) : 'news.ycombinator.com'
          });
        }
      }
    }

    // Small delay before scraping new page
    await sleep(addJitter(2000));

    // Scrape new page
    const newPage = await hb.extract({
      url: 'https://news.ycombinator.com/newest'
    });

    if (newPage.data?.data?.articles) {
      for (const article of newPage.data.data.articles) {
        if (article.title) {
          const permalink = `https://news.ycombinator.com/item?id=${article.id || 'unknown'}`;
          const externalUrl = article.url || article.article_url;
          
          // Avoid duplicates
          const exists = results.some(r => r.title === article.title);
          if (!exists) {
            results.push({
              title: article.title,
              url: externalUrl || permalink,
              permalink,
              points: article.points || 0,
              comments: article.comments_count || 0,
              author: article.author,
              created_at: parseHNTime(article.time_ago),
              domain: externalUrl ? extractDomain(externalUrl) : 'news.ycombinator.com'
            });
          }
        }
      }
    }

  } catch (error) {
    console.error('Error scraping HN:', error);
  }

  return results;
}

function parseHNTime(timeAgo?: string): string {
  if (!timeAgo) return new Date().toISOString();
  
  const now = new Date();
  const match = timeAgo.match(/(\d+)\s*(minute|hour|day)s?\s*ago/i);
  
  if (match) {
    const [, num, unit] = match;
    const value = parseInt(num, 10);
    
    switch (unit.toLowerCase()) {
      case 'minute':
        now.setMinutes(now.getMinutes() - value);
        break;
      case 'hour':
        now.setHours(now.getHours() - value);
        break;
      case 'day':
        now.setDate(now.getDate() - value);
        break;
    }
  }
  
  return now.toISOString();
}
