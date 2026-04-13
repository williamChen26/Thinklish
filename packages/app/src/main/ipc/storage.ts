import { ipcMain } from 'electron';
import {
  getRetentionCleanupPreview,
  getRetentionPolicy,
  getStorageStats,
  runRetentionCleanup,
  setRetentionPolicy
} from '@thinklish/core';
import type { RetentionPolicy } from '@thinklish/shared';

function isRetentionPolicy(value: unknown): value is RetentionPolicy {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o['maxUnreadImportedAgeDays'] === 'number' &&
    typeof o['maxImportedTotal'] === 'number' &&
    typeof o['perSourceImportedCap'] === 'number'
  );
}

export function registerStorageHandlers(): void {
  ipcMain.handle('storage:getStats', () => {
    return getStorageStats();
  });

  ipcMain.handle('storage:getRetentionPolicy', () => {
    return getRetentionPolicy();
  });

  ipcMain.handle('storage:setRetentionPolicy', (_event, policy: unknown) => {
    if (!isRetentionPolicy(policy)) {
      return { success: false as const, error: 'Invalid retention policy' };
    }
    const saved = setRetentionPolicy(policy);
    return { success: true as const, policy: saved };
  });

  ipcMain.handle('storage:getCleanupPreview', (_event, policy?: unknown) => {
    if (policy === undefined) {
      return getRetentionCleanupPreview();
    }
    if (!isRetentionPolicy(policy)) {
      return { success: false as const, error: 'Invalid retention policy' };
    }
    return { success: true as const, preview: getRetentionCleanupPreview(policy) };
  });

  ipcMain.handle('storage:runCleanup', (_event, policy?: unknown) => {
    if (policy === undefined) {
      return { success: true as const, result: runRetentionCleanup() };
    }
    if (!isRetentionPolicy(policy)) {
      return { success: false as const, error: 'Invalid retention policy' };
    }
    return { success: true as const, result: runRetentionCleanup(policy) };
  });
}
