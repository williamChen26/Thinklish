import { useState, useEffect, useCallback } from 'react';
import type { Article } from '@english-studio/shared';
import { articlesAPI } from '../lib/api';
import { formatRelativeTime, truncate } from '../lib/format';
import { cn } from '../lib/utils';

interface ArticlesViewProps {
  onSelectArticle: (id: number) => void;
}

export function ArticlesView({ onSelectArticle }: ArticlesViewProps): JSX.Element {
  const [articles, setArticles] = useState<Article[]>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');

  const loadArticles = useCallback(async () => {
    const data = await articlesAPI.getAll();
    setArticles(data);
  }, []);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

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
      handleAddUrl();
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Articles</h2>
        </div>

        {/* URL Input */}
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
              onClick={handleAddUrl}
              disabled={loading || !url.trim()}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              {loading ? 'Loading...' : 'Add'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-3 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Manual fallback */}
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
                  onClick={() => { setShowManual(false); setError(null); }}
                  className="h-9 px-3 rounded-md border border-input text-sm hover:bg-muted transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleAddManual}
                  disabled={loading || !manualTitle.trim() || !manualContent.trim()}
                  className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Article List */}
        {articles.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <span className="text-3xl">📖</span>
            </div>
            <h3 className="text-lg font-medium mb-2">No articles yet</h3>
            <p className="text-muted-foreground text-sm">
              Paste an article URL above to start reading and learning.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {articles.map((article) => (
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
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{article.sourceDomain}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(article.createdAt)}</span>
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
