import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CardBucket, CardStats, CardWithBucket } from '@thinklish/shared';
import { cardsAPI } from '../lib/api';

export interface CardOverviewViewProps {
  onGoToLearningLog: () => void;
}

const DONUT_CX = 80;
const DONUT_CY = 80;
const DONUT_R = 60;
const DONUT_STROKE = 20;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_R;

const COLOR_DUE = '#ef4444';
const COLOR_LEARNING = '#eab308';
const COLOR_MASTERED = '#22c55e';

const BUCKET_META: Record<CardBucket, { label: string; color: string }> = {
  due: { label: '待复习', color: COLOR_DUE },
  learning: { label: '复习中', color: COLOR_LEARNING },
  mastered: { label: '已掌握', color: COLOR_MASTERED }
};

type BucketFilter = 'all' | CardBucket;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function formatNextReview(nextReviewAt: string): string {
  const now = new Date();
  const next = new Date(nextReviewAt);
  const diffMs = next.getTime() - now.getTime();
  if (diffMs <= 0) return 'Due now';
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays} days`;
}

function frontPreview(front: string): string {
  const plain = stripHtml(front);
  const max = 60;
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max)}…`;
}

function CardDeckDonutChart({ stats }: { stats: CardStats }): JSX.Element {
  const { total, due, learning, mastered } = stats;

  const segments: { value: number; color: string }[] = [
    { value: due, color: COLOR_DUE },
    { value: learning, color: COLOR_LEARNING },
    { value: mastered, color: COLOR_MASTERED }
  ];

  let arcOffset = 0;
  const circles: JSX.Element[] = [];

  for (const seg of segments) {
    if (seg.value <= 0) continue;

    const isSoleCategory = seg.value === total;
    const dashLength = isSoleCategory ? DONUT_CIRCUMFERENCE : (seg.value / total) * DONUT_CIRCUMFERENCE;

    if (isSoleCategory) {
      circles.push(
        <circle
          key={seg.color}
          cx={DONUT_CX}
          cy={DONUT_CY}
          r={DONUT_R}
          fill="none"
          stroke={seg.color}
          strokeWidth={DONUT_STROKE}
        />
      );
      break;
    }

    circles.push(
      <circle
        key={`${seg.color}-${arcOffset}`}
        cx={DONUT_CX}
        cy={DONUT_CY}
        r={DONUT_R}
        fill="none"
        stroke={seg.color}
        strokeWidth={DONUT_STROKE}
        strokeDasharray={`${dashLength} ${DONUT_CIRCUMFERENCE - dashLength}`}
        strokeDashoffset={-arcOffset}
      />
    );
    arcOffset += dashLength;
  }

  const summary = `Total ${total} cards: ${due} due, ${learning} learning, ${mastered} mastered`;

  return (
    <svg
      viewBox="0 0 160 160"
      className="h-40 w-40 shrink-0"
      role="img"
      aria-label={summary}
    >
      <g transform={`rotate(-90 ${DONUT_CX} ${DONUT_CY})`}>{circles}</g>
      <text
        x={DONUT_CX}
        y={DONUT_CY}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground text-[28px] font-semibold tabular-nums"
      >
        {total}
      </text>
    </svg>
  );
}

const FILTER_OPTIONS: { value: BucketFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'due', label: '待复习' },
  { value: 'learning', label: '复习中' },
  { value: 'mastered', label: '已掌握' }
];

export function CardOverviewView({ onGoToLearningLog }: CardOverviewViewProps): JSX.Element {
  const [stats, setStats] = useState<CardStats | null>(null);
  const [cardsWithBucket, setCardsWithBucket] = useState<CardWithBucket[] | null>(null);
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>('all');

  const loadStats = useCallback(async () => {
    const data = await cardsAPI.getStats();
    setStats(data);
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (stats !== null && stats.total > 0) {
      void cardsAPI.getAllWithBucket().then(setCardsWithBucket);
    } else {
      setCardsWithBucket(null);
    }
  }, [stats]);

  const filteredCards = useMemo(() => {
    if (!cardsWithBucket) return [];
    if (bucketFilter === 'all') return cardsWithBucket;
    return cardsWithBucket.filter((c) => c.bucket === bucketFilter);
  }, [cardsWithBucket, bucketFilter]);

  if (stats === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" aria-hidden />
        <p className="text-sm">Loading card overview…</p>
      </div>
    );
  }

  if (stats.total === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
        <span className="text-4xl" aria-hidden>
          🗂️
        </span>
        <div className="space-y-2 max-w-md">
          <h2 className="text-lg font-medium text-foreground">No cards yet</h2>
          <p className="text-sm text-muted-foreground">
            You do not have any flashcards. Open your Learning Log and generate cards from saved lookups to
            build your deck.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToLearningLog}
          className="text-sm px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors"
        >
          Open Learning Log
        </button>
      </div>
    );
  }

  const legendItems: { count: number; label: string; color: string }[] = [
    { count: stats.due, label: '待复习', color: COLOR_DUE },
    { count: stats.learning, label: '复习中', color: COLOR_LEARNING },
    { count: stats.mastered, label: '已掌握', color: COLOR_MASTERED }
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-8 py-6">
      <div className="flex shrink-0 flex-col items-center gap-6">
        <h2 className="text-lg font-medium text-center">Card overview</h2>

        <div className="flex w-full max-w-lg flex-col items-center gap-6" aria-label="Card deck statistics">
          <CardDeckDonutChart stats={stats} />

          <ul className="flex w-full flex-row flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {legendItems.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm text-foreground">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <span className="text-muted-foreground">{item.label}</span>
                <span className="tabular-nums font-medium">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 border-t border-border pt-4">
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2" role="tablist" aria-label="Filter by card status">
          {FILTER_OPTIONS.map((opt) => {
            const selected = bucketFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setBucketFilter(opt.value)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  selected
                    ? 'border-foreground bg-muted font-medium text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted/60'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {cardsWithBucket === null ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" aria-hidden />
            <p className="text-sm">Loading cards…</p>
          </div>
        ) : filteredCards.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No cards in this category</p>
        ) : (
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 pb-2">
            {filteredCards.map((card) => {
              const meta = BUCKET_META[card.bucket];
              return (
                <li
                  key={card.id}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-card/30 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="min-w-0 flex-1 text-sm text-foreground">{frontPreview(card.front)}</p>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        card.bucket === 'learning' ? 'text-[#422006]' : 'text-white'
                      }`}
                      style={{ backgroundColor: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">{formatNextReview(card.nextReviewAt)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
