export { initDatabase, getDatabase, closeDatabase } from './database/connection';
export { createTables } from './database/schema';
export {
  createArticle,
  fillArticleFromExtraction,
  getAllArticles,
  getArticleById,
  deleteArticle
} from './articles/repository';
export {
  createSource,
  deleteSource,
  getAllSources,
  getEnabledSources,
  getSourceById,
  recordSourceAttempt,
  recordSourceFailure,
  resetSourceFailures,
  setSourcePaused,
  updateSource
} from './sources/repository';
export { fetchFeed, ingestFeedXml } from './ingestion/feed-fetcher';
export {
  computeSchedulerDelayMs,
  getBackoffMultiplier,
  getEffectiveIntervalMs,
  getEffectivePosture,
  getNextDueTime,
  isSourceDue,
  pickNextSource,
  type FeedSchedulerSourceState
} from './ingestion/feed-scheduler-logic';
export { getGlobalRefreshPosture, getSetting, setGlobalRefreshPosture, setSetting } from './settings/repository';
export {
  createLookup,
  getAllLookups,
  getLookupById,
  updateMasteryStatus,
  getLookupsByArticleId
} from './lookups/repository';
export {
  createCard,
  getAllCards,
  getCardById,
  getCardByLookupId,
  getDueCards,
  getCardsWithBucket,
  getCardStats,
  updateCardReview,
  exportCardsAsTsv
} from './cards/repository';
export { generateCardFromLookup } from './cards/generator';
