import { useState, useEffect, useCallback } from 'react';
import type { Lookup, LookupType, MasteryStatus } from '@english-studio/shared';
import { lookupsAPI, cardsAPI } from '../lib/api';
import { formatRelativeTime } from '../lib/format';
import { cn } from '../lib/utils';

const STATUS_LABELS: Record<MasteryStatus, string> = {
  new: '未复习',
  reviewing: '复习中',
  mastered: '已掌握',
  needs_work: '需加强'
};

const STATUS_COLORS: Record<MasteryStatus, string> = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  reviewing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  mastered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  needs_work: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
};

const TYPE_LABELS: Record<LookupType, string> = {
  word: '单词',
  phrase: '短语',
  sentence: '句子'
};

const MASTERY_OPTIONS: MasteryStatus[] = ['new', 'reviewing', 'mastered', 'needs_work'];

export function LearningLogView(): JSX.Element {
  const [lookups, setLookups] = useState<Lookup[]>([]);
  const [filterType, setFilterType] = useState<LookupType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<MasteryStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadLookups = useCallback(async () => {
    const filters: { lookupType?: LookupType; masteryStatus?: MasteryStatus } = {};
    if (filterType !== 'all') filters.lookupType = filterType;
    if (filterStatus !== 'all') filters.masteryStatus = filterStatus;
    const data = await lookupsAPI.getAll(filters);
    setLookups(data);
  }, [filterType, filterStatus]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  const handleStatusChange = async (id: number, status: MasteryStatus): Promise<void> => {
    await lookupsAPI.updateStatus(id, status);
    await loadLookups();
  };

  const handleGenerateCard = async (lookupId: number): Promise<void> => {
    const result = await cardsAPI.generateFromLookup(lookupId);
    if (result.success && result.alreadyExists) {
      alert('Card already exists for this entry');
    }
  };

  const handleExport = async (): Promise<void> => {
    const result = await cardsAPI.exportTsv();
    if (result.success) {
      alert(`Exported ${result.count} cards to ${result.path}`);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Learning Log</h2>
          <button
            type="button"
            onClick={handleExport}
            className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
          >
            Export TSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as LookupType | 'all')}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All types</option>
            <option value="word">单词</option>
            <option value="phrase">短语</option>
            <option value="sentence">句子</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as MasteryStatus | 'all')}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All status</option>
            {MASTERY_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          <span className="flex items-center text-sm text-muted-foreground ml-auto">
            {lookups.length} entries
          </span>
        </div>

        {/* List */}
        {lookups.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-3xl mb-4 block">📝</span>
            <p className="text-muted-foreground text-sm">
              No learning entries yet. Select text while reading to start building your log.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {lookups.map((lookup) => (
              <li key={lookup.id} className="border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === lookup.id ? null : lookup.id)}
                  className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{lookup.selectedText}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-muted-foreground">
                          {TYPE_LABELS[lookup.lookupType]}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(lookup.createdAt)}
                        </span>
                      </div>
                    </div>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full shrink-0',
                      STATUS_COLORS[lookup.masteryStatus]
                    )}>
                      {STATUS_LABELS[lookup.masteryStatus]}
                    </span>
                  </div>
                </button>

                {expandedId === lookup.id && (
                  <div className="px-4 pb-4 border-t border-border pt-3">
                    {/* Context */}
                    {lookup.contextBefore && (
                      <p className="text-xs text-muted-foreground mb-2 italic">
                        ...{lookup.contextBefore}<strong>{lookup.selectedText}</strong>{lookup.contextAfter}...
                      </p>
                    )}

                    {/* AI Response */}
                    <div className="text-sm text-muted-foreground whitespace-pre-line mt-2 mb-3">
                      {lookup.aiResponse.slice(0, 500)}
                      {lookup.aiResponse.length > 500 && '...'}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {MASTERY_OPTIONS.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatusChange(lookup.id, status)}
                          className={cn(
                            'text-xs px-2.5 py-1 rounded-md transition-colors',
                            lookup.masteryStatus === status
                              ? STATUS_COLORS[status]
                              : 'border border-border hover:bg-muted'
                          )}
                        >
                          {STATUS_LABELS[status]}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleGenerateCard(lookup.id)}
                        className="text-xs px-2.5 py-1 rounded-md border border-primary/30 text-primary hover:bg-primary/10 transition-colors ml-auto"
                      >
                        🃏 Generate Card
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
