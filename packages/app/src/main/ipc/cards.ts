import { ipcMain, dialog } from 'electron';
import { writeFile } from 'fs/promises';
import {
  createCard,
  getAllCards,
  getCardByLookupId,
  getDueCards,
  updateCardReview,
  exportCardsAsTsv,
  generateCardFromLookup,
  getLookupById
} from '@english-studio/core';

export function registerCardHandlers(): void {
  ipcMain.handle('cards:generateFromLookup', (_event, lookupId: number) => {
    const existing = getCardByLookupId(lookupId);
    if (existing) {
      return { success: true as const, card: existing, alreadyExists: true };
    }

    const lookup = getLookupById(lookupId);
    if (!lookup) {
      return { success: false as const, error: 'Lookup not found' };
    }

    const input = generateCardFromLookup(lookup);
    const card = createCard(input);
    return { success: true as const, card, alreadyExists: false };
  });

  ipcMain.handle('cards:getAll', () => {
    return getAllCards();
  });

  ipcMain.handle('cards:getDue', () => {
    return getDueCards();
  });

  ipcMain.handle('cards:review', (_event, id: number, interval: number, repetitions: number, easeFactor: number) => {
    updateCardReview(id, interval, repetitions, easeFactor);
  });

  ipcMain.handle('cards:exportTsv', async () => {
    const cards = getAllCards();
    if (cards.length === 0) {
      return { success: false as const, error: 'No cards to export' };
    }

    const tsv = exportCardsAsTsv(cards);

    const result = await dialog.showSaveDialog({
      title: 'Export Anki Cards',
      defaultPath: `english-studio-cards-${new Date().toISOString().split('T')[0]}.tsv`,
      filters: [
        { name: 'TSV Files', extensions: ['tsv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false as const, error: 'Export cancelled' };
    }

    await writeFile(result.filePath, tsv, 'utf-8');
    return { success: true as const, path: result.filePath, count: cards.length };
  });
}
