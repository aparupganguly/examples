import { Event, BotConfig, DigestItem } from '../types.js';
export declare function writeDigest(events: Event[], bot: BotConfig, outputDir: string, options?: {
    generateDeck?: boolean;
    theme?: string;
    sendSlack?: boolean;
    slackWebhook?: string;
}): Promise<void>;
export declare function ensureOutputDir(outputDir: string): void;
export declare function getDigestItems(events: Event[]): DigestItem[];
//# sourceMappingURL=writer.d.ts.map