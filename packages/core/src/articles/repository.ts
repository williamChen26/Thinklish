import { getDatabase } from '../database/connection';
import type { Article, ArticleCreateInput } from '@english-studio/shared';

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
    updatedAt: row.updated_at
  };
}

export function createArticle(input: ArticleCreateInput): Article {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO articles (url, title, content, content_html, source_domain, published_at)
    VALUES (@url, @title, @content, @contentHtml, @sourceDomain, @publishedAt)
  `);

  const result = stmt.run({
    url: input.url,
    title: input.title,
    content: input.content,
    contentHtml: input.contentHtml,
    sourceDomain: input.sourceDomain,
    publishedAt: input.publishedAt
  });

  const created = getArticleById(Number(result.lastInsertRowid));
  if (!created) {
    throw new Error('Failed to create article: row not found after insert');
  }
  return created;
}

export function getAllArticles(): Article[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM articles ORDER BY created_at DESC').all() as ArticleRow[];
  return rows.map(mapRowToArticle);
}

export function getArticleById(id: number): Article | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as ArticleRow | undefined;
  return row ? mapRowToArticle(row) : null;
}

export function deleteArticle(id: number): void {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM articles WHERE id = ?').run(id);
  if (result.changes === 0) {
    throw new Error(`Article with id ${id} not found`);
  }
}
