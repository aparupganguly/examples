import HyperbrowserClient from '../hyperbrowser-client.js';
import { ScrapedResult } from '../types.js';
import { extractDomain, addJitter, sleep } from '../utils.js';

export async function scrapeBlogs(apiKey: string, blogUrls: string[]): Promise<ScrapedResult[]> {
  const hb = new HyperbrowserClient({ apiKey });
  const results: ScrapedResult[] = [];

  for (const blogUrl of blogUrls) {
    try {
      await scrapeBlog(hb, blogUrl, results);
      
      // Delay between blogs
      await sleep(addJitter(2500));
      
    } catch (error) {
      console.error(`Error scraping blog ${blogUrl}:`, error);
    }
  }

  return results;
}

async function scrapeBlog(hb: HyperbrowserClient, blogUrl: string, results: ScrapedResult[]): Promise<void> {
  try {
    const response = await hb.extract({
      url: blogUrl,
      data_schema: {
        posts: {
          _many: true,
          title: 'string',
          url: 'string?',
          date: 'string?',
          author: 'string?',
          excerpt: 'string?',
          link: 'string?'
        }
      }
    });

    if (response.data?.posts) {
      for (const post of response.data.posts) {
        if (post.title) {
          const postUrl = post.url || post.link || `${blogUrl}/${post.title.toLowerCase().replace(/\s+/g, '-')}`;
          
          results.push({
            title: post.title,
            url: postUrl,
            permalink: postUrl,
            points: 0, // Blogs don't have points
            comments: 0, // We don't scrape blog comments
            author: post.author,
            created_at: parseDate(post.date) || new Date().toISOString(),
            domain: extractDomain(blogUrl)
          });
        }
      }
    } else {
      // Fallback: try to extract any links and titles from the page
      const fallbackResponse = await hb.extract({
        url: blogUrl,
        data_schema: {
          articles: {
            _many: true,
            title: 'string',
            url: 'string?',
            date: 'string?'
          }
        }
      });

      if (fallbackResponse.data?.articles) {
        for (const article of fallbackResponse.data.articles) {
          if (article.title) {
            const articleUrl = article.url || `${blogUrl}/${article.title.toLowerCase().replace(/\s+/g, '-')}`;
            
            // Avoid duplicates
            const exists = results.some(r => r.title === article.title);
            if (!exists) {
              results.push({
                title: article.title,
                url: articleUrl,
                permalink: articleUrl,
                points: 0,
                comments: 0,
                created_at: parseDate(article.date) || new Date().toISOString(),
                domain: extractDomain(blogUrl)
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error extracting from ${blogUrl}:`, error);
  }
}

function parseDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // Try to parse common date formats
      const formats = [
        /(\d{4})-(\d{2})-(\d{2})/,  // YYYY-MM-DD
        /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
        /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i // D MMM YYYY
      ];
      
      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString();
          }
        }
      }
      
      return null;
    }
    
    return date.toISOString();
  } catch {
    return null;
  }
}
