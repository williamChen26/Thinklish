import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, initDatabase } from '../database/connection';
import { createTables } from '../database/schema';
import { createArticle, fillArticleFromExtraction, getAllArticles, getArticleById } from '../articles/repository';
import { createSource, getSourceById } from '../sources/repository';
import { ingestFeedXml } from './feed-fetcher';

let dbDir: string;
let dbPath: string;

function openFreshDb(): void {
  dbDir = mkdtempSync(join(tmpdir(), 'thinklish-feed-test-'));
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

const RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Channel</title>
    <item>
      <title>First English Post</title>
      <link>https://example.com/posts/first</link>
      <guid>guid-first-1</guid>
      <description>Short summary one</description>
    </item>
    <item>
      <title>Second Post</title>
      <link>https://example.com/posts/second</link>
      <guid>guid-second-2</guid>
      <description>Summary two</description>
    </item>
  </channel>
</rss>`;

const ATOM_FIXTURE = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <entry>
    <title>Atom Article</title>
    <link href="https://example.org/atom/a1"/>
    <id>urn:uuid:atom-1</id>
    <summary type="html">Atom body snippet</summary>
  </entry>
</feed>`;

describe('ingestFeedXml', () => {
  beforeEach(() => {
    openFreshDb();
  });

  it('parses RSS 2.0 fixture and creates stub articles', async () => {
    const source = createSource({
      url: 'https://example.com/feed.xml',
      label: 'RSS',
      sourceType: 'feed',
      englishOnly: false
    });
    const result = await ingestFeedXml(source, RSS_FIXTURE);
    expect(result.ok).toBe(true);
    expect(result.inserted).toBe(2);
    expect(result.updated).toBe(0);

    const list = getAllArticles();
    expect(list).toHaveLength(2);
    expect(list.every((a) => a.isStub)).toBe(true);
    expect(list.every((a) => a.sourceId === source.id)).toBe(true);
    expect(list.every((a) => a.sourceLabel === 'RSS')).toBe(true);
  });

  it('parses Atom fixture and creates one article', async () => {
    const source = createSource({
      url: 'https://example.org/atom.xml',
      label: 'Atom src',
      sourceType: 'feed',
      englishOnly: false
    });
    const result = await ingestFeedXml(source, ATOM_FIXTURE);
    expect(result.ok).toBe(true);
    expect(result.inserted).toBe(1);
    const a = getArticleById(listSingleId());
    expect(a?.title).toContain('Atom');
  });

  it('does not duplicate rows for the same feed_item_id on re-ingest', async () => {
    const source = createSource({
      url: 'https://example.com/feed.xml',
      label: 'RSS',
      sourceType: 'feed',
      englishOnly: false
    });
    const first = await ingestFeedXml(source, RSS_FIXTURE);
    expect(first.inserted).toBe(2);
    const second = await ingestFeedXml(source, RSS_FIXTURE);
    expect(second.inserted).toBe(0);
    expect(second.updated).toBe(2);
    expect(getAllArticles()).toHaveLength(2);
  });

  it('merges with existing article by normalized URL and attaches source metadata', async () => {
    createArticle({
      url: 'https://example.com/posts/first',
      title: 'Pasted',
      content: 'body',
      contentHtml: '<p>body</p>',
      sourceDomain: 'example.com',
      publishedAt: null
    });
    const source = createSource({
      url: 'https://example.com/feed.xml',
      label: 'Feed',
      sourceType: 'feed',
      englishOnly: false
    });
    const result = await ingestFeedXml(source, RSS_FIXTURE);
    expect(result.ok).toBe(true);
    expect(result.inserted).toBe(1);
    expect(result.updated).toBe(1);

    const all = getAllArticles();
    expect(all).toHaveLength(2);
    const merged = all.find((a) => a.url.includes('/posts/first'));
    expect(merged?.sourceId).toBe(source.id);
    expect(merged?.feedItemId).toBe('guid-first-1');
  });

  it('skips likely non-English items when englishOnly is true', async () => {
    const cnFeed = `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>
      <item><title>中文标题新闻</title><link>https://example.cn/a</link><guid>cn-1</guid></item>
      <item><title>English OK</title><link>https://example.com/en</link><guid>en-1</guid></item>
    </channel></rss>`;
    const source = createSource({
      url: 'https://example.com/mixed.xml',
      label: 'Mixed',
      sourceType: 'feed',
      englishOnly: true
    });
    const result = await ingestFeedXml(source, cnFeed);
    expect(result.ok).toBe(true);
    expect(result.skipped).toBeGreaterThanOrEqual(1);
    expect(result.inserted).toBe(1);
    expect(getAllArticles()).toHaveLength(1);
    expect(getAllArticles()[0]?.title).toBe('English OK');
  });

  it('does not overwrite full article body on re-ingest when title changes in feed', async () => {
    const source = createSource({
      url: 'https://example.com/feed.xml',
      label: 'RSS',
      sourceType: 'feed',
      englishOnly: false
    });
    await ingestFeedXml(source, RSS_FIXTURE);
    const article = getAllArticles().find((a) => a.feedItemId === 'guid-first-1');
    expect(article).toBeTruthy();
    if (!article) return;

    fillArticleFromExtraction(article.id, {
      title: 'Extracted Title',
      content: 'FULL BODY FROM READABILITY',
      contentHtml: '<article>FULL</article>',
      sourceDomain: 'example.com',
      publishedAt: null
    });

    const changedRss = RSS_FIXTURE.replace('First English Post', 'Renamed In Feed');
    const second = await ingestFeedXml(source, changedRss);
    expect(second.ok).toBe(true);

    const after = getArticleById(article.id);
    expect(after?.content).toBe('FULL BODY FROM READABILITY');
    expect(after?.title).toBe('Extracted Title');
    expect(after?.isStub).toBe(false);
  });

  it('sets last_error and returns ok false for invalid XML without throwing', async () => {
    const source = createSource({
      url: 'https://example.com/bad.xml',
      label: 'Bad',
      sourceType: 'feed',
      englishOnly: false
    });
    const result = await ingestFeedXml(source, '<<<not-valid-xml>>>');
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    const again = getSourceById(source.id);
    expect(again?.lastError).toBeTruthy();
  });

  it('clears stub via fillArticleFromExtraction (stub to full transition)', async () => {
    const source = createSource({
      url: 'https://example.com/feed.xml',
      label: 'RSS',
      sourceType: 'feed',
      englishOnly: false
    });
    await ingestFeedXml(source, RSS_FIXTURE);
    const stub = getAllArticles().find((a) => a.feedItemId === 'guid-first-1');
    expect(stub?.isStub).toBe(true);

    const filled = fillArticleFromExtraction(stub!.id, {
      title: 'Full',
      content: 'Full text',
      contentHtml: '<p>Full text</p>',
      sourceDomain: 'example.com',
      publishedAt: null
    });
    expect(filled?.isStub).toBe(false);
    expect(filled?.content).toBe('Full text');
  });
});

function listSingleId(): number {
  const list = getAllArticles();
  expect(list).toHaveLength(1);
  return list[0]!.id;
}
