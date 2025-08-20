"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const hn_js_1 = require("./scraper/hn.js");
const reddit_js_1 = require("./scraper/reddit.js");
const producthunt_js_1 = require("./scraper/producthunt.js");
const blogs_js_1 = require("./scraper/blogs.js");
const normalize_js_1 = require("./pipeline/normalize.js");
const score_js_1 = require("./pipeline/score.js");
const summarize_js_1 = require("./pipeline/summarize.js");
const writer_js_1 = require("./out/writer.js");
const utils_js_1 = require("./utils.js");
async function run(config, options, watchManager) {
    // Initialize AI summarizer if API key is available
    (0, summarize_js_1.initializeSummarizer)(process.env.OPENAI_API_KEY);
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
            const events = (0, normalize_js_1.normalizeEvents)(scrapedResults, bot, options.since);
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
            const scoredEvents = (0, score_js_1.scoreEvents)(filteredEvents, bot);
            console.log(`[${bot.name}] → scored(${scoredEvents.length})`);
            // Get top events
            const topEvents = (0, score_js_1.getTopEvents)(scoredEvents, options.top);
            console.log(`[${bot.name}] → top(${topEvents.length})`);
            // Summarize events
            const summarizedEvents = await (0, summarize_js_1.summarizeBatch)(topEvents, 3);
            console.log(`[${bot.name}] → summarized(${summarizedEvents.length})`);
            // Write outputs
            await (0, writer_js_1.writeDigest)(summarizedEvents, bot, options.out, {
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
                await (0, utils_js_1.sleep)((0, utils_js_1.addJitter)(2000));
            }
        }
        catch (error) {
            console.error(`Error processing bot ${bot.name}:`, error);
        }
    }
}
async function scrapeAllSources(bot, options) {
    const apiKey = process.env.HYPERBROWSER_API_KEY;
    const results = {
        hn: [],
        reddit: [],
        ph: [],
        blog: []
    };
    // Create promises for parallel execution
    const promises = [];
    // Scrape HN if enabled
    if (bot.sources.hn) {
        promises.push((0, hn_js_1.scrapeHN)(apiKey)
            .then(scraped => {
            results.hn = scraped;
        })
            .catch(error => {
            console.error(`[${bot.name}] HN scraping failed:`, error);
        }));
    }
    // Scrape Reddit if enabled
    if (bot.sources.reddit?.subs && bot.sources.reddit.subs.length > 0) {
        promises.push((0, reddit_js_1.scrapeReddit)(apiKey, bot.sources.reddit.subs)
            .then(scraped => {
            results.reddit = scraped;
        })
            .catch(error => {
            console.error(`[${bot.name}] Reddit scraping failed:`, error);
        }));
    }
    // Scrape Product Hunt if enabled
    if (bot.sources.producthunt) {
        promises.push((0, producthunt_js_1.scrapeProductHunt)(apiKey)
            .then(scraped => {
            results.ph = scraped;
        })
            .catch(error => {
            console.error(`[${bot.name}] Product Hunt scraping failed:`, error);
        }));
    }
    // Scrape blogs if enabled
    if (bot.sources.blogs && bot.sources.blogs.length > 0) {
        promises.push((0, blogs_js_1.scrapeBlogs)(apiKey, bot.sources.blogs)
            .then(scraped => {
            results.blog = scraped;
        })
            .catch(error => {
            console.error(`[${bot.name}] Blog scraping failed:`, error);
        }));
    }
    // Wait for all scraping to complete
    await Promise.all(promises);
    return results;
}
//# sourceMappingURL=main.js.map