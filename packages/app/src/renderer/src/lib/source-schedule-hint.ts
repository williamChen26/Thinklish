import type { IngestionSource, RefreshPosture } from '@thinklish/shared';
import { getEffectivePosture, getNextDueTime, type FeedSchedulerSourceState } from '@thinklish/shared';

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

/**
 * Human-readable schedule / next-eligible line for the source detail panel.
 */
export function describeSourceSchedule(s: IngestionSource, globalPosture: RefreshPosture, nowMs: number): string {
  if (s.status === 'paused') {
    return 'Paused — no automatic checks until you resume this source.';
  }
  const effective = getEffectivePosture(toSchedulerState(s), globalPosture);
  if (effective === 'manual') {
    return 'Manual-only: use Refresh, or set Normal/Relaxed (globally or for this source) for automatic checks.';
  }

  const next = getNextDueTime(toSchedulerState(s), globalPosture);
  if (next === Number.POSITIVE_INFINITY) {
    return 'No automatic schedule.';
  }
  if (next <= nowMs) {
    return 'Eligible for the next automatic fetch in rotation (may run soon).';
  }
  const when = new Date(next).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  return `Eligible again after ${when} (feeds rotate; exact timing may vary slightly).`;
}
