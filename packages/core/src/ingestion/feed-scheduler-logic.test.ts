import { describe, expect, it } from 'vitest';
import type { RefreshPosture } from '@thinklish/shared';
import {
  getBackoffMultiplier,
  getEffectiveIntervalMs,
  getEffectivePosture,
  getNextDueTime,
  isSourceDue,
  pickNextSource,
  type FeedSchedulerSourceState
} from './feed-scheduler-logic';

function src(partial: Partial<FeedSchedulerSourceState> & Pick<FeedSchedulerSourceState, 'id'>): FeedSchedulerSourceState {
  return {
    id: partial.id,
    status: partial.status ?? 'enabled',
    sourceType: partial.sourceType ?? 'feed',
    refreshPosture: partial.refreshPosture ?? null,
    consecutiveFailures: partial.consecutiveFailures ?? 0,
    lastAttemptAt: partial.lastAttemptAt ?? null
  };
}

describe('feed-scheduler-logic', () => {
  describe('getEffectivePosture', () => {
    it('uses per-source override when set', () => {
      expect(getEffectivePosture(src({ id: 1, refreshPosture: 'manual' }), 'normal')).toBe('manual');
    });

    it('inherits global when override is null', () => {
      expect(getEffectivePosture(src({ id: 1, refreshPosture: null }), 'relaxed')).toBe('relaxed');
    });
  });

  describe('getEffectiveIntervalMs', () => {
    it('maps postures to intervals', () => {
      expect(getEffectiveIntervalMs('manual')).toBe(Number.POSITIVE_INFINITY);
      expect(getEffectiveIntervalMs('relaxed')).toBe(7_200_000);
      expect(getEffectiveIntervalMs('normal')).toBe(1_800_000);
    });
  });

  describe('getBackoffMultiplier', () => {
    it('returns 1 for zero failures', () => {
      expect(getBackoffMultiplier(0)).toBe(1);
    });

    it('doubles each failure up to cap 48', () => {
      expect(getBackoffMultiplier(1)).toBe(2);
      expect(getBackoffMultiplier(5)).toBe(32);
      expect(getBackoffMultiplier(6)).toBe(48);
      expect(getBackoffMultiplier(99)).toBe(48);
    });
  });

  describe('getNextDueTime', () => {
    it('returns 0 when never attempted (due immediately)', () => {
      const t = getNextDueTime(src({ id: 1, lastAttemptAt: null, consecutiveFailures: 0 }), 'normal');
      expect(t).toBe(0);
    });

    it('returns Infinity for manual effective posture', () => {
      const t = getNextDueTime(src({ id: 1, lastAttemptAt: '2020-01-01T00:00:00.000Z', refreshPosture: 'manual' }), 'normal');
      expect(t).toBe(Number.POSITIVE_INFINITY);
    });

    it('adds interval after last attempt on success path', () => {
      const last = Date.parse('2024-06-01T12:00:00.000Z');
      const iso = new Date(last).toISOString();
      const next = getNextDueTime(src({ id: 1, lastAttemptAt: iso, consecutiveFailures: 0 }), 'normal');
      expect(next).toBe(last + 1_800_000);
    });

    it('applies exponential backoff after failures', () => {
      const last = Date.parse('2024-06-01T12:00:00.000Z');
      const iso = new Date(last).toISOString();
      const next = getNextDueTime(src({ id: 1, lastAttemptAt: iso, consecutiveFailures: 2 }), 'normal');
      expect(next).toBe(last + 1_800_000 * 4);
    });
  });

  describe('isSourceDue', () => {
    it('is false for paused or watch', () => {
      const now = 1_000_000;
      expect(isSourceDue(src({ id: 1, status: 'paused', lastAttemptAt: null }), 'normal', now)).toBe(false);
      expect(isSourceDue(src({ id: 1, sourceType: 'watch', lastAttemptAt: null }), 'normal', now)).toBe(false);
    });

    it('is false when global and effective posture is manual', () => {
      expect(isSourceDue(src({ id: 1, lastAttemptAt: null }), 'manual', 9_999_999_999)).toBe(false);
    });

    it('is true when never attempted and posture allows schedule', () => {
      expect(isSourceDue(src({ id: 1, lastAttemptAt: null }), 'normal', 0)).toBe(true);
    });

    it('is false before backoff window elapses', () => {
      const last = Date.parse('2024-06-01T12:00:00.000Z');
      const iso = new Date(last).toISOString();
      expect(isSourceDue(src({ id: 1, lastAttemptAt: iso, consecutiveFailures: 1 }), 'normal', last + 1_800_000)).toBe(false);
      expect(isSourceDue(src({ id: 1, lastAttemptAt: iso, consecutiveFailures: 1 }), 'normal', last + 1_800_000 * 2)).toBe(true);
    });
  });

  describe('pickNextSource', () => {
    const global: RefreshPosture = 'normal';
    const now = 10_000;

    it('returns undefined when none due', () => {
      const a = src({
        id: 1,
        lastAttemptAt: new Date(now).toISOString(),
        consecutiveFailures: 0
      });
      expect(pickNextSource([a], null, global, now)).toBeUndefined();
    });

    it('round-robins by id after lastRefreshedId', () => {
      const s1 = src({ id: 1, lastAttemptAt: null });
      const s2 = src({ id: 2, lastAttemptAt: null });
      const s3 = src({ id: 3, lastAttemptAt: null });
      expect(pickNextSource([s1, s2, s3], null, global, now)?.id).toBe(1);
      expect(pickNextSource([s1, s2, s3], 1, global, now)?.id).toBe(2);
      expect(pickNextSource([s1, s2, s3], 2, global, now)?.id).toBe(3);
      expect(pickNextSource([s1, s2, s3], 3, global, now)?.id).toBe(1);
    });

    it('skips non-due sources in rotation', () => {
      const last = now - 500;
      const recent = new Date(last).toISOString();
      const s1 = src({ id: 1, lastAttemptAt: recent, consecutiveFailures: 0 });
      const s2 = src({ id: 2, lastAttemptAt: null });
      expect(pickNextSource([s1, s2], 0, global, now)?.id).toBe(2);
    });
  });
});
