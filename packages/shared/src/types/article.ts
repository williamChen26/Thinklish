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
}

export interface ArticleCreateInput {
  url: string;
  title: string;
  content: string;
  contentHtml: string;
  sourceDomain: string;
  publishedAt: string | null;
}
