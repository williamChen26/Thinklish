/** Result of a manual feed refresh (IPC + core ingestion). */
export interface FeedRefreshResult {
  ok: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  error?: string;
}
