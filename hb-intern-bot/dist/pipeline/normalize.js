"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toEvent = toEvent;
exports.normalizeEvents = normalizeEvents;
const utils_js_1 = require("../utils.js");
function toEvent(scraped, source) {
    return {
        id: (0, utils_js_1.sha1)(source + scraped.permalink),
        source,
        title: scraped.title,
        url: scraped.url || scraped.permalink,
        permalink: scraped.permalink,
        points: scraped.points || 0,
        comments: scraped.comments || 0,
        author: scraped.author,
        subreddit: scraped.subreddit,
        domain: scraped.domain,
        created_at: scraped.created_at
    };
}
function normalizeEvents(scrapedResults, bot, sinceWindow) {
    const events = [];
    const window = (0, utils_js_1.parseWindow)(sinceWindow);
    // Convert scraped results to events
    scrapedResults.hn.forEach(r => events.push(toEvent(r, 'hn')));
    scrapedResults.reddit.forEach(r => events.push(toEvent(r, 'reddit')));
    scrapedResults.ph.forEach(r => events.push(toEvent(r, 'ph')));
    scrapedResults.blog.forEach(r => events.push(toEvent(r, 'blog')));
    // Filter by time window
    const filtered = events.filter(event => {
        const eventTime = new Date(event.created_at).getTime();
        const windowStart = new Date(window.startISO).getTime();
        return eventTime >= windowStart;
    });
    // Apply include/exclude filters
    const withFilters = filtered.filter(event => {
        return passesFilters(event, bot.include, bot.exclude);
    });
    // Dedupe by URL preference (external URL > permalink) and then by ID
    const deduped = dedupeEvents(withFilters);
    return deduped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
function passesFilters(event, include, exclude) {
    const text = `${event.title} ${event.domain || ''}`.toLowerCase();
    // Check exclusions first
    if (exclude.length > 0) {
        for (const term of exclude) {
            if (text.includes(term.toLowerCase())) {
                return false;
            }
        }
    }
    // Check inclusions
    if (include.length > 0) {
        for (const term of include) {
            if (text.includes(term.toLowerCase())) {
                return true;
            }
        }
        return false; // If include terms specified but none match
    }
    return true; // No include terms specified, passes exclusion filter
}
function dedupeEvents(events) {
    const urlMap = new Map();
    const idMap = new Map();
    for (const event of events) {
        // Normalize URL for comparison
        const normalizedUrl = normalizeUrl(event.url);
        // Check if we've seen this URL before
        const existing = urlMap.get(normalizedUrl);
        if (existing) {
            // Keep the one with higher points, or prefer external URLs
            if (shouldReplace(existing, event)) {
                urlMap.set(normalizedUrl, event);
                idMap.set(event.id, event);
                idMap.delete(existing.id);
            }
        }
        else {
            // Check for ID collision
            if (!idMap.has(event.id)) {
                urlMap.set(normalizedUrl, event);
                idMap.set(event.id, event);
            }
        }
    }
    return Array.from(idMap.values());
}
function normalizeUrl(url) {
    try {
        const parsed = new URL(url);
        // Remove tracking parameters and normalize
        parsed.searchParams.delete('utm_source');
        parsed.searchParams.delete('utm_medium');
        parsed.searchParams.delete('utm_campaign');
        parsed.searchParams.delete('ref');
        // Remove trailing slash and fragments
        let normalized = parsed.toString().replace(/\/$/, '').replace(/#.*$/, '');
        // Remove www
        normalized = normalized.replace(/\/\/www\./, '//');
        return normalized;
    }
    catch {
        return url.toLowerCase();
    }
}
function shouldReplace(existing, candidate) {
    // Prefer external URLs over permalinks
    if (isExternalUrl(candidate.url) && !isExternalUrl(existing.url)) {
        return true;
    }
    if (!isExternalUrl(candidate.url) && isExternalUrl(existing.url)) {
        return false;
    }
    // If both external or both permalinks, prefer higher points
    return candidate.points > existing.points;
}
function isExternalUrl(url) {
    try {
        const domain = new URL(url).hostname;
        return !domain.includes('reddit.com') &&
            !domain.includes('news.ycombinator.com') &&
            !domain.includes('producthunt.com');
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=normalize.js.map