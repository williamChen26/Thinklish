export type IngestionSourceType = 'feed' | 'watch';

export type IngestionSourceStatus = 'enabled' | 'paused';

export interface IngestionSource {
  id: number;
  url: string;
  label: string;
  sourceType: IngestionSourceType;
  status: IngestionSourceStatus;
  englishOnly: boolean;
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
}
