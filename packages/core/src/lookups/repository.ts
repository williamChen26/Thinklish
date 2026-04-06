import { getDatabase } from '../database/connection';
import type { Lookup, LookupCreateInput, LookupType, MasteryStatus } from '@english-studio/shared';

interface LookupRow {
  id: number;
  article_id: number;
  selected_text: string;
  context_before: string;
  context_after: string;
  lookup_type: string;
  ai_response: string;
  mastery_status: string;
  created_at: string;
  updated_at: string;
}

function mapRowToLookup(row: LookupRow): Lookup {
  return {
    id: row.id,
    articleId: row.article_id,
    selectedText: row.selected_text,
    contextBefore: row.context_before,
    contextAfter: row.context_after,
    lookupType: row.lookup_type as LookupType,
    aiResponse: row.ai_response,
    masteryStatus: row.mastery_status as MasteryStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createLookup(input: LookupCreateInput): Lookup {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO lookups (article_id, selected_text, context_before, context_after, lookup_type, ai_response)
    VALUES (@articleId, @selectedText, @contextBefore, @contextAfter, @lookupType, @aiResponse)
  `);

  const result = stmt.run({
    articleId: input.articleId,
    selectedText: input.selectedText,
    contextBefore: input.contextBefore,
    contextAfter: input.contextAfter,
    lookupType: input.lookupType,
    aiResponse: input.aiResponse
  });

  const created = getLookupById(Number(result.lastInsertRowid));
  if (!created) {
    throw new Error('Failed to create lookup: row not found after insert');
  }
  return created;
}

export function getAllLookups(filters?: {
  lookupType?: LookupType;
  masteryStatus?: MasteryStatus;
}): Lookup[] {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: Record<string, string> = {};

  if (filters?.lookupType) {
    conditions.push('lookup_type = @lookupType');
    params.lookupType = filters.lookupType;
  }
  if (filters?.masteryStatus) {
    conditions.push('mastery_status = @masteryStatus');
    params.masteryStatus = filters.masteryStatus;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM lookups ${where} ORDER BY created_at DESC`).all(params) as LookupRow[];
  return rows.map(mapRowToLookup);
}

export function getLookupById(id: number): Lookup | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM lookups WHERE id = ?').get(id) as LookupRow | undefined;
  return row ? mapRowToLookup(row) : null;
}

export function updateMasteryStatus(id: number, status: MasteryStatus): void {
  const db = getDatabase();
  const result = db.prepare(
    "UPDATE lookups SET mastery_status = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(status, id);

  if (result.changes === 0) {
    throw new Error(`Lookup with id ${id} not found`);
  }
}

export function getLookupsByArticleId(articleId: number): Lookup[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM lookups WHERE article_id = ? ORDER BY created_at DESC').all(articleId) as LookupRow[];
  return rows.map(mapRowToLookup);
}
