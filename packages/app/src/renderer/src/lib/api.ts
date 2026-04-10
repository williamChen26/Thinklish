import type {
  Article,
  ArticleCreateInput,
  CardStats,
  CardWithBucket,
  FeedRefreshResult,
  IngestionSource,
  IngestionSourceCreateInput,
  IngestionSourceUpdateInput,
  Lookup,
  LookupCreateInput,
  LookupType,
  MasteryStatus
} from '@thinklish/shared';

export type AddArticleResult =
  | { success: true; article: Article }
  | { success: false; error: string };

export type AiStreamStartResult =
  | { success: true; streamId: string; agentName: string }
  | { success: false; error: string };

export interface AgentInfo {
  id: string;
  name: string;
  status: 'ready' | 'not_found';
  installUrl: string;
}

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
  getAgents: (): Promise<AgentInfo[]> =>
    window.electron.invoke('ai:getAgents') as Promise<AgentInfo[]>,

  explain: (input: {
    selectedText: string;
    contextBefore: string;
    contextAfter: string;
    aiProvider: string;
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

export type CreateSourceResult =
  | { success: true; source: IngestionSource }
  | { success: false; error: string };

export type UpdateSourceResult =
  | { success: true; source: IngestionSource }
  | { success: false; error: string };

export type SetSourcePausedResult =
  | { success: true; source: IngestionSource }
  | { success: false; error: string };

export type DeleteSourceResult = { success: true } | { success: false; error: string };

export const sourcesAPI = {
  list: (): Promise<IngestionSource[]> =>
    window.electron.invoke('sources:list') as Promise<IngestionSource[]>,

  create: (input: IngestionSourceCreateInput): Promise<CreateSourceResult> =>
    window.electron.invoke('sources:create', input) as Promise<CreateSourceResult>,

  update: (id: number, input: IngestionSourceUpdateInput): Promise<UpdateSourceResult> =>
    window.electron.invoke('sources:update', id, input) as Promise<UpdateSourceResult>,

  setPaused: (id: number, paused: boolean): Promise<SetSourcePausedResult> =>
    window.electron.invoke('sources:setPaused', id, paused) as Promise<SetSourcePausedResult>,

  delete: (id: number): Promise<DeleteSourceResult> =>
    window.electron.invoke('sources:delete', id) as Promise<DeleteSourceResult>,

  refreshFeed: (id: number): Promise<FeedRefreshResult> =>
    window.electron.invoke('sources:refreshFeed', id) as Promise<FeedRefreshResult>
};

export const cardsAPI = {
  generateFromLookup: (lookupId: number): Promise<{ success: true; card: unknown; alreadyExists: boolean } | { success: false; error: string }> =>
    window.electron.invoke('cards:generateFromLookup', lookupId) as Promise<{ success: true; card: unknown; alreadyExists: boolean } | { success: false; error: string }>,

  getAll: (): Promise<unknown[]> =>
    window.electron.invoke('cards:getAll') as Promise<unknown[]>,

  getAllWithBucket: (): Promise<CardWithBucket[]> =>
    window.electron.invoke('cards:getAllWithBucket') as Promise<CardWithBucket[]>,

  getDue: (): Promise<unknown[]> =>
    window.electron.invoke('cards:getDue') as Promise<unknown[]>,

  getStats: (): Promise<CardStats> =>
    window.electron.invoke('cards:getStats') as Promise<CardStats>,

  review: (id: number, interval: number, repetitions: number, easeFactor: number): Promise<void> =>
    window.electron.invoke('cards:review', id, interval, repetitions, easeFactor) as Promise<void>,

  exportTsv: (): Promise<{ success: true; path: string; count: number } | { success: false; error: string }> =>
    window.electron.invoke('cards:exportTsv') as Promise<{ success: true; path: string; count: number } | { success: false; error: string }>
};
