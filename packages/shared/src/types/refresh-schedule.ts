export type RefreshPosture = 'manual' | 'relaxed' | 'normal';

export type RefreshProgressPhase = 'started' | 'source' | 'completed' | 'error';

export interface RefreshProgressEvent {
  phase: RefreshProgressPhase;
  sourceId?: number;
  sourceName?: string;
  message?: string;
  processed?: number;
  total?: number;
}

export interface RefreshAllResult {
  successCount: number;
  failCount: number;
  skippedCount: number;
  errors: Array<{ sourceId: number; error: string }>;
}
