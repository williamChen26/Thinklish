import { ipcMain } from 'electron';
import {
  createSource,
  deleteArticlesBySource,
  deleteSource,
  fetchFeed,
  getAllSources,
  getGlobalRefreshPosture,
  getSourceArticlesDeleteImpact,
  getSourceById,
  setGlobalRefreshPosture,
  setSourcePaused,
  updateSource
} from '@thinklish/core';
import type {
  FeedRefreshResult,
  IngestionSource,
  IngestionSourceCreateInput,
  IngestionSourceUpdateInput,
  RefreshAllResult,
  RefreshPosture,
  SourceArticlesDeleteImpact
} from '@thinklish/shared';
import { getFeedScheduler } from '../services/feed-scheduler';

type CreateSourceResult =
  | { success: true; source: IngestionSource }
  | { success: false; error: string };

type UpdateSourceResult =
  | { success: true; source: IngestionSource }
  | { success: false; error: string };

type SetPausedResult =
  | { success: true; source: IngestionSource }
  | { success: false; error: string };

type DeleteSourceResult = { success: true } | { success: false; error: string };

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error';
}

function isPositiveIntegerId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isCreateInput(value: unknown): value is IngestionSourceCreateInput {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (o['englishOnly'] !== undefined && typeof o['englishOnly'] !== 'boolean') {
    return false;
  }
  return (
    typeof o['url'] === 'string' &&
    typeof o['label'] === 'string' &&
    o['sourceType'] === 'feed'
  );
}

function isRefreshPostureValue(value: unknown): value is RefreshPosture {
  return value === 'manual' || value === 'relaxed' || value === 'normal';
}

function isUpdateInput(value: unknown): value is IngestionSourceUpdateInput {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (o['label'] !== undefined && typeof o['label'] !== 'string') return false;
  if (o['englishOnly'] !== undefined && typeof o['englishOnly'] !== 'boolean') return false;
  if (o['refreshPosture'] !== undefined && o['refreshPosture'] !== null && !isRefreshPostureValue(o['refreshPosture'])) {
    return false;
  }
  return o['label'] !== undefined || o['englishOnly'] !== undefined || o['refreshPosture'] !== undefined;
}

function notifySchedulerReschedule(): void {
  getFeedScheduler()?.reschedule();
}

export function registerSourceHandlers(): void {
  ipcMain.handle('sources:list', () => {
    return getAllSources();
  });

  ipcMain.handle('sources:create', (_event, input: unknown): CreateSourceResult => {
    if (!isCreateInput(input)) {
      return { success: false, error: 'Invalid source payload' };
    }
    try {
      const source = createSource(input);
      notifySchedulerReschedule();
      return { success: true, source };
    } catch (err) {
      return { success: false, error: errMessage(err) };
    }
  });

  ipcMain.handle('sources:update', (_event, id: unknown, input: unknown): UpdateSourceResult => {
    if (!isPositiveIntegerId(id)) {
      return { success: false, error: 'Invalid source id' };
    }
    if (!isUpdateInput(input)) {
      return { success: false, error: 'Invalid update payload' };
    }
    try {
      const source = updateSource(id, input);
      notifySchedulerReschedule();
      return { success: true, source };
    } catch (err) {
      return { success: false, error: errMessage(err) };
    }
  });

  ipcMain.handle('sources:setPaused', (_event, id: unknown, paused: unknown): SetPausedResult => {
    if (!isPositiveIntegerId(id)) {
      return { success: false, error: 'Invalid source id' };
    }
    if (typeof paused !== 'boolean') {
      return { success: false, error: 'Invalid paused flag' };
    }
    try {
      const source = setSourcePaused(id, paused);
      notifySchedulerReschedule();
      return { success: true, source };
    } catch (err) {
      return { success: false, error: errMessage(err) };
    }
  });

  ipcMain.handle('sources:delete', (_event, id: unknown): DeleteSourceResult => {
    if (!isPositiveIntegerId(id)) {
      return { success: false, error: 'Invalid source id' };
    }
    try {
      deleteSource(id);
      notifySchedulerReschedule();
      return { success: true };
    } catch (err) {
      return { success: false, error: errMessage(err) };
    }
  });

  ipcMain.handle('sources:refreshFeed', async (_event, id: unknown): Promise<FeedRefreshResult> => {
    if (!isPositiveIntegerId(id)) {
      return { ok: false, inserted: 0, updated: 0, skipped: 0, error: 'Invalid source id' };
    }
    const source = getSourceById(id);
    if (!source) {
      return { ok: false, inserted: 0, updated: 0, skipped: 0, error: 'Source not found' };
    }
    return fetchFeed(source);
  });

  ipcMain.handle('sources:getGlobalPosture', (): RefreshPosture => {
    return getGlobalRefreshPosture();
  });

  ipcMain.handle('sources:setGlobalPosture', (_event, posture: unknown): { success: true } | { success: false; error: string } => {
    if (!isRefreshPostureValue(posture)) {
      return { success: false, error: 'Invalid refresh posture' };
    }
    setGlobalRefreshPosture(posture);
    notifySchedulerReschedule();
    return { success: true };
  });

  ipcMain.handle('sources:refreshAll', async (): Promise<RefreshAllResult> => {
    const sched = getFeedScheduler();
    if (!sched) {
      return { successCount: 0, failCount: 0, skippedCount: 0, errors: [] };
    }
    return sched.refreshAll();
  });

  ipcMain.handle(
    'sources:deleteWithArticlesPreview',
    (_event, id: unknown): { success: true; impact: SourceArticlesDeleteImpact } | { success: false; error: string } => {
      if (!isPositiveIntegerId(id)) {
        return { success: false, error: 'Invalid source id' };
      }
      const impact = getSourceArticlesDeleteImpact(id);
      return { success: true, impact };
    }
  );

  ipcMain.handle(
    'sources:deleteWithArticles',
    (_event, id: unknown): { success: true; deletedCount: number } | { success: false; error: string } => {
      if (!isPositiveIntegerId(id)) {
        return { success: false, error: 'Invalid source id' };
      }
      try {
        const { deletedCount } = deleteArticlesBySource(id);
        return { success: true, deletedCount };
      } catch (err) {
        return { success: false, error: errMessage(err) };
      }
    }
  );
}
