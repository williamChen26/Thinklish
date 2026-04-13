import type { RefreshPosture } from '@thinklish/shared';

/** Subset of source fields needed for scheduling decisions (pure logic). */
export interface FeedSchedulerSourceState {
  id: number;
  status: 'enabled' | 'paused';
  sourceType: 'feed' | 'watch';
  refreshPosture: RefreshPosture | null;
  consecutiveFailures: number;
  lastAttemptAt: string | null;
}

const INTERVAL_MANUAL_MS = Number.POSITIVE_INFINITY;
const INTERVAL_RELAXED_MS = 7_200_000;
const INTERVAL_NORMAL_MS = 1_800_000;
const BACKOFF_CAP = 48;

export function getEffectivePosture(source: FeedSchedulerSourceState, globalPosture: RefreshPosture): RefreshPosture {
  return source.refreshPosture ?? globalPosture;
}

export function getEffectiveIntervalMs(posture: RefreshPosture): number {
  switch (posture) {
    case 'manual':
      return INTERVAL_MANUAL_MS;
    case 'relaxed':
      return INTERVAL_RELAXED_MS;
    case 'normal':
      return INTERVAL_NORMAL_MS;
    default: {
      const _exhaustive: never = posture;
      return _exhaustive;
    }
  }
}

export function getBackoffMultiplier(consecutiveFailures: number): number {
  if (consecutiveFailures <= 0) {
    return 1;
  }
  const raw = 2 ** consecutiveFailures;
  return Math.min(raw, BACKOFF_CAP);
}

function parseAttemptMs(lastAttemptAt: string | null): number | null {
  if (!lastAttemptAt) {
    return null;
  }
  const ms = Date.parse(lastAttemptAt);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Earliest time (epoch ms) the source may be fetched again under scheduling rules.
 * `0` means eligible immediately (no prior attempt).
 */
/** Next eligible fetch time as epoch milliseconds (`0` = immediately, `Infinity` = never under auto schedule). */
export function getNextDueTime(source: FeedSchedulerSourceState, globalPosture: RefreshPosture): number {
  const posture = getEffectivePosture(source, globalPosture);
  const interval = getEffectiveIntervalMs(posture);
  if (!Number.isFinite(interval)) {
    return Number.POSITIVE_INFINITY;
  }
  const lastMs = parseAttemptMs(source.lastAttemptAt);
  const mult = getBackoffMultiplier(source.consecutiveFailures);
  if (lastMs === null) {
    return 0;
  }
  return lastMs + interval * mult;
}

export function isSourceDue(source: FeedSchedulerSourceState, globalPosture: RefreshPosture, nowMs: number): boolean {
  if (source.status !== 'enabled' || source.sourceType !== 'feed') {
    return false;
  }
  const next = getNextDueTime(source, globalPosture);
  if (next === Number.POSITIVE_INFINITY) {
    return false;
  }
  return nowMs >= next;
}

export function pickNextSource(
  sources: FeedSchedulerSourceState[],
  lastRefreshedId: number | null,
  globalPosture: RefreshPosture,
  nowMs: number
): FeedSchedulerSourceState | undefined {
  const due = sources.filter((s) => isSourceDue(s, globalPosture, nowMs));
  if (due.length === 0) {
    return undefined;
  }
  const sorted = [...due].sort((a, b) => a.id - b.id);
  const pivot = lastRefreshedId ?? 0;
  const after = sorted.find((s) => s.id > pivot);
  if (after) {
    return after;
  }
  return sorted[0];
}

/** Minimum ms until any schedulable feed becomes due; `null` if none or manual-only. */
export function computeSchedulerDelayMs(
  sources: FeedSchedulerSourceState[],
  globalPosture: RefreshPosture,
  nowMs: number
): number | null {
  const feeds = sources.filter((s) => s.status === 'enabled' && s.sourceType === 'feed');
  if (feeds.length === 0) {
    return null;
  }
  let minDelay: number | null = null;
  for (const s of feeds) {
    const posture = getEffectivePosture(s, globalPosture);
    const interval = getEffectiveIntervalMs(posture);
    if (!Number.isFinite(interval)) {
      continue;
    }
    const next = getNextDueTime(s, globalPosture);
    if (next === Number.POSITIVE_INFINITY) {
      continue;
    }
    const delay = Math.max(0, next - nowMs);
    if (minDelay === null || delay < minDelay) {
      minDelay = delay;
    }
  }
  return minDelay;
}
