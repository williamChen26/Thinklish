import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { discoverFeeds, extractAlternateFeedsFromHtml } from './feed-discovery';

describe('extractAlternateFeedsFromHtml', () => {
  it('collects rss and atom alternates with titles', () => {
    const html = `
      <head>
        <link rel="alternate" type="application/rss+xml" title="Posts" href="/feed.xml" />
        <link rel="alternate" type="application/atom+xml" href="https://example.com/atom.xml" />
      </head>
    `;
    const feeds = extractAlternateFeedsFromHtml('https://example.com/blog/post', html);
    expect(feeds).toHaveLength(2);
    const rss = feeds.find((f) => f.type === 'rss');
    const atom = feeds.find((f) => f.type === 'atom');
    expect(rss?.url).toBe('https://example.com/feed.xml');
    expect(rss?.title).toBe('Posts');
    expect(atom?.url).toBe('https://example.com/atom.xml');
  });

  it('matches rel values containing alternate among other tokens', () => {
    const html = '<link rel="alternate other" type="application/rss+xml" href="/rss" />';
    const feeds = extractAlternateFeedsFromHtml('https://site.test/', html);
    expect(feeds).toHaveLength(1);
    expect(feeds[0]?.url).toBe('https://site.test/rss');
  });

  it('ignores json feed alternates', () => {
    const html = '<link rel="alternate" type="application/feed+json" href="/feed.json" />';
    expect(extractAlternateFeedsFromHtml('https://x.test/', html)).toHaveLength(0);
  });
});

describe('discoverFeeds', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns empty for invalid URL', async () => {
    expect(await discoverFeeds('not a url')).toEqual([]);
  });

  it('returns alternates from HTML and skips duplicate probes', async () => {
    const html = `<!doctype html><html><head><link rel="alternate" type="application/rss+xml" title="Main" href="https://blog.example/feed" /></head><body></body></html>`;
    expect(extractAlternateFeedsFromHtml('https://blog.example/article', html)).toHaveLength(1);

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === 'https://blog.example/article') {
        return new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const feeds = await discoverFeeds('https://blog.example/article');
    expect(feeds).toHaveLength(1);
    expect(feeds[0]?.url).toBe('https://blog.example/feed');
    expect(feeds[0]?.type).toBe('rss');
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).toEqual(['https://blog.example/article']);
  });

  it('probes common paths when no alternates', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === 'https://news.example/page') {
        return new Response('<html><head></head><body>hi</body></html>', {
          status: 200,
          headers: { 'content-type': 'text/html' }
        });
      }
      if (url === 'https://news.example/feed') {
        return new Response('<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>', {
          status: 200,
          headers: { 'content-type': 'application/xml' }
        });
      }
      return new Response('nope', { status: 404 });
    });

    const feeds = await discoverFeeds('https://news.example/page');
    expect(feeds.some((f) => f.url === 'https://news.example/feed' && f.type === 'rss')).toBe(true);
  });
});
