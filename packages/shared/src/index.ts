export type {
  Article,
  ArticleCreateInput
} from './types/article';

export type { FeedRefreshResult } from './types/feed';

export type {
  Lookup,
  LookupCreateInput,
  LookupType,
  MasteryStatus
} from './types/lookup';

export type {
  Card,
  CardBucket,
  CardCreateInput,
  CardStats,
  CardWithBucket
} from './types/card';

export type {
  IngestionSource,
  IngestionSourceCreateInput,
  IngestionSourceStatus,
  IngestionSourceType,
  IngestionSourceUpdateInput
} from './types/ingestion-source';

export type {
  RefreshAllResult,
  RefreshPosture,
  RefreshProgressEvent,
  RefreshProgressPhase
} from './types/refresh-schedule';

export type {
  RetentionCleanupPreview,
  RetentionCleanupResult,
  RetentionPolicy,
  SourceArticlesDeleteImpact,
  StorageStats
} from './types/storage';

export type { DiscoveredFeed } from './types/discovered-feed';

export {
  computeSchedulerDelayMs,
  getBackoffMultiplier,
  getEffectiveInterval,
  getEffectiveIntervalMs,
  getEffectivePosture,
  getNextDueTime,
  isSourceDue,
  pickNextSource
} from './feed-scheduler-logic';

export type { FeedSchedulerSourceState } from './feed-scheduler-logic';

export { remediateIngestionError } from './source-error-remediation';
export type { IngestionErrorRemediation } from './source-error-remediation';
