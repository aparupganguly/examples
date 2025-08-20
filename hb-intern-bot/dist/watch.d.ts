export declare class WatchManager {
    private stateFile;
    private state;
    constructor(outputDir: string);
    private loadState;
    private saveState;
    markEventsSeen(eventIds: string[]): void;
    isEventSeen(eventId: string): boolean;
    updateLastRun(): void;
    getLastRun(): string;
    reset(): void;
    filterUnseenEvents<T extends {
        id: string;
    }>(events: T[]): T[];
    cleanup(): void;
}
export declare function runWatchLoop(runFunction: () => Promise<void>, intervalMinutes: number, watchManager: WatchManager): Promise<void>;
export declare function shouldRunWatch(intervalMinutes: number, lastRun: string): boolean;
export declare function formatWatchStatus(intervalMinutes: number, lastRun: string, nextRun?: string): string;
//# sourceMappingURL=watch.d.ts.map