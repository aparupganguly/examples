import { Config, CLIOptions, Event, ScrapedResult } from './types.js';
import { WatchManager } from './watch.js';
import { scrapeHN } from './scraper/hn.js';
import { scrapeReddit } from './scraper/reddit.js';
import { scrapeProductHunt } from './scraper/producthunt.js';
import { scrapeBlogs } from './scraper/blogs.js';
import { normalizeEvents } from './pipeline/normalize.js';
import { scoreEvents, getTopEvents } from './pipeline/score.js';
import { initializeSummarizer, summarizeBatch } from './pipeline/summarize.js';
import { writeDigest } from './out/writer.js';
import { sleep, addJitter } from './utils.js';

export async function run(
  config: Config,
  options: CLIOptions,
  watchManager?: WatchManager
): Promise<void> {
  // Initialize AI summarizer if API key is available
  initializeSummarizer(process.env.OPENAI_API_KEY);

  for (const bot of config.bots) {
    try {
      console.log(`\n🤖 Running bot: ${bot.name}`);
      
      // Scrape all sources for this bot
      const scrapedResults = await scrapeAllSources(bot, options);
      
      // Log scraping results
      const counts = {
        hn: scrapedResults.hn.length,
        reddit: scrapedResults.reddit.length,
        ph: scrapedResults.ph.length,
        blog: scrapedResults.blog.length
      };
      
      console.log(`[${bot.name}] HN(${counts.hn}) Reddit(${counts.reddit}) PH(${counts.ph}) Blogs(${counts.blog})`);
      
      // Normalize events
      const events = normalizeEvents(scrapedResults, bot, options.since);
      console.log(`[${bot.name}] → normalized(${events.length})`);
      
      // Filter out previously seen events if using watch mode
      let filteredEvents = events;
      if (watchManager) {
        filteredEvents = watchManager.filterUnseenEvents(events);
        if (filteredEvents.length < events.length) {
          console.log(`[${bot.name}] → new(${filteredEvents.length})`);
        }
      }
      
      if (filteredEvents.length === 0) {
        console.log(`[${bot.name}] → no new events to process`);
        continue;
      }
      
      // Score events
      const scoredEvents = scoreEvents(filteredEvents, bot);
      console.log(`[${bot.name}] → scored(${scoredEvents.length})`);
      
      // Get top events
      const topEvents = getTopEvents(scoredEvents, options.top);
      console.log(`[${bot.name}] → top(${topEvents.length})`);
      
      // Summarize events
      const summarizedEvents = await summarizeBatch(topEvents, 3);
      console.log(`[${bot.name}] → summarized(${summarizedEvents.length})`);
      
      // Write outputs
      await writeDigest(summarizedEvents, bot, options.out, {
        generateDeck: options.deck,
        theme: options.theme,
        sendSlack: options.slack,
        slackWebhook: process.env.SLACK_WEBHOOK_URL
      });
      
      // Mark events as seen
      if (watchManager) {
        watchManager.markEventsSeen(filteredEvents.map(e => e.id));
      }
      
      // Small delay between bots
      if (config.bots.length > 1) {
        await sleep(addJitter(2000));
      }
      
    } catch (error) {
      console.error(`Error processing bot ${bot.name}:`, error);
    }
  }
}

async function scrapeAllSources(
  bot: any,
  options: CLIOptions
): Promise<{
  hn: ScrapedResult[];
  reddit: ScrapedResult[];
  ph: ScrapedResult[];
  blog: ScrapedResult[];
}> {
  const apiKey = process.env.HYPERBROWSER_API_KEY!;
  const results = {
    hn: [] as ScrapedResult[],
    reddit: [] as ScrapedResult[],
    ph: [] as ScrapedResult[],
    blog: [] as ScrapedResult[]
  };

  // Create promises for parallel execution
  const promises: Promise<void>[] = [];

  // Scrape HN if enabled
  if (bot.sources.hn) {
    promises.push(
      scrapeHN(apiKey)
        .then(scraped => {
          results.hn = scraped;
        })
        .catch(error => {
          console.error(`[${bot.name}] HN scraping failed:`, error);
        })
    );
  }

  // Scrape Reddit if enabled
  if (bot.sources.reddit?.subs && bot.sources.reddit.subs.length > 0) {
    promises.push(
      scrapeReddit(apiKey, bot.sources.reddit.subs)
        .then(scraped => {
          results.reddit = scraped;
        })
        .catch(error => {
          console.error(`[${bot.name}] Reddit scraping failed:`, error);
        })
    );
  }

  // Scrape Product Hunt if enabled
  if (bot.sources.producthunt) {
    promises.push(
      scrapeProductHunt(apiKey)
        .then(scraped => {
          results.ph = scraped;
        })
        .catch(error => {
          console.error(`[${bot.name}] Product Hunt scraping failed:`, error);
        })
    );
  }

  // Scrape blogs if enabled
  if (bot.sources.blogs && bot.sources.blogs.length > 0) {
    promises.push(
      scrapeBlogs(apiKey, bot.sources.blogs)
        .then(scraped => {
          results.blog = scraped;
        })
        .catch(error => {
          console.error(`[${bot.name}] Blog scraping failed:`, error);
        })
    );
  }

  // Wait for all scraping to complete
  await Promise.all(promises);

  return results;
}