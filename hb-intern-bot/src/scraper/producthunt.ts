import HyperbrowserClient from '../hyperbrowser-client.js';
import { ScrapedResult } from '../types.js';
import { extractDomain } from '../utils.js';

export async function scrapeProductHunt(apiKey: string): Promise<ScrapedResult[]> {
  const hb = new HyperbrowserClient({ apiKey });
  const results: ScrapedResult[] = [];

  try {
    const response = await hb.extract({
      url: 'https://www.producthunt.com/',
      data_schema: {
        products: {
          _many: true,
          name: 'string',
          tagline: 'string?',
          url: 'string?',
          votes: 'number?',
          comments_count: 'number?',
          maker: 'string?',
          product_url: 'string?'
        }
      }
    });

    if (response.data?.data?.products) {
      for (const product of response.data.data.products) {
        if (product.name) {
          const permalink = product.url || `https://www.producthunt.com/posts/${product.name.toLowerCase().replace(/\s+/g, '-')}`;
          const externalUrl = product.product_url;
          
          results.push({
            title: `${product.name}${product.tagline ? ` - ${product.tagline}` : ''}`,
            url: externalUrl || permalink,
            permalink,
            points: product.votes || 0,
            comments: product.comments_count || 0,
            author: product.maker,
            created_at: new Date().toISOString(), // PH shows today's products
            domain: externalUrl ? extractDomain(externalUrl) : 'producthunt.com'
          });
        }
      }
    }

    // Also try to get the trending/new products page
    try {
      const trendingResponse = await hb.extract({
        url: 'https://www.producthunt.com/topics/trending',
        data_schema: {
          products: {
            _many: true,
            name: 'string',
            tagline: 'string?',
            url: 'string?',
            votes: 'number?',
            comments_count: 'number?',
            maker: 'string?',
            product_url: 'string?'
          }
        }
      });

          if (trendingResponse.data?.data?.products) {
      for (const product of trendingResponse.data.data.products) {
          if (product.name) {
            const permalink = product.url || `https://www.producthunt.com/posts/${product.name.toLowerCase().replace(/\s+/g, '-')}`;
            const externalUrl = product.product_url;
            
            // Avoid duplicates
            const exists = results.some(r => r.title.includes(product.name));
            if (!exists) {
              results.push({
                title: `${product.name}${product.tagline ? ` - ${product.tagline}` : ''}`,
                url: externalUrl || permalink,
                permalink,
                points: product.votes || 0,
                comments: product.comments_count || 0,
                author: product.maker,
                created_at: new Date().toISOString(),
                domain: externalUrl ? extractDomain(externalUrl) : 'producthunt.com'
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('Could not scrape PH trending page:', error);
    }

  } catch (error) {
    console.error('Error scraping Product Hunt:', error);
  }

  return results;
}
