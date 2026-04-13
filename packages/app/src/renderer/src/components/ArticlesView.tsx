import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Article, DiscoveredFeed, IngestionSource } from '@thinklish/shared';
import { articlesAPI, feedsAPI, sourcesAPI } from '../lib/api';
import { formatRelativeTime, truncate } from '../lib/format';
import { cn } from '../lib/utils';

type SourceFilterValue = 'all' | 'pasted' | number;

function parseSourceFilter(raw: string): SourceFilterValue {
  if (raw === 'all') return 'all';
  if (raw === 'pasted') return 'pasted';
  const n = Number(raw);
  if (Number.isInteger(n) && n > 0) return n;
  return 'all';
}

interface ArticlesViewProps {
  onSelectArticle: (id: number) => void;
  onOpenSources: () => void;
}

export function ArticlesView({ onSelectArticle, onOpenSources }: ArticlesViewProps): JSX.Element {
  const [articles, setArticles] = useState<Article[]>([]);
  const [sources, setSources] = useState<IngestionSource[]>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [sourceFilterRaw, setSourceFilterRaw] = useState('all');
  const [recentImportsOnly, setRecentImportsOnly] = useState(false);
  const [discoveredFeeds, setDiscoveredFeeds] = useState<DiscoveredFeed[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [addingFeedUrl, setAddingFeedUrl] = useState<string | null>(null);

  const sourceFilter = parseSourceFilter(sourceFilterRaw);

  const loadArticles = useCallback(async () => {
    const data = await articlesAPI.getAll();
    setArticles(data);
  }, []);

  const loadSources = useCallback(async () => {
    const data = await sourcesAPI.list();
    setSources(data);
  }, []);

  useEffect(() => {
    void loadArticles();
    void loadSources();
  }, [loadArticles, loadSources]);

  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
      setDiscoveredFeeds([]);
      setDiscoverLoading(false);
      return;
    }

    let cancelled = false;
    setDiscoverLoading(true);

    const timer = window.setTimeout(() => {
      void feedsAPI.discover(trimmed).then(({ feeds }) => {
        if (cancelled) {
          return;
        }
        setDiscoveredFeeds(feeds);
        setDiscoverLoading(false);
      });
    }, 550);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      setDiscoverLoading(false);
    };
  }, [url]);

  const visibleArticles = useMemo(() => {
    let list = articles;
    if (recentImportsOnly) {
      list = list.filter((a) => a.sourceId !== null);
    }
    if (sourceFilter === 'pasted') {
      list = list.filter((a) => a.sourceId === null);
    } else if (typeof sourceFilter === 'number') {
      list = list.filter((a) => a.sourceId === sourceFilter);
    }
    return list;
  }, [articles, recentImportsOnly, sourceFilter]);

  const labelForDiscoveredFeed = (feed: DiscoveredFeed): string => {
    const title = feed.title?.trim();
    if (title) {
      return title.length > 200 ? title.slice(0, 200) : title;
    }
    try {
      const host = new URL(feed.url).hostname.replace(/^www\./i, '');
      return `${host} feed`;
    } catch {
      return 'RSS feed';
    }
  };

  const handleAddDiscoveredFeed = async (feed: DiscoveredFeed): Promise<void> => {
    const label = labelForDiscoveredFeed(feed);
    const ok = window.confirm(
      `Add this address as a new syndicated source?\n\n${feed.url}\n\nSuggested label: ${label}\n\nNothing is subscribed until you confirm. You can rename the source later under Sources & feeds.`
    );
    if (!ok) {
      return;
    }

    setAddingFeedUrl(feed.url);
    setError(null);
    const result = await sourcesAPI.create({
      url: feed.url,
      label,
      sourceType: 'feed',
      englishOnly: true
    });
    setAddingFeedUrl(null);

    if (result.success) {
      await loadSources();
      setDiscoveredFeeds((prev) => prev.filter((f) => f.url !== feed.url));
    } else {
      setError(result.error);
    }
  };

  const handleAddUrl = async (): Promise<void> => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    const result = await articlesAPI.add(trimmed);
    if (result.success) {
      setUrl('');
      await loadArticles();
    } else {
      setError(result.error);
      setShowManual(true);
    }

    setLoading(false);
  };

  const handleAddManual = async (): Promise<void> => {
    if (!manualTitle.trim() || !manualContent.trim()) return;

    setLoading(true);
    setError(null);

    const result = await articlesAPI.addManual({
      url: url.trim() || 'manual://paste',
      title: manualTitle.trim(),
      content: manualContent.trim(),
      contentHtml: `<article>${manualContent.trim().split('\n').map((p) => `<p>${p}</p>`).join('')}</article>`,
      sourceDomain: 'manual',
      publishedAt: null
    });

    if (result.success) {
      setUrl('');
      setManualTitle('');
      setManualContent('');
      setShowManual(false);
      await loadArticles();
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleAddUrl();
    }
  };

  const onToggleRecentImports = (checked: boolean): void => {
    setRecentImportsOnly(checked);
    if (checked && sourceFilter === 'pasted') {
      setSourceFilterRaw('all');
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-8 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Articles</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Paste a single URL for intentional reading, or add a subscription source for a calm stream of quality
              English — both support the same library, lookups, and review loop.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSources}
            className="shrink-0 h-10 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
          >
            Sources & feeds
          </button>
        </div>

        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste article URL here..."
              disabled={loading}
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void handleAddUrl()}
              disabled={loading || !url.trim()}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              {loading ? 'Loading...' : 'Add'}
            </button>
          </div>

          {discoverLoading && /^https?:\/\//i.test(url.trim()) ? (
            <p className="mt-2 text-xs text-muted-foreground">Checking this page for RSS or Atom feeds…</p>
          ) : null}

          {discoveredFeeds.length > 0 ? (
            <div className="mt-3 rounded-md border border-violet-500/25 bg-violet-500/5 px-3 py-3">
              <p className="text-sm font-medium text-foreground mb-2">RSS or Atom feeds found</p>
              <p className="text-xs text-muted-foreground mb-3">
                Adding a feed creates a syndicated source only after you confirm — nothing is subscribed automatically.
              </p>
              <ul className="space-y-2">
                {discoveredFeeds.map((feed) => (
                  <li
                    key={feed.url}
                    className="flex flex-col gap-2 rounded-md border border-border/80 bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{feed.title ?? feed.url}</p>
                      <p className="text-xs text-muted-foreground truncate">{feed.url}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {feed.description ??
                          (feed.type === 'atom' ? 'Atom syndication' : 'RSS syndication')}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={addingFeedUrl !== null}
                      onClick={() => void handleAddDiscoveredFeed(feed)}
                      className="shrink-0 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {addingFeedUrl === feed.url ? 'Adding…' : 'Add as source'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {error && (
            <div className="mt-3 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {showManual && (
            <div className="mt-4 p-4 rounded-md border border-border bg-muted/30">
              <p className="text-sm text-muted-foreground mb-3">
                URL 提取失败？手动粘贴文章内容：
              </p>
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="文章标题"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm mb-2 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <textarea
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                placeholder="粘贴文章正文..."
                rows={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-3 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowManual(false);
                    setError(null);
                  }}
                  className="h-9 px-3 rounded-md border border-input text-sm hover:bg-muted transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void handleAddManual()}
                  disabled={loading || !manualTitle.trim() || !manualContent.trim()}
                  className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          )}
        </div>

        {articles.length > 0 && (
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-2 min-w-0">
              <label htmlFor="article-source-filter" className="text-xs font-medium text-muted-foreground shrink-0">
                Filter by source
              </label>
              <select
                id="article-source-filter"
                value={
                  sourceFilter === 'all'
                    ? 'all'
                    : sourceFilter === 'pasted'
                      ? 'pasted'
                      : String(sourceFilter)
                }
                onChange={(e) => setSourceFilterRaw(e.target.value)}
                className="h-9 min-w-0 flex-1 max-w-xs rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="all">All articles</option>
                <option value="pasted">Pasted / manual only</option>
                {sources.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={recentImportsOnly}
                onChange={(e) => onToggleRecentImports(e.target.checked)}
                className="accent-primary rounded border-input"
              />
              Recent imports (from sources)
            </label>
          </div>
        )}

        {articles.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <span className="text-3xl">📖</span>
            </div>
            <h3 className="text-lg font-medium mb-2">Start a reading habit, not a pile of links</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-3">
              Paste article URLs when you already know what you want to read. Add subscription sources when you want a
              steady supply of strong English material — both paths land in the same library for deep reading and
              spaced review.
            </p>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
              精读需要好材料与节奏：单篇粘贴适合“今天就读这一篇”；订阅源帮你持续遇到值得读的内容，而不是刷新闻。
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={onOpenSources}
                className="h-10 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
              >
                Set up sources & feeds
              </button>
            </div>
          </div>
        ) : visibleArticles.length === 0 ? (
          <div className="text-center py-12 rounded-lg border border-dashed border-border">
            <p className="text-sm text-muted-foreground mb-3">No articles match these filters.</p>
            <button
              type="button"
              onClick={() => {
                setSourceFilterRaw('all');
                setRecentImportsOnly(false);
              }}
              className="text-sm font-medium text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {visibleArticles.map((article) => (
              <li key={article.id}>
                <button
                  type="button"
                  onClick={() => onSelectArticle(article.id)}
                  className={cn(
                    'w-full text-left p-4 rounded-lg border border-border',
                    'hover:bg-muted/50 hover:border-border/80 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-ring'
                  )}
                >
                  <h3 className="font-medium text-sm leading-snug mb-1.5">
                    {article.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {truncate(article.content, 120)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {article.sourceId !== null && article.sourceType === 'feed' ? (
                      <span className="rounded bg-violet-500/15 px-1.5 py-0.5 font-medium text-violet-900 dark:text-violet-200">
                        Syndicated
                      </span>
                    ) : null}
                    {article.sourceLabel ? (
                      <span className="rounded bg-sky-500/15 px-1.5 py-0.5 font-medium text-sky-800 dark:text-sky-200">
                        {article.sourceLabel}
                      </span>
                    ) : null}
                    <span>{article.sourceDomain}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(article.createdAt)}</span>
                    {article.isStub ? (
                      <>
                        <span>·</span>
                        <span className="text-amber-700 dark:text-amber-300">Preview</span>
                      </>
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
