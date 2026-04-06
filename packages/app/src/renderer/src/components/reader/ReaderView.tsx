import { useState, useEffect } from 'react';
import type { Article } from '@thinklish/shared';
import { articlesAPI } from '../../lib/api';
import { useSettings } from '../../hooks/useSettings';
import { ReaderToolbar } from './ReaderToolbar';
import { ReaderContent } from './ReaderContent';

interface ReaderViewProps {
  articleId: number;
  onBack: () => void;
}

export function ReaderView({ articleId, onBack }: ReaderViewProps): JSX.Element {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings, toggleTheme, cycleFontSize, cycleContentWidth } = useSettings();

  useEffect(() => {
    setLoading(true);
    articlesAPI.getById(articleId).then((data) => {
      setArticle(data);
      setLoading(false);
    });
  }, [articleId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <span className="text-muted-foreground">Article not found</span>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-primary hover:underline"
        >
          ← Back to articles
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ReaderToolbar
        settings={settings}
        articleTitle={article.title}
        onBack={onBack}
        onToggleTheme={toggleTheme}
        onCycleFontSize={cycleFontSize}
        onCycleContentWidth={cycleContentWidth}
      />
      <ReaderContent
        articleId={article.id}
        title={article.title}
        contentHtml={article.contentHtml}
        sourceDomain={article.sourceDomain}
        publishedAt={article.publishedAt}
        settings={settings}
      />
    </div>
  );
}
