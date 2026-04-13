import type {
  RetentionCleanupPreview,
  RetentionCleanupResult,
  RetentionPolicy,
  SourceArticlesDeleteImpact,
  StorageStats
} from '@thinklish/shared';
import { getDatabase } from '../database/connection';
import { getSetting, setSetting } from '../settings/repository';

const KEY_RETENTION_POLICY = 'retention_policy';

const DEFAULT_POLICY: RetentionPolicy = {
  maxUnreadImportedAgeDays: 30,
  maxImportedTotal: 0,
  perSourceImportedCap: 0
};

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function parsePolicy(raw: string | null): RetentionPolicy {
  if (!raw) return { ...DEFAULT_POLICY };
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    return {
      maxUnreadImportedAgeDays: clampInt(Number(o['maxUnreadImportedAgeDays']), 0, 3650),
      maxImportedTotal: clampInt(Number(o['maxImportedTotal']), 0, 1_000_000),
      perSourceImportedCap: clampInt(Number(o['perSourceImportedCap']), 0, 100_000)
    };
  } catch {
    return { ...DEFAULT_POLICY };
  }
}

export function getRetentionPolicy(): RetentionPolicy {
  return parsePolicy(getSetting(KEY_RETENTION_POLICY));
}

export function setRetentionPolicy(policy: RetentionPolicy): RetentionPolicy {
  const normalized: RetentionPolicy = {
    maxUnreadImportedAgeDays: clampInt(policy.maxUnreadImportedAgeDays, 0, 3650),
    maxImportedTotal: clampInt(policy.maxImportedTotal, 0, 1_000_000),
    perSourceImportedCap: clampInt(policy.perSourceImportedCap, 0, 100_000)
  };
  setSetting(KEY_RETENTION_POLICY, JSON.stringify(normalized));
  return normalized;
}

/** Imported articles eligible for automatic retention (no lookups / learning artifacts). */
const eligibleNoLookupsClause = `
  a.source_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM lookups l WHERE l.article_id = a.id)
`;

function collectIdsFromQuery(db: ReturnType<typeof getDatabase>, sql: string, params: unknown[]): Set<number> {
  const rows = db.prepare(sql).all(...params) as { id: number }[];
  const set = new Set<number>();
  for (const r of rows) {
    set.add(r.id);
  }
  return set;
}

/** Candidate article ids for age-based pruning (unread stub = never fully opened). */
function idsPastUnreadAge(db: ReturnType<typeof getDatabase>, days: number): Set<number> {
  if (days <= 0) return new Set();
  return collectIdsFromQuery(
    db,
    `
    SELECT a.id AS id FROM articles a
    WHERE ${eligibleNoLookupsClause}
      AND a.is_stub = 1
      AND datetime(a.created_at) < datetime('now', '-' || ? || ' days')
  `,
    [days]
  );
}

/** Eligible articles over per-source cap (keep newest per source). */
function idsOverPerSourceCap(db: ReturnType<typeof getDatabase>, cap: number): Set<number> {
  if (cap <= 0) return new Set();
  return collectIdsFromQuery(
    db,
    `
    WITH ranked AS (
      SELECT a.id AS id,
        ROW_NUMBER() OVER (
          PARTITION BY a.source_id
          ORDER BY datetime(a.created_at) DESC, a.id DESC
        ) AS rn
      FROM articles a
      WHERE ${eligibleNoLookupsClause}
    )
    SELECT id FROM ranked WHERE rn > ?
  `,
    [cap]
  );
}

/** Eligible articles over global imported cap (keep newest overall). */
function idsOverGlobalCap(db: ReturnType<typeof getDatabase>, cap: number): Set<number> {
  if (cap <= 0) return new Set();
  return collectIdsFromQuery(
    db,
    `
    WITH ranked AS (
      SELECT a.id AS id,
        ROW_NUMBER() OVER (ORDER BY datetime(a.created_at) DESC, a.id DESC) AS rn
      FROM articles a
      WHERE ${eligibleNoLookupsClause}
    )
    SELECT id FROM ranked WHERE rn > ?
  `,
    [cap]
  );
}

function unionDeleteCandidates(db: ReturnType<typeof getDatabase>, policy: RetentionPolicy): Set<number> {
  const ids = new Set<number>();
  for (const id of idsPastUnreadAge(db, policy.maxUnreadImportedAgeDays)) ids.add(id);
  for (const id of idsOverPerSourceCap(db, policy.perSourceImportedCap)) ids.add(id);
  for (const id of idsOverGlobalCap(db, policy.maxImportedTotal)) ids.add(id);
  return ids;
}

export function getRetentionCleanupPreview(policy: RetentionPolicy = getRetentionPolicy()): RetentionCleanupPreview {
  const db = getDatabase();
  const wouldDelete = unionDeleteCandidates(db, policy).size;

  let protectedStubsPastAgeWithLookups = 0;
  if (policy.maxUnreadImportedAgeDays > 0) {
    const row = db
      .prepare(
        `
      SELECT COUNT(*) AS c FROM articles a
      WHERE a.source_id IS NOT NULL
        AND a.is_stub = 1
        AND datetime(a.created_at) < datetime('now', '-' || ? || ' days')
        AND EXISTS (SELECT 1 FROM lookups l WHERE l.article_id = a.id)
    `
      )
      .get(policy.maxUnreadImportedAgeDays) as { c: number };
    protectedStubsPastAgeWithLookups = row.c;
  }

  return { wouldDelete, protectedStubsPastAgeWithLookups };
}

export function runRetentionCleanup(policy: RetentionPolicy = getRetentionPolicy()): RetentionCleanupResult {
  const db = getDatabase();
  const ids = [...unionDeleteCandidates(db, policy)];
  if (ids.length === 0) {
    return { deletedCount: 0 };
  }
  const del = db.prepare('DELETE FROM articles WHERE id = ?');
  const deleteMany = db.transaction((articleIds: number[]) => {
    let n = 0;
    for (const id of articleIds) {
      n += del.run(id).changes;
    }
    return n;
  });
  const deletedCount = deleteMany(ids);
  return { deletedCount };
}

export function getStorageStats(): StorageStats {
  const db = getDatabase();
  const row = db
    .prepare(
      `
    SELECT
      SUM(CASE WHEN source_id IS NOT NULL THEN 1 ELSE 0 END) AS imported_count,
      SUM(CASE WHEN source_id IS NULL THEN 1 ELSE 0 END) AS manual_count,
      SUM(CASE WHEN source_id IS NOT NULL THEN
        length(url) + length(title) + length(content) + length(content_html) + length(source_domain) + coalesce(length(published_at), 0)
      ELSE 0 END) AS imported_bytes,
      SUM(CASE WHEN source_id IS NULL THEN
        length(url) + length(title) + length(content) + length(content_html) + length(source_domain) + coalesce(length(published_at), 0)
      ELSE 0 END) AS manual_bytes
    FROM articles
  `
    )
    .get() as {
    imported_count: number | null;
    manual_count: number | null;
    imported_bytes: number | null;
    manual_bytes: number | null;
  };

  return {
    importedCount: row.imported_count ?? 0,
    manualCount: row.manual_count ?? 0,
    importedApproxBytes: row.imported_bytes ?? 0,
    manualApproxBytes: row.manual_bytes ?? 0
  };
}

export function getSourceArticlesDeleteImpact(sourceId: number): SourceArticlesDeleteImpact {
  const db = getDatabase();
  const articleCount = (
    db.prepare('SELECT COUNT(*) AS c FROM articles WHERE source_id = ?').get(sourceId) as { c: number }
  ).c;
  if (articleCount === 0) {
    return { articleCount: 0, articlesWithLookups: 0, lookupCount: 0 };
  }
  const withLookups = (
    db
      .prepare(
        `
      SELECT COUNT(DISTINCT a.id) AS c
      FROM articles a
      WHERE a.source_id = ?
        AND EXISTS (SELECT 1 FROM lookups l WHERE l.article_id = a.id)
    `
      )
      .get(sourceId) as { c: number }
  ).c;
  const lookupCount = (
    db
      .prepare(
        `
      SELECT COUNT(*) AS c FROM lookups l
      INNER JOIN articles a ON a.id = l.article_id
      WHERE a.source_id = ?
    `
      )
      .get(sourceId) as { c: number }
  ).c;
  return { articleCount, articlesWithLookups: withLookups, lookupCount };
}

export function deleteArticlesBySource(sourceId: number): { deletedCount: number } {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM articles WHERE source_id = ?').run(sourceId);
  return { deletedCount: result.changes };
}
