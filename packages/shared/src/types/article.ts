export interface Article {
  id: number;
  url: string;
  title: string;
  content: string;
  contentHtml: string;
  sourceDomain: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Ingestion source when the article came from a feed (null for pasted/manual). */
  sourceId: number | null;
  /** Stable id within a feed (guid or normalized link). */
  feedItemId: string | null;
  /** True until full Readability extraction has replaced stub summary content. */
  isStub: boolean;
  /** Joined ingestion source label for list UI (null if no source). */
  sourceLabel: string | null;
}

export interface ArticleCreateInput {
  url: string;
  title: string;
  content: string;
  contentHtml: string;
  sourceDomain: string;
  publishedAt: string | null;
  sourceId?: number | null;
  feedItemId?: string | null;
  isStub?: boolean;
}
