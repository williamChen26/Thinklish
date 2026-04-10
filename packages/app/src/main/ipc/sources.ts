import { ipcMain } from 'electron';
import {
  createSource,
  deleteSource,
  getAllSources,
  setSourcePaused,
  updateSource
} from '@thinklish/core';
import type {
  IngestionSource,
  IngestionSourceCreateInput,
  IngestionSourceUpdateInput
} from '@thinklish/shared';

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
    (o['sourceType'] === 'feed' || o['sourceType'] === 'watch')
  );
}

function isUpdateInput(value: unknown): value is IngestionSourceUpdateInput {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (o['label'] !== undefined && typeof o['label'] !== 'string') return false;
  if (o['englishOnly'] !== undefined && typeof o['englishOnly'] !== 'boolean') return false;
  return o['label'] !== undefined || o['englishOnly'] !== undefined;
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
      return { success: true };
    } catch (err) {
      return { success: false, error: errMessage(err) };
    }
  });
}
