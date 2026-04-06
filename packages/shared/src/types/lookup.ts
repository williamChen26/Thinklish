export type LookupType = 'word' | 'phrase' | 'sentence';

export type MasteryStatus = 'new' | 'reviewing' | 'mastered' | 'needs_work';

export interface Lookup {
  id: number;
  articleId: number;
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  lookupType: LookupType;
  aiResponse: string;
  masteryStatus: MasteryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LookupCreateInput {
  articleId: number;
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  lookupType: LookupType;
  aiResponse: string;
}
