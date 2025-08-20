export interface Event {
    id: string;
    source: 'hn' | 'reddit' | 'ph' | 'blog';
    title: string;
    url: string;
    permalink: string;
    points: number;
    comments: number;
    author?: string;
    subreddit?: string;
    domain?: string;
    created_at: string;
    summary?: string;
    score?: number;
    why_matters?: string;
}
export interface SourceConfig {
    hn?: boolean;
    reddit?: {
        subs: string[];
    };
    producthunt?: boolean;
    blogs?: string[];
}
export interface BotConfig {
    name: string;
    mode: string;
    sources: SourceConfig;
    include: string[];
    exclude: string[];
}
export interface Config {
    bots: BotConfig[];
}
export interface DigestItem {
    title: string;
    url: string;
    summary: string;
    why_matters: string;
    score: number;
    source: string;
    points: number;
    comments: number;
}
export interface CLIOptions {
    config: string;
    out: string;
    since: string;
    top: number;
    deck: boolean;
    slack: boolean;
    watch?: number;
    theme: string;
    reset: boolean;
}
export interface WatchState {
    seenIds: Set<string>;
    lastRun: string;
}
export interface ScoreComponents {
    velocity: number;
    authority: number;
    impact: number;
    final_score: number;
}
export interface ParsedWindow {
    startISO: string;
    endISO: string;
    hours: number;
}
export interface ThemeColors {
    bg: string;
    fg: string;
    acc: string;
}
export interface ScrapedResult {
    title: string;
    url?: string;
    permalink: string;
    points?: number;
    comments?: number;
    author?: string;
    created_at: string;
    subreddit?: string;
    domain?: string;
}
//# sourceMappingURL=types.d.ts.map