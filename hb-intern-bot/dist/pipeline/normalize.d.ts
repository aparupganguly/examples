import { Event, ScrapedResult, BotConfig } from '../types.js';
export declare function toEvent(scraped: ScrapedResult, source: 'hn' | 'reddit' | 'ph' | 'blog'): Event;
export declare function normalizeEvents(scrapedResults: {
    hn: ScrapedResult[];
    reddit: ScrapedResult[];
    ph: ScrapedResult[];
    blog: ScrapedResult[];
}, bot: BotConfig, sinceWindow: string): Event[];
//# sourceMappingURL=normalize.d.ts.map