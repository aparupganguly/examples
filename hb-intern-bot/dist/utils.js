"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.slug = slug;
exports.sha1 = sha1;
exports.parseWindow = parseWindow;
exports.nowISO = nowISO;
exports.relTime = relTime;
exports.sleep = sleep;
exports.normalizeScores = normalizeScores;
exports.extractDomain = extractDomain;
exports.isReputableDomain = isReputableDomain;
exports.truncate = truncate;
exports.addJitter = addJitter;
exports.timestamp = timestamp;
exports.parseHours = parseHours;
const crypto_1 = __importDefault(require("crypto"));
function slug(s) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
function sha1(s) {
    return crypto_1.default.createHash('sha1').update(s).digest('hex');
}
function parseWindow(s) {
    const now = new Date();
    const hours = s === '24h' ? 24 : s === '48h' ? 48 : 168; // 7d = 168h
    const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
    return {
        startISO: start.toISOString(),
        endISO: now.toISOString(),
        hours
    };
}
function nowISO() {
    return new Date().toISOString();
}
function relTime(iso) {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 60)
        return `${diffMins}m ago`;
    if (diffHours < 24)
        return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function normalizeScores(nums) {
    if (nums.length === 0)
        return (x) => 0;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const range = max - min;
    if (range === 0)
        return (x) => 0.5;
    return (x) => Math.max(0, Math.min(1, (x - min) / range));
}
function extractDomain(url) {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, '');
    }
    catch {
        return '';
    }
}
function isReputableDomain(domain) {
    const reputable = [
        'github.com',
        'arxiv.org',
        'vercel.com',
        'openai.com',
        'anthropic.com',
        'deepmind.google',
        'aws.amazon.com',
        'microsoft.com',
        'google.com',
        'techcrunch.com',
        'ycombinator.com',
        'stripe.com',
        'cloudflare.com'
    ];
    return reputable.some(rep => domain.includes(rep));
}
function truncate(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength - 3) + '...';
}
function addJitter(baseMs, jitterPercent = 10) {
    const jitter = baseMs * (jitterPercent / 100);
    return baseMs + (Math.random() * jitter * 2 - jitter);
}
function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}
function parseHours(timeStr) {
    const match = timeStr.match(/^(\d+)([hd])$/);
    if (!match)
        return 24; // default
    const [, num, unit] = match;
    const hours = parseInt(num, 10);
    return unit === 'h' ? hours : hours * 24;
}
//# sourceMappingURL=utils.js.map