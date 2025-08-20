"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("@hyperbrowser/sdk");
const zod_1 = require("zod");
class HyperbrowserClient {
    constructor(config) {
        this.client = new sdk_1.Hyperbrowser({
            apiKey: config.apiKey,
        });
    }
    async extract(options) {
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
        }
        catch (error) {
            console.error(`❌ Error extracting from ${options.url}:`, error);
            return {
                error: error instanceof Error ? error.message : 'Unknown error',
                data: null
            };
        }
    }
    getSchemaAndPrompt(url) {
        if (url.includes('news.ycombinator.com')) {
            return {
                schema: zod_1.z.object({
                    articles: zod_1.z.array(zod_1.z.object({
                        title: zod_1.z.string(),
                        url: zod_1.z.string().optional(),
                        points: zod_1.z.number().optional(),
                        comments_count: zod_1.z.number().optional(),
                        author: zod_1.z.string().optional(),
                        time_ago: zod_1.z.string().optional(),
                        article_url: zod_1.z.string().optional(),
                        id: zod_1.z.string().optional()
                    }))
                }),
                prompt: 'Extract articles from this Hacker News page. For each article, get the title, URL, points (score), number of comments, author, time posted, and article ID.'
            };
        }
        else if (url.includes('reddit.com')) {
            return {
                schema: zod_1.z.object({
                    posts: zod_1.z.array(zod_1.z.object({
                        title: zod_1.z.string(),
                        url: zod_1.z.string().optional(),
                        permalink: zod_1.z.string(),
                        score: zod_1.z.number().optional(),
                        num_comments: zod_1.z.number().optional(),
                        author: zod_1.z.string().optional(),
                        created_utc: zod_1.z.number().optional(),
                        subreddit: zod_1.z.string().optional(),
                        is_self: zod_1.z.boolean().optional(),
                        selftext: zod_1.z.string().optional()
                    }))
                }),
                prompt: 'Extract posts from this Reddit page. For each post, get the title, URL, permalink, score (upvotes), number of comments, author, subreddit, creation time, and post content.'
            };
        }
        else if (url.includes('producthunt.com')) {
            return {
                schema: zod_1.z.object({
                    products: zod_1.z.array(zod_1.z.object({
                        name: zod_1.z.string(),
                        tagline: zod_1.z.string().optional(),
                        url: zod_1.z.string().optional(),
                        votes: zod_1.z.number().optional(),
                        comments_count: zod_1.z.number().optional(),
                        maker: zod_1.z.string().optional(),
                        product_url: zod_1.z.string().optional()
                    }))
                }),
                prompt: 'Extract products from this Product Hunt page. For each product, get the name, tagline, URL, number of votes, number of comments, and maker/creator.'
            };
        }
        else {
            // Blog or general site
            return {
                schema: zod_1.z.object({
                    posts: zod_1.z.array(zod_1.z.object({
                        title: zod_1.z.string(),
                        url: zod_1.z.string().optional(),
                        date: zod_1.z.string().optional(),
                        author: zod_1.z.string().optional(),
                        excerpt: zod_1.z.string().optional(),
                        link: zod_1.z.string().optional()
                    }))
                }),
                prompt: 'Extract recent blog posts or articles from this page. For each post, get the title, URL, publication date, author, and excerpt if available.'
            };
        }
    }
}
exports.default = HyperbrowserClient;
//# sourceMappingURL=hyperbrowser-client.js.map