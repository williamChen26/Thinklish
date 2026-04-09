import { getDatabase } from '../database/connection';
import type { Card, CardBucket, CardCreateInput, CardStats, CardWithBucket } from '@thinklish/shared';

interface CardRow {
  id: number;
  lookup_id: number;
  front: string;
  back: string;
  tags: string;
  next_review_at: string;
  interval: number;
  repetitions: number;
  ease_factor: number;
  created_at: string;
  updated_at: string;
}

function mapRowToCard(row: CardRow): Card {
  return {
    id: row.id,
    lookupId: row.lookup_id,
    front: row.front,
    back: row.back,
    tags: row.tags,
    nextReviewAt: row.next_review_at,
    interval: row.interval,
    repetitions: row.repetitions,
    easeFactor: row.ease_factor,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

interface CardWithBucketRow extends CardRow {
  bucket: string;
}

function mapRowToCardWithBucket(row: CardWithBucketRow): CardWithBucket {
  const base = mapRowToCard(row);
  return {
    ...base,
    bucket: row.bucket as CardBucket
  };
}

export function createCard(input: CardCreateInput): Card {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO cards (lookup_id, front, back, tags)
    VALUES (@lookupId, @front, @back, @tags)
  `);

  const result = stmt.run({
    lookupId: input.lookupId,
    front: input.front,
    back: input.back,
    tags: input.tags
  });

  const created = getCardById(Number(result.lastInsertRowid));
  if (!created) {
    throw new Error('Failed to create card: row not found after insert');
  }
  return created;
}

export function getAllCards(): Card[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM cards ORDER BY created_at DESC').all() as CardRow[];
  return rows.map(mapRowToCard);
}

export function getCardById(id: number): Card | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as CardRow | undefined;
  return row ? mapRowToCard(row) : null;
}

export function getCardByLookupId(lookupId: number): Card | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM cards WHERE lookup_id = ?').get(lookupId) as CardRow | undefined;
  return row ? mapRowToCard(row) : null;
}

export function getDueCards(): Card[] {
  const db = getDatabase();
  const rows = db.prepare(
    "SELECT * FROM cards WHERE next_review_at <= datetime('now') ORDER BY next_review_at ASC"
  ).all() as CardRow[];
  return rows.map(mapRowToCard);
}

export function getCardsWithBucket(): CardWithBucket[] {
  const db = getDatabase();
  const rows = db
    .prepare(`
    SELECT
      id,
      lookup_id,
      front,
      back,
      tags,
      next_review_at,
      interval,
      repetitions,
      ease_factor,
      created_at,
      updated_at,
      CASE
        WHEN next_review_at <= datetime('now') THEN 'due'
        WHEN next_review_at > datetime('now') AND interval < 7 THEN 'learning'
        WHEN next_review_at > datetime('now') AND interval >= 7 THEN 'mastered'
        ELSE 'mastered'
      END AS bucket
    FROM cards
    ORDER BY next_review_at ASC
  `)
    .all() as CardWithBucketRow[];
  return rows.map(mapRowToCardWithBucket);
}

interface CardStatsRow {
  total: number;
  due: number;
  learning: number;
  mastered: number;
}

export function getCardStats(): CardStats {
  const db = getDatabase();
  const row = db
    .prepare(`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN next_review_at <= datetime('now') THEN 1 ELSE 0 END), 0) AS due,
      COALESCE(SUM(CASE WHEN next_review_at > datetime('now') AND interval < 7 THEN 1 ELSE 0 END), 0) AS learning,
      COALESCE(SUM(CASE WHEN next_review_at > datetime('now') AND interval >= 7 THEN 1 ELSE 0 END), 0) AS mastered
    FROM cards
  `)
    .get() as CardStatsRow;

  return {
    total: Number(row.total),
    due: Number(row.due),
    learning: Number(row.learning),
    mastered: Number(row.mastered)
  };
}

export function updateCardReview(id: number, interval: number, repetitions: number, easeFactor: number): void {
  const db = getDatabase();
  db.prepare(`
    UPDATE cards
    SET interval = ?, repetitions = ?, ease_factor = ?,
        next_review_at = datetime('now', '+' || ? || ' days'),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(interval, repetitions, easeFactor, interval, id);
}

export function exportCardsAsTsv(cards: Card[]): string {
  const header = 'front\tback\ttags';
  const rows = cards.map((card) =>
    `${escapeField(card.front)}\t${escapeField(card.back)}\t${escapeField(card.tags)}`
  );
  return [header, ...rows].join('\n');
}

function escapeField(value: string): string {
  return value.replace(/\t/g, ' ').replace(/\n/g, '<br>');
}
