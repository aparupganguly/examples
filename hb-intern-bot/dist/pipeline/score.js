"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreEvents = scoreEvents;
exports.getTopEvents = getTopEvents;
const utils_js_1 = require("../utils.js");
function scoreEvents(events, bot) {
    if (events.length === 0)
        return events;
    // Calculate raw scores
    const scores = events.map(event => calculateRawScore(event, bot));
    // Normalize velocity scores
    const velocities = scores.map(s => s.velocity);
    const normalizeVelocity = (0, utils_js_1.normalizeScores)(velocities);
    // Calculate final scores and assign to events
    const scoredEvents = events.map((event, i) => {
        const rawScore = scores[i];
        const normalizedVelocity = normalizeVelocity(rawScore.velocity);
        const finalScore = (0.6 * normalizedVelocity +
            0.25 * rawScore.authority +
            0.15 * rawScore.impact);
        return {
            ...event,
            score: Math.max(0, Math.min(1, finalScore))
        };
    });
    return scoredEvents.sort((a, b) => (b.score || 0) - (a.score || 0));
}
function calculateRawScore(event, bot) {
    const velocity = calculateVelocity(event);
    const authority = calculateAuthority(event);
    const impact = calculateImpact(event, bot);
    return {
        velocity,
        authority,
        impact,
        final_score: 0 // Will be calculated later with normalization
    };
}
function calculateVelocity(event) {
    const hoursSincePost = getHoursSinceCreation(event.created_at);
    if (hoursSincePost <= 0)
        return 0;
    // Calculate points per hour with diminishing returns for very old posts
    const pointsPerHour = event.points / Math.max(hoursSincePost, 0.5);
    // Apply logarithmic scaling to prevent outliers from dominating
    const cappedVelocity = Math.log(1 + pointsPerHour * 10) / Math.log(1001); // Cap at ~1000 points/hour
    // Factor in comment engagement
    const commentBonus = Math.log(1 + event.comments) / Math.log(101); // Cap at ~100 comments
    return cappedVelocity + (0.2 * commentBonus);
}
function calculateAuthority(event) {
    let authorityScore = 0;
    // Domain reputation
    if (event.domain && (0, utils_js_1.isReputableDomain)(event.domain)) {
        authorityScore += 0.7;
    }
    // Source authority
    switch (event.source) {
        case 'hn':
            authorityScore += 0.3; // HN has good quality curation
            break;
        case 'reddit':
            authorityScore += 0.2; // Reddit varies by subreddit
            break;
        case 'ph':
            authorityScore += 0.25; // Product Hunt is curated
            break;
        case 'blog':
            authorityScore += 0.4; // Blogs are typically authoritative
            break;
    }
    // Author reputation (basic heuristic)
    if (event.author) {
        const authorLen = event.author.length;
        if (authorLen > 3 && authorLen < 20) {
            authorityScore += 0.1;
        }
    }
    return Math.min(1, authorityScore);
}
function calculateImpact(event, bot) {
    const text = `${event.title} ${event.domain || ''}`.toLowerCase();
    let impactScore = 0;
    // Keywords from include list
    let keywordMatches = 0;
    for (const keyword of bot.include) {
        if (text.includes(keyword.toLowerCase())) {
            keywordMatches++;
        }
    }
    if (keywordMatches > 0) {
        impactScore += Math.min(0.8, keywordMatches * 0.2);
    }
    // Title quality indicators
    if (hasImpactfulWords(event.title)) {
        impactScore += 0.3;
    }
    // Engagement indicators
    if (event.points > 50)
        impactScore += 0.2;
    if (event.comments > 20)
        impactScore += 0.1;
    // Recent posts get slight boost
    const hoursSince = getHoursSinceCreation(event.created_at);
    if (hoursSince < 6) {
        impactScore += 0.1;
    }
    return Math.min(1, impactScore);
}
function hasImpactfulWords(title) {
    const impactfulWords = [
        'launch', 'release', 'announce', 'introduce', 'unveil',
        'breakthrough', 'revolutionary', 'game-changing', 'major',
        'open source', 'free', 'new', 'first', 'beta',
        'funding', 'acquisition', 'partnership', 'collaboration'
    ];
    const lowerTitle = title.toLowerCase();
    return impactfulWords.some(word => lowerTitle.includes(word));
}
function getHoursSinceCreation(createdAt) {
    const now = Date.now();
    const created = new Date(createdAt).getTime();
    return (now - created) / (1000 * 60 * 60);
}
function getTopEvents(events, topN) {
    return events
        .filter(e => e.score !== undefined)
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, topN);
}
//# sourceMappingURL=score.js.map