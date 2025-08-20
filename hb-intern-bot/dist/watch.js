"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WatchManager = void 0;
exports.runWatchLoop = runWatchLoop;
exports.shouldRunWatch = shouldRunWatch;
exports.formatWatchStatus = formatWatchStatus;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const utils_js_1 = require("./utils.js");
class WatchManager {
    constructor(outputDir) {
        this.stateFile = path_1.default.join(outputDir, 'state.json');
        this.state = this.loadState();
    }
    loadState() {
        try {
            if (fs_1.default.existsSync(this.stateFile)) {
                const data = fs_1.default.readFileSync(this.stateFile, 'utf8');
                const parsed = JSON.parse(data);
                return {
                    seenIds: new Set(parsed.seenIds || []),
                    lastRun: parsed.lastRun || (0, utils_js_1.nowISO)()
                };
            }
        }
        catch (error) {
            console.warn('Could not load watch state:', error);
        }
        return {
            seenIds: new Set(),
            lastRun: (0, utils_js_1.nowISO)()
        };
    }
    saveState() {
        try {
            const data = {
                seenIds: Array.from(this.state.seenIds),
                lastRun: this.state.lastRun
            };
            fs_1.default.writeFileSync(this.stateFile, JSON.stringify(data, null, 2), 'utf8');
        }
        catch (error) {
            console.error('Could not save watch state:', error);
        }
    }
    markEventsSeen(eventIds) {
        for (const id of eventIds) {
            this.state.seenIds.add(id);
        }
        this.saveState();
    }
    isEventSeen(eventId) {
        return this.state.seenIds.has(eventId);
    }
    updateLastRun() {
        this.state.lastRun = (0, utils_js_1.nowISO)();
        this.saveState();
    }
    getLastRun() {
        return this.state.lastRun;
    }
    reset() {
        this.state = {
            seenIds: new Set(),
            lastRun: (0, utils_js_1.nowISO)()
        };
        try {
            if (fs_1.default.existsSync(this.stateFile)) {
                fs_1.default.unlinkSync(this.stateFile);
            }
        }
        catch (error) {
            console.warn('Could not delete state file:', error);
        }
    }
    filterUnseenEvents(events) {
        return events.filter(event => !this.isEventSeen(event.id));
    }
    // Clean up old seen IDs to prevent memory bloat
    // Keep only IDs from the last 30 days
    cleanup() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // Since we don't store timestamps for seen IDs, we'll just limit the size
        const maxSeenIds = 10000;
        if (this.state.seenIds.size > maxSeenIds) {
            const idsArray = Array.from(this.state.seenIds);
            // Keep the last maxSeenIds/2 entries (assuming newer ones are added last)
            const keepIds = idsArray.slice(-Math.floor(maxSeenIds / 2));
            this.state.seenIds = new Set(keepIds);
            this.saveState();
            console.log(`Cleaned up seen IDs: kept ${keepIds.length} of ${idsArray.length}`);
        }
    }
}
exports.WatchManager = WatchManager;
async function runWatchLoop(runFunction, intervalMinutes, watchManager) {
    console.log(`Starting watch loop: running every ${intervalMinutes} minutes`);
    let runCount = 0;
    while (true) {
        try {
            runCount++;
            console.log(`\n--- Watch run #${runCount} at ${(0, utils_js_1.nowISO)()} ---`);
            await runFunction();
            watchManager.updateLastRun();
            // Cleanup periodically
            if (runCount % 10 === 0) {
                watchManager.cleanup();
            }
            console.log(`Completed run #${runCount}. Next run in ${intervalMinutes} minutes.`);
        }
        catch (error) {
            console.error(`Error in watch run #${runCount}:`, error);
        }
        // Wait for the specified interval
        const waitMs = intervalMinutes * 60 * 1000;
        await (0, utils_js_1.sleep)(waitMs);
    }
}
function shouldRunWatch(intervalMinutes, lastRun) {
    const now = Date.now();
    const lastRunTime = new Date(lastRun).getTime();
    const intervalMs = intervalMinutes * 60 * 1000;
    return (now - lastRunTime) >= intervalMs;
}
function formatWatchStatus(intervalMinutes, lastRun, nextRun) {
    const now = new Date();
    const lastRunDate = new Date(lastRun);
    const nextRunDate = nextRun ? new Date(nextRun) : new Date(lastRunDate.getTime() + intervalMinutes * 60 * 1000);
    const timeSinceLastRun = Math.floor((now.getTime() - lastRunDate.getTime()) / 60000);
    const timeToNextRun = Math.floor((nextRunDate.getTime() - now.getTime()) / 60000);
    return `Last run: ${timeSinceLastRun}m ago, Next run: ${timeToNextRun > 0 ? `${timeToNextRun}m` : 'now'}`;
}
//# sourceMappingURL=watch.js.map