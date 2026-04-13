import type { WebContents } from 'electron';
import type { IngestionSource, RefreshAllResult, RefreshProgressEvent } from '@thinklish/shared';
import {
  computeSchedulerDelayMs,
  fetchFeed,
  getEnabledSources,
  getGlobalRefreshPosture,
  pickNextSource,
  type FeedSchedulerSourceState
} from '@thinklish/core';

function toSchedulerState(s: IngestionSource): FeedSchedulerSourceState {
  return {
    id: s.id,
    status: s.status,
    sourceType: s.sourceType,
    refreshPosture: s.refreshPosture,
    consecutiveFailures: s.consecutiveFailures,
    lastAttemptAt: s.lastAttemptAt
  };
}

function enabledScheduledSourceStates(): FeedSchedulerSourceState[] {
  return getEnabledSources()
    .filter((s) => s.sourceType === 'feed')
    .map(toSchedulerState);
}

export interface FeedSchedulerOptions {
  getWebContents: () => WebContents | null;
}

const MAX_SLEEP_MS = 86_400_000;

export class FeedScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastRefreshedId: number | null = null;
  private stopped = true;
  private ticking = false;
  private readonly getWebContents: () => WebContents | null;

  constructor(opts: FeedSchedulerOptions) {
    this.getWebContents = opts.getWebContents;
  }

  private sendProgress(ev: RefreshProgressEvent): void {
    const wc = this.getWebContents();
    if (wc && !wc.isDestroyed()) {
      wc.send('sources:refreshProgress', ev);
    }
  }

  start(): void {
    this.stopped = false;
    this.scheduleNext();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /** Recompute the next wake time (e.g. after settings or source list changes). */
  reschedule(): void {
    if (this.stopped) {
      return;
    }
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.ticking) {
      this.scheduleNext();
    }
  }

  private scheduleNext(): void {
    if (this.stopped) {
      return;
    }

    const posture = getGlobalRefreshPosture();
    const states = enabledScheduledSourceStates();
    const now = Date.now();
    const delay = computeSchedulerDelayMs(states, posture, now);

    if (delay === null) {
      return;
    }

    const wait = Math.min(Math.max(delay, 0), MAX_SLEEP_MS);
    this.timer = setTimeout(() => {
      void this.runTick();
    }, wait);
  }

  private async runTick(): Promise<void> {
    if (this.stopped) {
      return;
    }
    this.timer = null;
    this.ticking = true;
    try {
      const posture = getGlobalRefreshPosture();
      const fullSources = getEnabledSources().filter((s) => s.sourceType === 'feed');
      const states = fullSources.map(toSchedulerState);
      const now = Date.now();
      const pick = pickNextSource(states, this.lastRefreshedId, posture, now);
      if (!pick) {
        return;
      }
      const full = fullSources.find((s) => s.id === pick.id);
      if (!full) {
        return;
      }
      this.lastRefreshedId = pick.id;
      await fetchFeed(full);
    } finally {
      this.ticking = false;
      if (!this.stopped) {
        this.scheduleNext();
      }
    }
  }

  async refreshAll(): Promise<RefreshAllResult> {
    const sources = getEnabledSources()
      .filter((s) => s.sourceType === 'feed' && s.status === 'enabled')
      .sort((a, b) => a.id - b.id);

    this.sendProgress({ phase: 'started', total: sources.length, processed: 0 });

    const errors: Array<{ sourceId: number; error: string }> = [];
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < sources.length; i++) {
      const s = sources[i]!;
      const processed = i + 1;
      this.sendProgress({
        phase: 'source',
        sourceId: s.id,
        sourceName: s.label,
        processed,
        total: sources.length
      });
      const result = await fetchFeed(s);
      skippedCount += result.skipped;
      if (result.ok) {
        successCount++;
      } else {
        failCount++;
        errors.push({ sourceId: s.id, error: result.error ?? 'Unknown error' });
      }
      if (i < sources.length - 1) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }

    const summary: RefreshAllResult = { successCount, failCount, skippedCount, errors };
    this.sendProgress({
      phase: 'completed',
      processed: sources.length,
      total: sources.length,
      message: `Done: ${successCount} ok, ${failCount} failed, ${skippedCount} skipped`
    });
    return summary;
  }
}

let feedScheduler: FeedScheduler | null = null;

export function getFeedScheduler(): FeedScheduler | null {
  return feedScheduler;
}

export function createAndRegisterFeedScheduler(opts: FeedSchedulerOptions): FeedScheduler {
  feedScheduler?.stop();
  feedScheduler = new FeedScheduler(opts);
  return feedScheduler;
}
