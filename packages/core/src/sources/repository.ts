import { getDatabase } from '../database/connection';
import type {
  IngestionSource,
  IngestionSourceCreateInput,
  IngestionSourceType,
  IngestionSourceUpdateInput
} from '@thinklish/shared';

interface IngestionSourceRow {
  id: number;
  url: string;
  label: string;
  source_type: string;
  status: string;
  english_only: number;
  created_at: string;
  updated_at: string;
  last_success_at: string | null;
  last_error: string | null;
}

function assertValidUrl(url: string): void {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error('URL is required');
  }
  try {
    void new URL(trimmed);
  } catch {
    throw new Error('Invalid URL');
  }
}

function assertSourceType(value: string): asserts value is IngestionSourceType {
  if (value !== 'feed' && value !== 'watch') {
    throw new Error(`Invalid source type: ${value}`);
  }
}

function mapRowToSource(row: IngestionSourceRow): IngestionSource {
  assertSourceType(row.source_type);
  if (row.status !== 'enabled' && row.status !== 'paused') {
    throw new Error(`Invalid status in row: ${row.status}`);
  }
  return {
    id: row.id,
    url: row.url,
    label: row.label,
    sourceType: row.source_type,
    status: row.status,
    englishOnly: row.english_only === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSuccessAt: row.last_success_at,
    lastError: row.last_error
  };
}

function isUniqueConstraintError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: string }).code;
    return code === 'SQLITE_CONSTRAINT_UNIQUE';
  }
  return false;
}

export function createSource(input: IngestionSourceCreateInput): IngestionSource {
  const url = input.url.trim();
  const label = input.label.trim();
  if (!label) {
    throw new Error('Label is required');
  }
  assertValidUrl(url);
  assertSourceType(input.sourceType);

  const englishOnly = input.englishOnly !== false ? 1 : 0;

  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO ingestion_sources (url, label, source_type, english_only)
    VALUES (@url, @label, @sourceType, @englishOnly)
  `);

  let result: { lastInsertRowid: bigint | number };
  try {
    result = stmt.run({
      url,
      label,
      sourceType: input.sourceType,
      englishOnly
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new Error('A source with this URL already exists');
    }
    throw err;
  }

  const created = getSourceById(Number(result.lastInsertRowid));
  if (!created) {
    throw new Error('Failed to create source: row not found after insert');
  }
  return created;
}

export function getAllSources(): IngestionSource[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM ingestion_sources ORDER BY datetime(created_at) DESC, id DESC')
    .all() as IngestionSourceRow[];
  return rows.map(mapRowToSource);
}

export function getSourceById(id: number): IngestionSource | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM ingestion_sources WHERE id = ?').get(id) as IngestionSourceRow | undefined;
  return row ? mapRowToSource(row) : null;
}

export function updateSource(id: number, input: IngestionSourceUpdateInput): IngestionSource {
  const existing = getSourceById(id);
  if (!existing) {
    throw new Error(`Source with id ${id} not found`);
  }

  const nextLabel = input.label !== undefined ? input.label.trim() : existing.label;
  if (!nextLabel) {
    throw new Error('Label cannot be empty');
  }

  const nextEnglish =
    input.englishOnly !== undefined ? (input.englishOnly ? 1 : 0) : existing.englishOnly ? 1 : 0;

  const db = getDatabase();
  db.prepare(
    `
    UPDATE ingestion_sources
    SET label = @label, english_only = @englishOnly, updated_at = datetime('now')
    WHERE id = @id
  `
  ).run({ id, label: nextLabel, englishOnly: nextEnglish });

  const updated = getSourceById(id);
  if (!updated) {
    throw new Error('Failed to update source');
  }
  return updated;
}

export function setSourcePaused(id: number, paused: boolean): IngestionSource {
  const existing = getSourceById(id);
  if (!existing) {
    throw new Error(`Source with id ${id} not found`);
  }

  const status = paused ? 'paused' : 'enabled';
  const db = getDatabase();
  db.prepare(
    `
    UPDATE ingestion_sources
    SET status = @status, updated_at = datetime('now')
    WHERE id = @id
  `
  ).run({ id, status });

  const updated = getSourceById(id);
  if (!updated) {
    throw new Error('Failed to update source status');
  }
  return updated;
}

export function deleteSource(id: number): void {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM ingestion_sources WHERE id = ?').run(id);
  if (result.changes === 0) {
    throw new Error(`Source with id ${id} not found`);
  }
}

export function getEnabledSources(): IngestionSource[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT * FROM ingestion_sources WHERE status = 'enabled' ORDER BY datetime(created_at) DESC, id DESC`
    )
    .all() as IngestionSourceRow[];
  return rows.map(mapRowToSource);
}

export function recordSourceFeedSuccess(id: number): void {
  const db = getDatabase();
  db.prepare(
    `
    UPDATE ingestion_sources
    SET last_success_at = datetime('now'), last_error = NULL, updated_at = datetime('now')
    WHERE id = ?
  `
  ).run(id);
}

export function recordSourceFeedFailure(id: number, message: string): void {
  const db = getDatabase();
  db.prepare(
    `
    UPDATE ingestion_sources
    SET last_error = @message, updated_at = datetime('now')
    WHERE id = @id
  `
  ).run({ id, message });
}
