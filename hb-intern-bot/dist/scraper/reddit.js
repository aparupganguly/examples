"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeReddit = scrapeReddit;
const hyperbrowser_client_js_1 = __importDefault(require("../hyperbrowser-client.js"));
const utils_js_1 = require("../utils.js");
async function scrapeReddit(apiKey, subreddits) {
    const hb = new hyperbrowser_client_js_1.default({ apiKey });
    const results = [];
    for (const sub of subreddits) {
        try {
            // Scrape hot posts
            await scrapeSubreddit(hb, sub, 'hot', results);
            // Small delay between subreddits
            await (0, utils_js_1.sleep)((0, utils_js_1.addJitter)(1500));
            // Scrape new posts
            await scrapeSubreddit(hb, sub, 'new', results);
            // Delay before next subreddit
            await (0, utils_js_1.sleep)((0, utils_js_1.addJitter)(2000));
        }
        catch (error) {
            console.error(`Error scraping r/${sub}:`, error);
        }
    }
    return results;
}
async function scrapeSubreddit(hb, subreddit, sort, results) {
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
                            domain: externalUrl && !post.is_self ? (0, utils_js_1.extractDomain)(externalUrl) : 'reddit.com'
                        });
                    }
                }
            }
        }
    }
    catch (error) {
        console.error(`Error scraping r/${subreddit}/${sort}:`, error);
    }
}
//# sourceMappingURL=reddit.js.map