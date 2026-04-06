import { useState, useEffect, useCallback } from 'react';
import type { Card } from '@english-studio/shared';
import { cardsAPI } from '../lib/api';
import { cn } from '../lib/utils';

type ReviewRating = 'forgot' | 'fuzzy' | 'remembered';

function computeNextReview(card: Card, rating: ReviewRating): { interval: number; repetitions: number; easeFactor: number } {
  let { interval, repetitions, easeFactor } = card;

  switch (rating) {
    case 'forgot':
      interval = 1;
      repetitions = 0;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
      break;
    case 'fuzzy':
      interval = Math.max(1, interval);
      repetitions = repetitions + 1;
      break;
    case 'remembered':
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 3;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions = repetitions + 1;
      easeFactor = Math.min(3.0, easeFactor + 0.1);
      break;
  }

  return { interval, repetitions, easeFactor };
}

export function ReviewView(): JSX.Element {
  const [dueCards, setDueCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDueCards = useCallback(async () => {
    setLoading(true);
    const cards = await cardsAPI.getDue() as Card[];
    setDueCards(cards);
    setCurrentIndex(0);
    setFlipped(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDueCards();
  }, [loadDueCards]);

  const handleRate = async (rating: ReviewRating): Promise<void> => {
    const card = dueCards[currentIndex];
    if (!card) return;

    const next = computeNextReview(card, rating);
    await cardsAPI.review(card.id, next.interval, next.repetitions, next.easeFactor);

    if (currentIndex < dueCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
    } else {
      await loadDueCards();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (dueCards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <span className="text-4xl">🎉</span>
        <h3 className="text-lg font-medium">All caught up!</h3>
        <p className="text-sm text-muted-foreground">No cards due for review right now.</p>
        <button
          type="button"
          onClick={loadDueCards}
          className="text-sm px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors"
        >
          Refresh
        </button>
      </div>
    );
  }

  const card = dueCards[currentIndex];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8">
      {/* Progress */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>{currentIndex + 1} / {dueCards.length}</span>
          <span>{dueCards.length - currentIndex} remaining</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex) / dueCards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped(!flipped)}
        className={cn(
          'w-full max-w-lg min-h-[280px] rounded-xl border-2 border-border',
          'bg-card text-card-foreground p-8',
          'cursor-pointer select-none transition-all duration-200',
          'hover:border-primary/30 hover:shadow-lg',
          'flex flex-col items-center justify-center'
        )}
      >
        {!flipped ? (
          <div
            className="text-center"
            dangerouslySetInnerHTML={{ __html: card.front }}
          />
        ) : (
          <div
            className="text-sm leading-relaxed w-full"
            dangerouslySetInnerHTML={{ __html: card.back }}
          />
        )}

        {!flipped && (
          <p className="text-xs text-muted-foreground mt-6">Click to reveal answer</p>
        )}
      </div>

      {/* Rating buttons */}
      {flipped && (
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => handleRate('forgot')}
            className="px-5 py-2.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 text-sm font-medium transition-colors"
          >
            忘记了
          </button>
          <button
            type="button"
            onClick={() => handleRate('fuzzy')}
            className="px-5 py-2.5 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50 text-sm font-medium transition-colors"
          >
            模糊
          </button>
          <button
            type="button"
            onClick={() => handleRate('remembered')}
            className="px-5 py-2.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 text-sm font-medium transition-colors"
          >
            记住了
          </button>
        </div>
      )}
    </div>
  );
}
