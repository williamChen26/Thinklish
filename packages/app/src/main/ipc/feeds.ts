import { ipcMain } from 'electron';
import { discoverFeeds } from '@thinklish/core';
import type { DiscoveredFeed } from '@thinklish/shared';

export type FeedDiscoverResult = { feeds: DiscoveredFeed[] };

export function registerFeedHandlers(): void {
  ipcMain.handle('feeds:discover', async (_event, raw: unknown): Promise<FeedDiscoverResult> => {
    if (typeof raw !== 'string') {
      return { feeds: [] };
    }
    try {
      const feeds = await discoverFeeds(raw);
      return { feeds };
    } catch {
      return { feeds: [] };
    }
  });
}
