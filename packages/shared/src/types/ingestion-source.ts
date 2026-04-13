import type { RefreshPosture } from './refresh-schedule';

export type IngestionSourceType = 'feed';

export type IngestionSourceStatus = 'enabled' | 'paused';

export interface IngestionSource {
  id: number;
  url: string;
  label: string;
  sourceType: IngestionSourceType;
  status: IngestionSourceStatus;
  englishOnly: boolean;
  /** When null, global default refresh posture applies. */
  refreshPosture: RefreshPosture | null;
  consecutiveFailures: number;
  lastAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastSuccessAt: string | null;
  lastError: string | null;
}

export interface IngestionSourceCreateInput {
  url: string;
  label: string;
  sourceType: IngestionSourceType;
  /** Defaults to true when omitted */
  englishOnly?: boolean;
}

export interface IngestionSourceUpdateInput {
  label?: string;
  englishOnly?: boolean;
  /** Set to null to clear per-source override and inherit global posture. */
  refreshPosture?: RefreshPosture | null;
}
