import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, getDatabase, initDatabase } from '../database/connection';
import { createTables } from '../database/schema';
import { createArticle } from '../articles/repository';
import { createSource } from '../sources/repository';
import { createLookup } from '../lookups/repository';
import {
  deleteArticlesBySource,
  getRetentionCleanupPreview,
  getStorageStats,
  runRetentionCleanup,
  setRetentionPolicy
} from './retention';

let dbDir: string;
let dbPath: string;

function openFreshDb(): void {
  dbDir = mkdtempSync(join(tmpdir(), 'thinklish-retention-test-'));
  dbPath = join(dbDir, 'test.db');
  const db = initDatabase(dbPath);
  createTables(db);
}

function setArticleCreatedDaysAgo(id: number, daysAgo: number): void {
  const db = getDatabase();
  const d = Math.max(1, Math.floor(daysAgo));
  db.prepare(`UPDATE articles SET created_at = datetime('now', '-${d} days') WHERE id = ?`).run(id);
}

afterEach(() => {
  closeDatabase();
  if (dbDir) {
    rmSync(dbDir, { recursive: true, force: true });
  }
});

describe('storage retention', () => {
  beforeEach(() => {
    openFreshDb();
  });

  it('deletes old unread imported stubs without lookups', () => {
    const src = createSource({
      url: 'https://ex.com/feed.xml',
      label: 'F',
      sourceType: 'feed'
    });
    const a = createArticle({
      url: 'https://ex.com/a',
      title: 'T',
      content: 'c',
      contentHtml: '<p>c</p>',
      sourceDomain: 'ex.com',
      publishedAt: null,
      sourceId: src.id,
      feedItemId: 'g1',
      isStub: true
    });
    setArticleCreatedDaysAgo(a.id, 50);

    setRetentionPolicy({ maxUnreadImportedAgeDays: 30, maxImportedTotal: 0, perSourceImportedCap: 0 });
    const prev = getRetentionCleanupPreview();
    expect(prev.wouldDelete).toBe(1);

    const res = runRetentionCleanup();
    expect(res.deletedCount).toBe(1);
    expect((getDatabase().prepare('SELECT COUNT(*) as c FROM articles').get() as { c: number }).c).toBe(0);
  });

  it('does not delete imported stubs that have lookups', () => {
    const src = createSource({
      url: 'https://ex.com/f2.xml',
      label: 'F2',
      sourceType: 'feed'
    });
    const a = createArticle({
      url: 'https://ex.com/b',
      title: 'T',
      content: 'c',
      contentHtml: '<p>c</p>',
      sourceDomain: 'ex.com',
      publishedAt: null,
      sourceId: src.id,
      feedItemId: 'g2',
      isStub: true
    });
    setArticleCreatedDaysAgo(a.id, 50);
    createLookup({
      articleId: a.id,
      selectedText: 'word',
      contextBefore: '',
      contextAfter: '',
      lookupType: 'word',
      aiResponse: '{}'
    });

    setRetentionPolicy({ maxUnreadImportedAgeDays: 30, maxImportedTotal: 0, perSourceImportedCap: 0 });
    expect(getRetentionCleanupPreview().wouldDelete).toBe(0);
    expect(runRetentionCleanup().deletedCount).toBe(0);
  });

  it('enforces per-source cap on eligible articles', () => {
    const src = createSource({
      url: 'https://ex.com/f3.xml',
      label: 'F3',
      sourceType: 'feed'
    });
    for (let i = 0; i < 5; i++) {
      createArticle({
        url: `https://ex.com/p${i}`,
        title: `T${i}`,
        content: 'c',
        contentHtml: '<p>c</p>',
        sourceDomain: 'ex.com',
        publishedAt: null,
        sourceId: src.id,
        feedItemId: `id-${i}`,
        isStub: false
      });
    }
    setRetentionPolicy({ maxUnreadImportedAgeDays: 0, maxImportedTotal: 0, perSourceImportedCap: 2 });
    const prev = getRetentionCleanupPreview();
    expect(prev.wouldDelete).toBe(3);
    const res = runRetentionCleanup();
    expect(res.deletedCount).toBe(3);
    const remaining = (getDatabase().prepare('SELECT COUNT(*) as c FROM articles WHERE source_id = ?').get(src.id) as { c: number })
      .c;
    expect(remaining).toBe(2);
  });

  it('enforces global imported total cap', () => {
    const s1 = createSource({ url: 'https://a.com/x.xml', label: 'A', sourceType: 'feed' });
    const s2 = createSource({ url: 'https://b.com/x.xml', label: 'B', sourceType: 'feed' });
    createArticle({
      url: 'https://a.com/1',
      title: '1',
      content: 'c',
      contentHtml: 'h',
      sourceDomain: 'a.com',
      publishedAt: null,
      sourceId: s1.id,
      feedItemId: 'a1',
      isStub: false
    });
    createArticle({
      url: 'https://b.com/2',
      title: '2',
      content: 'c',
      contentHtml: 'h',
      sourceDomain: 'b.com',
      publishedAt: null,
      sourceId: s2.id,
      feedItemId: 'b1',
      isStub: false
    });
    createArticle({
      url: 'https://b.com/3',
      title: '3',
      content: 'c',
      contentHtml: 'h',
      sourceDomain: 'b.com',
      publishedAt: null,
      sourceId: s2.id,
      feedItemId: 'b2',
      isStub: false
    });

    setRetentionPolicy({ maxUnreadImportedAgeDays: 0, maxImportedTotal: 2, perSourceImportedCap: 0 });
    expect(getRetentionCleanupPreview().wouldDelete).toBe(1);
    expect(runRetentionCleanup().deletedCount).toBe(1);
    expect((getDatabase().prepare('SELECT COUNT(*) as c FROM articles').get() as { c: number }).c).toBe(2);
  });

  it('getStorageStats splits imported vs manual', () => {
    const src = createSource({ url: 'https://z.com/z.xml', label: 'Z', sourceType: 'feed' });
    createArticle({
      url: 'https://z.com/i',
      title: 'I',
      content: 'xx',
      contentHtml: 'hh',
      sourceDomain: 'z.com',
      publishedAt: null,
      sourceId: src.id,
      feedItemId: 'z1',
      isStub: false
    });
    createArticle({
      url: 'https://manual.com/m',
      title: 'M',
      content: 'yy',
      contentHtml: 'hm',
      sourceDomain: 'manual.com',
      publishedAt: null
    });
    const stats = getStorageStats();
    expect(stats.importedCount).toBe(1);
    expect(stats.manualCount).toBe(1);
    expect(stats.importedApproxBytes).toBeGreaterThan(0);
    expect(stats.manualApproxBytes).toBeGreaterThan(0);
  });

  it('deleteArticlesBySource removes all articles for that source', () => {
    const src = createSource({ url: 'https://d.com/d.xml', label: 'D', sourceType: 'feed' });
    createArticle({
      url: 'https://d.com/1',
      title: '1',
      content: 'c',
      contentHtml: 'h',
      sourceDomain: 'd.com',
      publishedAt: null,
      sourceId: src.id,
      feedItemId: 'd1',
      isStub: false
    });
    const { deletedCount } = deleteArticlesBySource(src.id);
    expect(deletedCount).toBe(1);
    expect((getDatabase().prepare('SELECT COUNT(*) as c FROM articles').get() as { c: number }).c).toBe(0);
  });
});
