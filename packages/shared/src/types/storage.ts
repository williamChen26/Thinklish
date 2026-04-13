/** Global retention knobs (0 = disabled for numeric caps / age). */
export interface RetentionPolicy {
  /** Delete imported stubs older than this many days; 0 disables. Default 30. */
  maxUnreadImportedAgeDays: number;
  /** Max imported articles (any read state); 0 disables. */
  maxImportedTotal: number;
  /** Max imported articles per source_id; 0 disables. */
  perSourceImportedCap: number;
}

export interface StorageStats {
  importedCount: number;
  manualCount: number;
  /** Sum of LENGTH(text columns) for imported rows (approximate). */
  importedApproxBytes: number;
  /** Sum of LENGTH(text columns) for manual rows. */
  manualApproxBytes: number;
}

export interface RetentionCleanupPreview {
  wouldDelete: number;
  /** Imported stubs past the age rule that still have lookups (retention will not remove). */
  protectedStubsPastAgeWithLookups: number;
}

export interface RetentionCleanupResult {
  deletedCount: number;
}

export interface SourceArticlesDeleteImpact {
  articleCount: number;
  articlesWithLookups: number;
  lookupCount: number;
}
