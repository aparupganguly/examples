import fs from 'fs';
import path from 'path';
import { WatchState } from './types.js';
import { sleep, nowISO } from './utils.js';

export class WatchManager {
  private stateFile: string;
  private state: WatchState;

  constructor(outputDir: string) {
    this.stateFile = path.join(outputDir, 'state.json');
    this.state = this.loadState();
  }

  private loadState(): WatchState {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf8');
        const parsed = JSON.parse(data);
        return {
          seenIds: new Set(parsed.seenIds || []),
          lastRun: parsed.lastRun || nowISO()
        };
      }
    } catch (error) {
      console.warn('Could not load watch state:', error);
    }

    return {
      seenIds: new Set(),
      lastRun: nowISO()
    };
  }

  private saveState(): void {
    try {
      const data = {
        seenIds: Array.from(this.state.seenIds),
        lastRun: this.state.lastRun
      };
      fs.writeFileSync(this.stateFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Could not save watch state:', error);
    }
  }

  markEventsSeen(eventIds: string[]): void {
    for (const id of eventIds) {
      this.state.seenIds.add(id);
    }
    this.saveState();
  }

  isEventSeen(eventId: string): boolean {
    return this.state.seenIds.has(eventId);
  }

  updateLastRun(): void {
    this.state.lastRun = nowISO();
    this.saveState();
  }

  getLastRun(): string {
    return this.state.lastRun;
  }

  reset(): void {
    this.state = {
      seenIds: new Set(),
      lastRun: nowISO()
    };
    
    try {
      if (fs.existsSync(this.stateFile)) {
        fs.unlinkSync(this.stateFile);
      }
    } catch (error) {
      console.warn('Could not delete state file:', error);
    }
  }

  filterUnseenEvents<T extends { id: string }>(events: T[]): T[] {
    return events.filter(event => !this.isEventSeen(event.id));
  }

  // Clean up old seen IDs to prevent memory bloat
  // Keep only IDs from the last 30 days
  cleanup(): void {
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

export async function runWatchLoop(
  runFunction: () => Promise<void>,
  intervalMinutes: number,
  watchManager: WatchManager
): Promise<void> {
  console.log(`Starting watch loop: running every ${intervalMinutes} minutes`);
  
  let runCount = 0;
  
  while (true) {
    try {
      runCount++;
      console.log(`\n--- Watch run #${runCount} at ${nowISO()} ---`);
      
      await runFunction();
      watchManager.updateLastRun();
      
      // Cleanup periodically
      if (runCount % 10 === 0) {
        watchManager.cleanup();
      }
      
      console.log(`Completed run #${runCount}. Next run in ${intervalMinutes} minutes.`);
      
    } catch (error) {
      console.error(`Error in watch run #${runCount}:`, error);
    }
    
    // Wait for the specified interval
    const waitMs = intervalMinutes * 60 * 1000;
    await sleep(waitMs);
  }
}

export function shouldRunWatch(intervalMinutes: number, lastRun: string): boolean {
  const now = Date.now();
  const lastRunTime = new Date(lastRun).getTime();
  const intervalMs = intervalMinutes * 60 * 1000;
  
  return (now - lastRunTime) >= intervalMs;
}

export function formatWatchStatus(
  intervalMinutes: number,
  lastRun: string,
  nextRun?: string
): string {
  const now = new Date();
  const lastRunDate = new Date(lastRun);
  const nextRunDate = nextRun ? new Date(nextRun) : new Date(lastRunDate.getTime() + intervalMinutes * 60 * 1000);
  
  const timeSinceLastRun = Math.floor((now.getTime() - lastRunDate.getTime()) / 60000);
  const timeToNextRun = Math.floor((nextRunDate.getTime() - now.getTime()) / 60000);
  
  return `Last run: ${timeSinceLastRun}m ago, Next run: ${timeToNextRun > 0 ? `${timeToNextRun}m` : 'now'}`;
}
