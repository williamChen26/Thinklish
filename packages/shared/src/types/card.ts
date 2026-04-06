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
