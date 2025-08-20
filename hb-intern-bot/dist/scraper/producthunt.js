"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeProductHunt = scrapeProductHunt;
const hyperbrowser_client_js_1 = __importDefault(require("../hyperbrowser-client.js"));
const utils_js_1 = require("../utils.js");
async function scrapeProductHunt(apiKey) {
    const hb = new hyperbrowser_client_js_1.default({ apiKey });
    const results = [];
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
                        domain: externalUrl ? (0, utils_js_1.extractDomain)(externalUrl) : 'producthunt.com'
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
                                domain: externalUrl ? (0, utils_js_1.extractDomain)(externalUrl) : 'producthunt.com'
                            });
                        }
                    }
                }
            }
        }
        catch (error) {
            console.warn('Could not scrape PH trending page:', error);
        }
    }
    catch (error) {
        console.error('Error scraping Product Hunt:', error);
    }
    return results;
}
//# sourceMappingURL=producthunt.js.map