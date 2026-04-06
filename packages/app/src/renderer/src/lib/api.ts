import type { Article, ArticleCreateInput, Lookup, LookupCreateInput, LookupType, MasteryStatus } from '@thinklish/shared';

export type AddArticleResult =
  | { success: true; article: Article }
  | { success: false; error: string };

export type AiStreamStartResult =
  | { success: true; streamId: string }
  | { success: false; error: string };

export interface AiStreamChunkEvent {
  streamId: string;
  chunk: string;
  done: boolean;
  fullText?: string;
  error?: string;
}

export const articlesAPI = {
  add: (url: string): Promise<AddArticleResult> =>
    window.electron.invoke('articles:add', url) as Promise<AddArticleResult>,

  addManual: (input: ArticleCreateInput): Promise<AddArticleResult> =>
    window.electron.invoke('articles:addManual', input) as Promise<AddArticleResult>,

  getAll: (): Promise<Article[]> =>
    window.electron.invoke('articles:getAll') as Promise<Article[]>,

  getById: (id: number): Promise<Article | null> =>
    window.electron.invoke('articles:getById', id) as Promise<Article | null>,

  delete: (id: number): Promise<void> =>
    window.electron.invoke('articles:delete', id) as Promise<void>
};

export const aiAPI = {
  explain: (input: {
    selectedText: string;
    contextBefore: string;
    contextAfter: string;
  }): Promise<AiStreamStartResult> =>
    window.electron.invoke('ai:explain', input) as Promise<AiStreamStartResult>,

  onStreamChunk: (callback: (event: AiStreamChunkEvent) => void): (() => void) =>
    window.electron.on('ai:stream-chunk', callback as (...args: unknown[]) => void),

  cancelStream: (streamId: string): Promise<void> =>
    window.electron.invoke('ai:stream-cancel', streamId) as Promise<void>
};

export const lookupsAPI = {
  create: (input: LookupCreateInput): Promise<Lookup> =>
    window.electron.invoke('lookups:create', input) as Promise<Lookup>,

  getAll: (filters?: { lookupType?: LookupType; masteryStatus?: MasteryStatus }): Promise<Lookup[]> =>
    window.electron.invoke('lookups:getAll', filters) as Promise<Lookup[]>,

  getByArticle: (articleId: number): Promise<Lookup[]> =>
    window.electron.invoke('lookups:getByArticle', articleId) as Promise<Lookup[]>,

  updateStatus: (id: number, status: MasteryStatus): Promise<void> =>
    window.electron.invoke('lookups:updateStatus', id, status) as Promise<void>
};

export const cardsAPI = {
  generateFromLookup: (lookupId: number): Promise<{ success: true; card: unknown; alreadyExists: boolean } | { success: false; error: string }> =>
    window.electron.invoke('cards:generateFromLookup', lookupId) as Promise<{ success: true; card: unknown; alreadyExists: boolean } | { success: false; error: string }>,

  getAll: (): Promise<unknown[]> =>
    window.electron.invoke('cards:getAll') as Promise<unknown[]>,

  getDue: (): Promise<unknown[]> =>
    window.electron.invoke('cards:getDue') as Promise<unknown[]>,

  review: (id: number, interval: number, repetitions: number, easeFactor: number): Promise<void> =>
    window.electron.invoke('cards:review', id, interval, repetitions, easeFactor) as Promise<void>,

  exportTsv: (): Promise<{ success: true; path: string; count: number } | { success: false; error: string }> =>
    window.electron.invoke('cards:exportTsv') as Promise<{ success: true; path: string; count: number } | { success: false; error: string }>
};
