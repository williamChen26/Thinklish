import { useState, useEffect, useCallback } from 'react';
import { Sidebar, type NavItem } from './components/Sidebar';
import { ArticlesView } from './components/ArticlesView';
import { ReaderView } from './components/reader/ReaderView';
import { LearningLogView } from './components/LearningLogView';
import { ReviewView } from './components/ReviewView';
import { CardOverviewView } from './components/CardOverviewView';
import { cardsAPI } from './lib/api';

function App(): JSX.Element {
  const [activeNav, setActiveNav] = useState<NavItem>('articles');
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);

  const refreshReviewCount = useCallback(async () => {
    const stats = await cardsAPI.getStats();
    setReviewCount(stats.due);
  }, []);

  useEffect(() => {
    refreshReviewCount();
    const interval = setInterval(refreshReviewCount, 60000);
    return () => clearInterval(interval);
  }, [refreshReviewCount]);

  const handleNavChange = (nav: NavItem): void => {
    setActiveNav(nav);
    setSelectedArticleId(null);
    refreshReviewCount();
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar activeNav={activeNav} onNavChange={handleNavChange} reviewCount={reviewCount} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {activeNav === 'articles' && !selectedArticleId && (
          <ArticlesView onSelectArticle={setSelectedArticleId} />
        )}

        {activeNav === 'articles' && selectedArticleId && (
          <ReaderView
            articleId={selectedArticleId}
            onBack={() => setSelectedArticleId(null)}
          />
        )}

        {activeNav === 'log' && <LearningLogView />}

        {activeNav === 'cardOverview' && (
          <CardOverviewView onGoToLearningLog={() => setActiveNav('log')} />
        )}

        {activeNav === 'review' && <ReviewView />}
      </main>
    </div>
  );
}

export default App;
