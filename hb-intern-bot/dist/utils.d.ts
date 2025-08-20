import { ParsedWindow } from './types.js';
export declare function slug(s: string): string;
export declare function sha1(s: string): string;
export declare function parseWindow(s: '24h' | '48h' | '7d'): ParsedWindow;
export declare function nowISO(): string;
export declare function relTime(iso: string): string;
export declare function sleep(ms: number): Promise<void>;
export declare function normalizeScores(nums: number[]): (x: number) => number;
export declare function extractDomain(url: string): string;
export declare function isReputableDomain(domain: string): boolean;
export declare function truncate(text: string, maxLength: number): string;
export declare function addJitter(baseMs: number, jitterPercent?: number): number;
export declare function timestamp(): string;
export declare function parseHours(timeStr: string): number;
//# sourceMappingURL=utils.d.ts.map