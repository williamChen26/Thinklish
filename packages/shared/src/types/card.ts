export interface Card {
  id: number;
  lookupId: number;
  front: string;
  back: string;
  tags: string;
  nextReviewAt: string;
  interval: number;
  repetitions: number;
  easeFactor: number;
  createdAt: string;
  updatedAt: string;
}

export interface CardCreateInput {
  lookupId: number;
  front: string;
  back: string;
  tags: string;
}

export interface CardStats {
  total: number;
  due: number;
  learning: number;
  mastered: number;
}

export type CardBucket = 'due' | 'learning' | 'mastered';

export interface CardWithBucket {
  id: number;
  lookupId: number;
  front: string;
  back: string;
  tags: string;
  nextReviewAt: string;
  interval: number;
  repetitions: number;
  easeFactor: number;
  createdAt: string;
  updatedAt: string;
  bucket: CardBucket;
}
