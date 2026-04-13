import Parser from 'rss-parser';
import type { FeedRefreshResult, IngestionSource } from '@thinklish/shared';
import { getDatabase } from '../database/connection';
import {
  applyFeedItemToExistingArticle,
  createArticle,
  findArticleByFeedItem,
  findArticleByNormalizedUrl
} from '../articles/repository';
import { recordSourceAttempt, recordSourceFeedFailure, recordSourceFeedSuccess } from '../sources/repository';
import { isLikelyEnglishText } from './english-heuristic';
import { normalizeArticleUrl } from './url-normalize';

const parser = new Parser();

function itemLink(item: Parser.Item): string {
  const link = item.link;
  if (typeof link === 'string') {
    return link.trim();
  }
  if (link && typeof link === 'object' && 'href' in link) {
    return String((link as { href: string }).href).trim();
  }
  const atomId = (item as Parser.Item & { id?: string }).id;
  if (typeof atomId === 'string') {
    return atomId.trim();
  }
  return '';
}

function computeFeedItemId(guid: string | undefined, normalizedLink: string): string {
  const g = guid?.trim();
  if (g) {
    return g;
  }
  return normalizedLink;
}

function stubContentForItem(item: Parser.Item): { title: string; plain: string; html: string } {
  const title = (item.title && String(item.title).trim()) || 'Untitled';
  const summary =
    (item.contentSnippet && String(item.contentSnippet).trim()) ||
    (item.summary && String(item.summary).replace(/<[^>]+>/g, ' ').trim()) ||
    (item.content && String(item.content).replace(/<[^>]+>/g, ' ').trim()) ||
    '';
  const plain = summary ? `${title}\n\n${summary}` : title;
  const esc = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = summary
    ? `<article><h1>${esc(title)}</h1><p>${esc(summary)}</p></article>`
    : `<article><h1>${esc(title)}</h1></article>`;
  return { title, plain, html };
}

function publishedAtFromItem(item: Parser.Item): string | null {
  if (item.isoDate) {
    return item.isoDate;
  }
  if (item.pubDate) {
    const d = new Date(item.pubDate);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

/**
 * Parse feed XML and upsert articles. Updates source success/error state.
 * Does not throw; failures are reflected in the return value and `last_error`.
 */
export async function ingestFeedXml(
  source: IngestionSource,
  xml: string
): Promise<FeedRefreshResult> {
  if (source.sourceType !== 'feed') {
    const msg = 'Source is not a feed';
    recordSourceFeedFailure(source.id, msg);
    recordSourceAttempt(source.id);
    return { ok: false, inserted: 0, updated: 0, skipped: 0, error: msg };
  }

  let parsed: Parser.Output<{ [key: string]: unknown }>;
  try {
    parsed = (await parser.parseString(xml)) as Parser.Output<{ [key: string]: unknown }>;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to parse feed';
    recordSourceFeedFailure(source.id, message);
    recordSourceAttempt(source.id);
    return { ok: false, inserted: 0, updated: 0, skipped: 0, error: message };
  }

  const items = parsed.items ?? [];
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  try {
    const run = getDatabase().transaction(() => {
      for (const item of items) {
        const link = itemLink(item);
        if (!link) {
          counts.skipped++;
          continue;
        }

        const normalizedLink = normalizeArticleUrl(link);
        if (!normalizedLink) {
          counts.skipped++;
          continue;
        }

        const guidStr = typeof item.guid === 'string' ? item.guid : undefined;
        const feedItemId = computeFeedItemId(guidStr, normalizedLink);

        const textForLang = `${item.title ?? ''}\n${item.contentSnippet ?? item.summary ?? ''}`;
        if (source.englishOnly && !isLikelyEnglishText(textForLang)) {
          counts.skipped++;
          continue;
        }

        let host: string;
        try {
          host = new URL(normalizedLink).hostname;
        } catch {
          counts.skipped++;
          continue;
        }

        const stub = stubContentForItem(item);
        const publishedAt = publishedAtFromItem(item);

        const byFeed = findArticleByFeedItem(source.id, feedItemId);
        if (byFeed) {
          applyFeedItemToExistingArticle(byFeed.id, source.id, feedItemId, {
            title: stub.title,
            content: stub.plain,
            contentHtml: stub.html,
            sourceDomain: host,
            publishedAt
          });
          counts.updated++;
          continue;
        }

        const byUrl = findArticleByNormalizedUrl(normalizedLink);
        if (byUrl) {
          applyFeedItemToExistingArticle(byUrl.id, source.id, feedItemId, {
            title: stub.title,
            content: stub.plain,
            contentHtml: stub.html,
            sourceDomain: host,
            publishedAt
          });
          counts.updated++;
          continue;
        }

        createArticle({
          url: normalizedLink,
          title: stub.title,
          content: stub.plain,
          contentHtml: stub.html,
          sourceDomain: host,
          publishedAt,
          sourceId: source.id,
          feedItemId,
          isStub: true
        });
        counts.inserted++;
      }
    });
    run();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Feed ingestion failed';
    recordSourceFeedFailure(source.id, message);
    recordSourceAttempt(source.id);
    return { ok: false, inserted: 0, updated: 0, skipped: 0, error: message };
  }

  recordSourceFeedSuccess(source.id);
  recordSourceAttempt(source.id);
  return { ok: true, inserted: counts.inserted, updated: counts.updated, skipped: counts.skipped };
}

/**
 * Fetch feed URL and ingest. Never throws; sets `last_error` on failure.
 */
export async function fetchFeed(source: IngestionSource): Promise<FeedRefreshResult> {
  if (source.status !== 'enabled') {
    const msg = 'Source is not enabled';
    recordSourceFeedFailure(source.id, msg);
    recordSourceAttempt(source.id);
    return { ok: false, inserted: 0, updated: 0, skipped: 0, error: msg };
  }

  if (source.sourceType !== 'feed') {
    const msg = 'Source is not a feed';
    recordSourceFeedFailure(source.id, msg);
    recordSourceAttempt(source.id);
    return { ok: false, inserted: 0, updated: 0, skipped: 0, error: msg };
  }

  try {
    const response = await fetch(source.url, {
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; Thinklish/0.1; +https://thinklish.local) RSS'
      },
      signal: AbortSignal.timeout(25000)
    });

    if (!response.ok) {
      const msg = `HTTP ${response.status}: ${response.statusText}`;
      recordSourceFeedFailure(source.id, msg);
      recordSourceAttempt(source.id);
      return { ok: false, inserted: 0, updated: 0, skipped: 0, error: msg };
    }

    const xml = await response.text();
    return await ingestFeedXml(source, xml);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Feed fetch failed';
    recordSourceFeedFailure(source.id, message);
    recordSourceAttempt(source.id);
    return { ok: false, inserted: 0, updated: 0, skipped: 0, error: message };
  }
}
