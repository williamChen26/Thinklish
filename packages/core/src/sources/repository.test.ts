import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, getDatabase, initDatabase } from '../database/connection';
import { createTables } from '../database/schema';
import { createArticle } from '../articles/repository';
import {
  createSource,
  deleteSource,
  getAllSources,
  getEnabledSources,
  getSourceById,
  setSourcePaused,
  updateSource
} from './repository';

let dbDir: string;
let dbPath: string;

function openFreshDb(): void {
  dbDir = mkdtempSync(join(tmpdir(), 'thinklish-core-test-'));
  dbPath = join(dbDir, 'test.db');
  const db = initDatabase(dbPath);
  createTables(db);
}

afterEach(() => {
  closeDatabase();
  if (dbDir) {
    rmSync(dbDir, { recursive: true, force: true });
  }
});

describe('ingestion sources repository', () => {
  beforeEach(() => {
    openFreshDb();
  });

  it('creates feed and watch sources with required fields and persists type', () => {
    const feed = createSource({
      url: 'https://example.com/feed.xml',
      label: 'My feed',
      sourceType: 'feed'
    });
    expect(feed.sourceType).toBe('feed');
    expect(feed.url).toBe('https://example.com/feed.xml');
    expect(feed.status).toBe('enabled');
    expect(feed.refreshPosture).toBeNull();
    expect(feed.consecutiveFailures).toBe(0);
    expect(feed.lastAttemptAt).toBeNull();

    const watch = createSource({
      url: 'https://news.example.com/latest',
      label: 'Listing',
      sourceType: 'watch'
    });
    expect(watch.sourceType).toBe('watch');
    expect(watch.url).toBe('https://news.example.com/latest');
  });

  it('defaults englishOnly to true when omitted', () => {
    const s = createSource({
      url: 'https://example.com/a.xml',
      label: 'A',
      sourceType: 'feed'
    });
    expect(s.englishOnly).toBe(true);
  });

  it('persists englishOnly false when set', () => {
    const s = createSource({
      url: 'https://example.com/b.xml',
      label: 'B',
      sourceType: 'feed',
      englishOnly: false
    });
    expect(s.englishOnly).toBe(false);
    const again = getSourceById(s.id);
    expect(again?.englishOnly).toBe(false);
  });

  it('excludes paused sources from getEnabledSources', () => {
    const s = createSource({
      url: 'https://example.com/c.xml',
      label: 'C',
      sourceType: 'feed'
    });
    expect(getEnabledSources().map((x) => x.id)).toContain(s.id);

    setSourcePaused(s.id, true);
    expect(getEnabledSources().map((x) => x.id)).not.toContain(s.id);

    setSourcePaused(s.id, false);
    expect(getEnabledSources().map((x) => x.id)).toContain(s.id);
  });

  it('persists across db close and reopen (same file path)', () => {
    const s = createSource({
      url: 'https://example.com/d.xml',
      label: 'D',
      sourceType: 'feed'
    });
    closeDatabase();
    const db = initDatabase(dbPath);
    createTables(db);
    const list = getAllSources();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(s.id);
    expect(list[0]?.label).toBe('D');
  });

  it('deleteSource does not remove articles', () => {
    createArticle({
      url: 'https://article.test/p',
      title: 'T',
      content: 'c',
      contentHtml: '<p>c</p>',
      sourceDomain: 'article.test',
      publishedAt: null
    });
    const sqlite = getDatabase();
    const articleCount = (sqlite.prepare('SELECT COUNT(*) as n FROM articles').get() as { n: number }).n;
    expect(articleCount).toBe(1);

    const src = createSource({
      url: 'https://example.com/e.xml',
      label: 'E',
      sourceType: 'feed'
    });
    deleteSource(src.id);

    const afterArticles = (sqlite.prepare('SELECT COUNT(*) as n FROM articles').get() as { n: number }).n;
    expect(afterArticles).toBe(1);
  });

  it('sets createdAt on create and leaves lastSuccessAt null until set externally', () => {
    const s = createSource({
      url: 'https://example.com/f.xml',
      label: 'F',
      sourceType: 'feed'
    });
    expect(s.createdAt).toBeTruthy();
    expect(s.lastSuccessAt).toBeNull();
  });

  it('rejects duplicate URL', () => {
    createSource({
      url: 'https://example.com/g.xml',
      label: 'G',
      sourceType: 'feed'
    });
    expect(() =>
      createSource({
        url: 'https://example.com/g.xml',
        label: 'Other',
        sourceType: 'watch'
      })
    ).toThrow(/already exists/);
  });

  it('rejects invalid URL', () => {
    expect(() =>
      createSource({
        url: 'not-a-url',
        label: 'X',
        sourceType: 'feed'
      })
    ).toThrow(/Invalid URL/);
  });

  it('updateSource changes label', () => {
    const s = createSource({
      url: 'https://example.com/h.xml',
      label: 'Old',
      sourceType: 'feed'
    });
    const u = updateSource(s.id, { label: 'New' });
    expect(u.label).toBe('New');
  });

  it('getAllSources returns rows ordered by created_at desc', () => {
    createSource({ url: 'https://example.com/1.xml', label: '1', sourceType: 'feed' });
    createSource({ url: 'https://example.com/2.xml', label: '2', sourceType: 'feed' });
    const all = getAllSources();
    expect(all.map((x) => x.label)).toEqual(['2', '1']);
  });
});
