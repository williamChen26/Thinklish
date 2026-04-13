import { describe, expect, it } from 'vitest';
import type { FeedRefreshResult } from '@thinklish/shared';

/** Mirrors `FeedScheduler.refreshAll`: `skippedCount += result.skipped` after each `fetchFeed`. */
function aggregateSkippedAfterRefreshAll(feedResults: FeedRefreshResult[]): number {
  let skippedCount = 0;
  for (const result of feedResults) {
    skippedCount += result.skipped;
  }
  return skippedCount;
}

describe('refresh-all skipped aggregation', () => {
  it('accumulates skipped across feeds including on failed refreshes', () => {
    const results: FeedRefreshResult[] = [
      { ok: true, inserted: 0, updated: 0, skipped: 2 },
      { ok: false, inserted: 0, updated: 0, skipped: 5, error: 'network' },
      { ok: true, inserted: 1, updated: 0, skipped: 1 }
    ];
    expect(aggregateSkippedAfterRefreshAll(results)).toBe(8);
  });

  it('returns zero when every feed reports zero skipped', () => {
    expect(
      aggregateSkippedAfterRefreshAll([
        { ok: true, inserted: 0, updated: 0, skipped: 0 },
        { ok: true, inserted: 0, updated: 0, skipped: 0 }
      ])
    ).toBe(0);
  });
});
