import { Event } from '../types.js';
export declare function initializeSummarizer(apiKey?: string): void;
export declare function summarizeEvents(events: Event[]): Promise<Event[]>;
export declare function summarizeBatch(events: Event[], batchSize?: number): Promise<Event[]>;
//# sourceMappingURL=summarize.d.ts.map