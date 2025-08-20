"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeHN = scrapeHN;
const hyperbrowser_client_js_1 = __importDefault(require("../hyperbrowser-client.js"));
const utils_js_1 = require("../utils.js");
async function scrapeHN(apiKey) {
    const hb = new hyperbrowser_client_js_1.default({ apiKey });
    const results = [];
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
                        domain: externalUrl ? (0, utils_js_1.extractDomain)(externalUrl) : 'news.ycombinator.com'
                    });
                }
            }
        }
        // Small delay before scraping new page
        await (0, utils_js_1.sleep)((0, utils_js_1.addJitter)(2000));
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
                            domain: externalUrl ? (0, utils_js_1.extractDomain)(externalUrl) : 'news.ycombinator.com'
                        });
                    }
                }
            }
        }
    }
    catch (error) {
        console.error('Error scraping HN:', error);
    }
    return results;
}
function parseHNTime(timeAgo) {
    if (!timeAgo)
        return new Date().toISOString();
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
//# sourceMappingURL=hn.js.map