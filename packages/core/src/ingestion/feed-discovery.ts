import { JSDOM } from 'jsdom';
import type { DiscoveredFeed } from '@thinklish/shared';

const FETCH_HEADERS = {
  Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  'User-Agent': 'Mozilla/5.0 (compatible; Thinklish/0.1; +https://thinklish.local) FeedDiscovery'
} as const;

const FEED_PROBE_HEADERS = {
  Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
  'User-Agent': 'Mozilla/5.0 (compatible; Thinklish/0.1; +https://thinklish.local) FeedDiscovery'
} as const;

const RSS_TYPES = new Set(['application/rss+xml', 'application/rdf+xml']);

const ATOM_TYPES = new Set(['application/atom+xml']);

function normalizeFeedUrl(raw: string, base: string): string | null {
  try {
    return new URL(raw.trim(), base).toString();
  } catch {
    return null;
  }
}

function relTokens(rel: string | null): string[] {
  if (!rel) return [];
  return rel
    .toLowerCase()
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function typeFromMime(mime: string | null): 'rss' | 'atom' | null {
  if (!mime) return null;
  const m = mime.split(';')[0]?.trim().toLowerCase() ?? '';
  if (m === 'application/atom+xml') return 'atom';
  if (m === 'application/rss+xml') return 'rss';
  return null;
}

function sniffFeedTypeFromXmlSnippet(snippet: string): 'rss' | 'atom' | null {
  const s = snippet.slice(0, 800).toLowerCase();
  if (s.includes('http://www.w3.org/2005/atom') || /<feed[\s>]/.test(s)) {
    return 'atom';
  }
  if (s.includes('<rss') || s.includes('xmlns="http://backend.userland.com/rss"')) {
    return 'rss';
  }
  if (s.includes('xmlns:atom=') && s.includes('<rss')) {
    return 'rss';
  }
  return null;
}

function shortDescription(href: string, linkTitle: string | undefined, declaredType: string | null): string | undefined {
  const t = (linkTitle ?? '').trim();
  if (t.length > 0 && t.length < 120) {
    return t;
  }
  const lower = href.toLowerCase();
  if (lower.includes('comment')) {
    return 'Comments or replies';
  }
  if (lower.includes('/feed') && !lower.endsWith('/feed') && !lower.endsWith('/feed/')) {
    return 'Section feed';
  }
  if (declaredType && ATOM_TYPES.has(declaredType.split(';')[0]?.trim().toLowerCase() ?? '')) {
    return 'Atom syndication';
  }
  if (declaredType && RSS_TYPES.has(declaredType.split(';')[0]?.trim().toLowerCase() ?? '')) {
    return 'RSS syndication';
  }
  return undefined;
}

function inferTypeFromAlternateHref(href: string, typeAttr: string | null): 'rss' | 'atom' | null {
  const fromMime = typeFromMime(typeAttr);
  if (fromMime) return fromMime;
  const lower = href.toLowerCase();
  if (lower.endsWith('.atom') || lower.includes('/atom')) {
    return 'atom';
  }
  if (lower.endsWith('.rss') || lower.includes('/rss') || lower.includes('/feed')) {
    return 'rss';
  }
  return null;
}

/**
 * Parse `<link rel="alternate" type="application/(rss|atom)+xml">` from HTML.
 */
export function extractAlternateFeedsFromHtml(pageUrl: string, html: string): DiscoveredFeed[] {
  const dom = new JSDOM(html, { url: pageUrl });
  const doc = dom.window.document;
  const out: DiscoveredFeed[] = [];
  const seen = new Set<string>();

  for (const el of doc.querySelectorAll('link[rel][href]')) {
    const link = el as HTMLLinkElement;
    const rels = relTokens(link.getAttribute('rel'));
    if (!rels.includes('alternate')) {
      continue;
    }
    const href = link.getAttribute('href');
    if (!href) continue;
    const abs = normalizeFeedUrl(href, pageUrl);
    if (!abs || seen.has(abs)) continue;

    const typeAttr = link.getAttribute('type');
    const mime = typeAttr?.split(';')[0]?.trim().toLowerCase() ?? null;
    if (mime === 'application/feed+json') {
      continue;
    }
    let kind: 'rss' | 'atom' | null = null;
    if (mime && ATOM_TYPES.has(mime)) {
      kind = 'atom';
    } else if (mime && RSS_TYPES.has(mime)) {
      kind = 'rss';
    } else if (mime && (mime === 'application/xml' || mime === 'text/xml')) {
      kind = inferTypeFromAlternateHref(abs, typeAttr);
    } else if (!mime || mime === '') {
      kind = inferTypeFromAlternateHref(abs, null);
    }

    if (!kind) {
      continue;
    }

    seen.add(abs);
    const title = link.getAttribute('title')?.trim() || undefined;
    out.push({
      url: abs,
      type: kind,
      title,
      description: shortDescription(abs, title, typeAttr)
    });
  }

  return out;
}

function patternCandidates(pageUrl: string): string[] {
  let u: URL;
  try {
    u = new URL(pageUrl);
  } catch {
    return [];
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return [];
  }
  const origin = u.origin;
  const paths = new Set<string>();
  paths.add(`${origin}/feed`);
  paths.add(`${origin}/rss`);
  paths.add(`${origin}/atom.xml`);
  paths.add(`${origin}/feed.xml`);
  paths.add(`${origin}/rss.xml`);

  const path = u.pathname.replace(/\/+$/, '') || '/';
  if (path !== '/' && path.length > 1) {
    const lastSlash = path.lastIndexOf('/');
    const dir = lastSlash > 0 ? path.slice(0, lastSlash) : '';
    if (dir) {
      paths.add(`${origin}${dir}/feed`);
      paths.add(`${origin}${dir}/feed/`);
    }
  }
  return [...paths];
}

async function probeFeedUrl(candidateUrl: string): Promise<'rss' | 'atom' | null> {
  try {
    const response = await fetch(candidateUrl, {
      headers: FEED_PROBE_HEADERS,
      signal: AbortSignal.timeout(12000),
      redirect: 'follow'
    });
    if (!response.ok) {
      return null;
    }
    const ct = response.headers.get('content-type');
    const fromHeader = typeFromMime(ct);
    if (fromHeader) {
      return fromHeader;
    }
    const text = await response.text();
    return sniffFeedTypeFromXmlSnippet(text);
  } catch {
    return null;
  }
}

function dedupeKey(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    let path = u.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    u.pathname = path || '/';
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Fetch a page, discover RSS/Atom `<link rel="alternate">`, then probe common feed paths.
 * Never throws; returns an empty array when nothing is found or on network failure.
 */
export async function discoverFeeds(url: string): Promise<DiscoveredFeed[]> {
  const trimmed = url.trim();
  if (!trimmed) {
    return [];
  }

  let pageUrl: URL;
  try {
    pageUrl = new URL(trimmed);
  } catch {
    return [];
  }
  if (pageUrl.protocol !== 'http:' && pageUrl.protocol !== 'https:') {
    return [];
  }

  const pageHref = pageUrl.toString();

  let html: string;
  try {
    const response = await fetch(pageHref, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(25000),
      redirect: 'follow'
    });
    if (!response.ok) {
      return [];
    }
    html = await response.text();
  } catch {
    return [];
  }

  const fromLinks = extractAlternateFeedsFromHtml(pageHref, html);
  const byKey = new Map<string, DiscoveredFeed>();
  for (const f of fromLinks) {
    byKey.set(dedupeKey(f.url), f);
  }

  // When the page declares syndication links, prefer them and skip extra network probes.
  // Heuristic paths still run when no `<link rel="alternate">` was found.
  if (fromLinks.length === 0) {
    const patterns = patternCandidates(pageHref);
    const maxProbes = 8;
    let probes = 0;
    for (const candidate of patterns) {
      if (probes >= maxProbes) break;
      const key = dedupeKey(candidate);
      if (byKey.has(key)) {
        continue;
      }
      probes++;
      const kind = await probeFeedUrl(candidate);
      if (!kind) {
        continue;
      }
      byKey.set(key, {
        url: candidate,
        type: kind,
        description: shortDescription(candidate, undefined, null)
      });
    }
  }

  return [...byKey.values()];
}
