import { ipcMain } from 'electron';
import {
  createLookup,
  getAllLookups,
  updateMasteryStatus,
  getLookupsByArticleId
} from '@thinklish/core';
import type { LookupCreateInput, LookupType, MasteryStatus } from '@thinklish/shared';

export function registerLookupHandlers(): void {
  ipcMain.handle('lookups:create', (_event, input: LookupCreateInput) => {
    return createLookup(input);
  });

  ipcMain.handle('lookups:getAll', (_event, filters?: {
    lookupType?: LookupType;
    masteryStatus?: MasteryStatus;
  }) => {
    return getAllLookups(filters);
  });

  ipcMain.handle('lookups:getByArticle', (_event, articleId: number) => {
    return getLookupsByArticleId(articleId);
  });

  ipcMain.handle('lookups:updateStatus', (_event, id: number, status: MasteryStatus) => {
    updateMasteryStatus(id, status);
  });
}
