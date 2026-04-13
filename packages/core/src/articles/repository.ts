import { getDatabase } from '../database/connection';
import { normalizeArticleUrl } from '../ingestion/url-normalize';
import type { Article, ArticleCreateInput, IngestionSourceType } from '@thinklish/shared';

interface ArticleRow {
  id: number;
  url: string;
  title: string;
  content: string;
  content_html: string;
  source_domain: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  source_id: number | null;
  feed_item_id: string | null;
  is_stub: number;
  source_label: string | null;
  source_type: string | null;
}

function mapSourceType(value: string | null | undefined): IngestionSourceType | null {
  if (value === 'feed') {
    return 'feed';
  }
  return null;
}

function mapRowToArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    content: row.content,
    contentHtml: row.content_html,
    sourceDomain: row.source_domain,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceId: row.source_id ?? null,
    sourceType: mapSourceType(row.source_type),
    feedItemId: row.feed_item_id ?? null,
    isStub: (row.is_stub ?? 0) === 1,
    sourceLabel: row.source_label ?? null
  };
}

const articleSelectJoin = `
  SELECT a.*, s.label AS source_label, s.source_type AS source_type
  FROM articles a
  LEFT JOIN ingestion_sources s ON a.source_id = s.id
`;

export function createArticle(input: ArticleCreateInput): Article {
  const db = getDatabase();
  const sourceId = input.sourceId ?? null;
  const feedItemId = input.feedItemId ?? null;
  const isStub = input.isStub === true ? 1 : 0;

  const stmt = db.prepare(`
    INSERT INTO articles (
      url, title, content, content_html, source_domain, published_at,
      source_id, feed_item_id, is_stub
    )
    VALUES (
      @url, @title, @content, @contentHtml, @sourceDomain, @publishedAt,
      @sourceId, @feedItemId, @isStub
    )
  `);

  const result = stmt.run({
    url: input.url,
    title: input.title,
    content: input.content,
    contentHtml: input.contentHtml,
    sourceDomain: input.sourceDomain,
    publishedAt: input.publishedAt,
    sourceId,
    feedItemId,
    isStub
  });

  const created = getArticleById(Number(result.lastInsertRowid));
  if (!created) {
    throw new Error('Failed to create article: row not found after insert');
  }
  return created;
}

export function getAllArticles(): Article[] {
  const db = getDatabase();
  const rows = db
    .prepare(`${articleSelectJoin} ORDER BY datetime(a.created_at) DESC, a.id DESC`)
    .all() as ArticleRow[];
  return rows.map(mapRowToArticle);
}

export function getArticleById(id: number): Article | null {
  const db = getDatabase();
  const row = db.prepare(`${articleSelectJoin} WHERE a.id = ?`).get(id) as ArticleRow | undefined;
  return row ? mapRowToArticle(row) : null;
}

export function findArticleByFeedItem(sourceId: number, feedItemId: string): Article | null {
  const db = getDatabase();
  const row = db
    .prepare(`${articleSelectJoin} WHERE a.source_id = ? AND a.feed_item_id = ?`)
    .get(sourceId, feedItemId) as ArticleRow | undefined;
  return row ? mapRowToArticle(row) : null;
}

export function findArticleByNormalizedUrl(normalizedUrl: string): Article | null {
  if (!normalizedUrl) {
    return null;
  }
  const db = getDatabase();
  const rows = db.prepare(`${articleSelectJoin}`).all() as ArticleRow[];
  for (const row of rows) {
    if (normalizeArticleUrl(row.url) === normalizedUrl) {
      return mapRowToArticle(row);
    }
  }
  return null;
}

/** Merge feed metadata into an existing row; stub rows refresh title/summary; full rows keep body and title. */
export function applyFeedItemToExistingArticle(
  id: number,
  sourceId: number,
  feedItemId: string,
  stubFields: {
    title: string;
    content: string;
    contentHtml: string;
    sourceDomain: string;
    publishedAt: string | null;
  }
): void {
  const db = getDatabase();
  db.prepare(
    `
    UPDATE articles SET
      source_id = COALESCE(source_id, @sourceId),
      feed_item_id = COALESCE(feed_item_id, @feedItemId),
      title = CASE WHEN is_stub = 1 THEN @title ELSE title END,
      content = CASE WHEN is_stub = 1 THEN @content ELSE content END,
      content_html = CASE WHEN is_stub = 1 THEN @contentHtml ELSE content_html END,
      source_domain = CASE WHEN is_stub = 1 THEN @sourceDomain ELSE source_domain END,
      published_at = CASE WHEN is_stub = 1 THEN @publishedAt ELSE published_at END,
      updated_at = datetime('now')
    WHERE id = @id
  `
  ).run({
    id,
    sourceId,
    feedItemId,
    title: stubFields.title,
    content: stubFields.content,
    contentHtml: stubFields.contentHtml,
    sourceDomain: stubFields.sourceDomain,
    publishedAt: stubFields.publishedAt
  });
}

export function fillArticleFromExtraction(
  id: number,
  extracted: {
    title: string;
    content: string;
    contentHtml: string;
    sourceDomain: string;
    publishedAt: string | null;
  }
): Article | null {
  const db = getDatabase();
  db.prepare(
    `
    UPDATE articles SET
      title = @title,
      content = @content,
      content_html = @contentHtml,
      source_domain = @sourceDomain,
      published_at = @publishedAt,
      is_stub = 0,
      updated_at = datetime('now')
    WHERE id = @id
  `
  ).run({
    id,
    title: extracted.title,
    content: extracted.content,
    contentHtml: extracted.contentHtml,
    sourceDomain: extracted.sourceDomain,
    publishedAt: extracted.publishedAt
  });
  return getArticleById(id);
}

export function deleteArticle(id: number): void {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM articles WHERE id = ?').run(id);
  if (result.changes === 0) {
    throw new Error(`Article with id ${id} not found`);
  }
}
