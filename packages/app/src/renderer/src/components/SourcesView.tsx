import { Fragment, useState, useEffect, useCallback } from 'react';
import type {
  IngestionSource,
  IngestionSourceType,
  RefreshPosture,
  RefreshProgressEvent,
  RetentionPolicy,
  StorageStats
} from '@thinklish/shared';
import { remediateIngestionError } from '@thinklish/shared';
import { sourcesAPI, storageAPI } from '../lib/api';
import { formatApproxBytes, formatRelativeTime, truncate } from '../lib/format';
import { describeSourceSchedule } from '../lib/source-schedule-hint';
import { cn } from '../lib/utils';

function TypeBadge({ type }: { type: IngestionSourceType }): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        type === 'feed' ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300' : 'bg-muted text-muted-foreground'
      )}
    >
      {type === 'feed' ? 'Syndicated (RSS / Atom)' : 'Other'}
    </span>
  );
}

const POSTURE_OPTIONS: { value: RefreshPosture; label: string; hint: string }[] = [
  { value: 'manual', label: 'Manual', hint: 'No automatic refreshes' },
  { value: 'relaxed', label: 'Relaxed', hint: 'About every 2 hours' },
  { value: 'normal', label: 'Normal', hint: 'About every 30 minutes' }
];

function StatusBadge({ status }: { status: IngestionSource['status'] }): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        status === 'enabled' ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200' : 'bg-muted text-muted-foreground'
      )}
    >
      {status === 'enabled' ? 'Enabled' : 'Paused'}
    </span>
  );
}

export function SourcesView(): JSX.Element {
  const [sources, setSources] = useState<IngestionSource[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newEnglishOnly, setNewEnglishOnly] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [globalPosture, setGlobalPosture] = useState<RefreshPosture>('normal');
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<RefreshProgressEvent | null>(null);
  const [lastRefreshSummary, setLastRefreshSummary] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [retentionDraft, setRetentionDraft] = useState<RetentionPolicy | null>(null);
  const [storageBusy, setStorageBusy] = useState(false);

  const loadSources = useCallback(async () => {
    const [data, posture, stats, retention] = await Promise.all([
      sourcesAPI.list(),
      sourcesAPI.getGlobalPosture(),
      storageAPI.getStats(),
      storageAPI.getRetentionPolicy()
    ]);
    setSources(data);
    setGlobalPosture(posture);
    setStorageStats(stats);
    setRetentionDraft(retention);
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  useEffect(() => {
    return sourcesAPI.onRefreshProgress((ev) => {
      setRefreshProgress(ev);
    });
  }, []);

  const handleAdd = async (): Promise<void> => {
    const url = newUrl.trim();
    const label = newLabel.trim();
    if (!url || !label) {
      setError('Please enter both URL and label.');
      return;
    }

    setLoading(true);
    setError(null);
    const result = await sourcesAPI.create({
      url,
      label,
      sourceType: 'feed',
      englishOnly: newEnglishOnly
    });

    if (result.success) {
      setNewUrl('');
      setNewLabel('');
      setNewEnglishOnly(true);
      await loadSources();
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const startEdit = (s: IngestionSource): void => {
    setEditingId(s.id);
    setEditLabel(s.label);
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setEditLabel('');
  };

  const saveEdit = async (): Promise<void> => {
    if (editingId === null) return;
    const label = editLabel.trim();
    if (!label) {
      setError('Label cannot be empty.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await sourcesAPI.update(editingId, { label });
    if (result.success) {
      cancelEdit();
      await loadSources();
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const togglePause = async (s: IngestionSource): Promise<void> => {
    setError(null);
    const paused = s.status === 'enabled';
    const result = await sourcesAPI.setPaused(s.id, paused);
    if (result.success) {
      await loadSources();
    } else {
      setError(result.error);
    }
  };

  const handleRefreshFeed = async (s: IngestionSource): Promise<void> => {
    if (s.sourceType !== 'feed') return;
    setError(null);
    setRefreshingId(s.id);
    const result = await sourcesAPI.refreshFeed(s.id);
    await loadSources();
    setRefreshingId(null);
    if (!result.ok) {
      setError(result.error ?? 'Feed refresh failed');
    }
  };

  const handleGlobalPostureChange = async (value: RefreshPosture): Promise<void> => {
    setError(null);
    const result = await sourcesAPI.setGlobalPosture(value);
    if (result.success) {
      setGlobalPosture(value);
    } else {
      setError(result.error);
    }
  };

  const handleSourcePostureChange = async (s: IngestionSource, value: string): Promise<void> => {
    setError(null);
    const next = value === '' ? null : (value as RefreshPosture);
    const result = await sourcesAPI.update(s.id, { refreshPosture: next });
    if (result.success) {
      await loadSources();
      setError(null);
    } else {
      setError(result.error);
    }
  };

  const handleRefreshAll = async (): Promise<void> => {
    setError(null);
    setLastRefreshSummary(null);
    setRefreshProgress(null);
    setRefreshingAll(true);
    try {
      const summary = await sourcesAPI.refreshAll();
      setLastRefreshSummary(
        `${summary.successCount} ok, ${summary.failCount} failed, ${summary.skippedCount} skipped`
      );
      await loadSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh all failed');
    } finally {
      setRefreshingAll(false);
      setRefreshProgress(null);
    }
  };

  const handleDelete = async (s: IngestionSource): Promise<void> => {
    const ok = window.confirm(
      `Remove “${s.label}” from your sources?\n\nArticles already in your library stay put — this only removes the source entry.`
    );
    if (!ok) return;
    setError(null);
    const result = await sourcesAPI.delete(s.id);
    if (result.success) {
      await loadSources();
    } else {
      setError(result.error);
    }
  };

  const handleSaveRetention = async (): Promise<void> => {
    if (!retentionDraft) return;
    setStorageBusy(true);
    setError(null);
    const res = await storageAPI.setRetentionPolicy(retentionDraft);
    if (res.success) {
      setRetentionDraft(res.policy);
    } else {
      setError(res.error);
    }
    setStorageBusy(false);
  };

  const handlePreviewCleanup = async (): Promise<void> => {
    if (!retentionDraft) return;
    setStorageBusy(true);
    setError(null);
    const res = await storageAPI.getCleanupPreview(retentionDraft);
    setStorageBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    const { wouldDelete, protectedStubsPastAgeWithLookups } = res.preview;
    const lines = [
      `Articles that would be removed now: ${wouldDelete}.`,
      'Imported articles that have any lookup (and their review cards) are never removed by this cleanup.',
      retentionDraft.maxUnreadImportedAgeDays > 0
        ? `Old unread stubs still protected by lookups: ${protectedStubsPastAgeWithLookups}.`
        : null
    ].filter(Boolean);
    window.alert(lines.join('\n\n'));
  };

  const handleRunCleanup = async (): Promise<void> => {
    if (!retentionDraft) return;
    setStorageBusy(true);
    setError(null);
    const prev = await storageAPI.getCleanupPreview(retentionDraft);
    setStorageBusy(false);
    if (!prev.success) {
      setError(prev.error);
      return;
    }
    const n = prev.preview.wouldDelete;
    if (n === 0) {
      window.alert('No articles match the current policy (or all matches have lookups and are protected).');
      return;
    }
    const ok = window.confirm(
      `Remove ${n} imported article(s) from your library?\n\n` +
        'This cannot be undone. Articles with lookups or cards are not included in this count and will stay.'
    );
    if (!ok) return;
    setStorageBusy(true);
    const run = await storageAPI.runCleanup(retentionDraft);
    setStorageBusy(false);
    if (!run.success) {
      setError(run.error);
      return;
    }
    await loadSources();
    window.alert(`Removed ${run.result.deletedCount} article(s).`);
  };

  const handleDeleteAllArticlesForSource = async (s: IngestionSource): Promise<void> => {
    setError(null);
    const prev = await sourcesAPI.deleteWithArticlesPreview(s.id);
    if (!prev.success) {
      setError(prev.error);
      return;
    }
    const { articleCount, articlesWithLookups, lookupCount } = prev.impact;
    if (articleCount === 0) {
      window.alert('No articles are linked to this source.');
      return;
    }
    const msg =
      `Permanently delete all ${articleCount} article(s) from “${s.label}”?\n\n` +
      `${articlesWithLookups} article(s) have ${lookupCount} lookup record(s) (and any cards). Those lookups and cards will be deleted with the articles.\n\n` +
      'This does not remove the source entry itself — only library articles tied to this source.';
    if (!window.confirm(msg)) return;
    const typed = window.prompt('Type DELETE to confirm removing these articles.');
    if (typed !== 'DELETE') {
      window.alert('Cancelled.');
      return;
    }
    const res = await sourcesAPI.deleteWithArticles(s.id);
    if (!res.success) {
      setError(res.error);
      return;
    }
    await loadSources();
    window.alert(`Deleted ${res.deletedCount} article(s).`);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <h2 className="text-xl font-semibold">Sources</h2>
          <div className="flex flex-col gap-2 sm:items-end min-w-[12rem]">
            <label className="text-xs font-medium text-muted-foreground">Global refresh</label>
            <select
              value={globalPosture}
              onChange={(e) => void handleGlobalPostureChange(e.target.value as RefreshPosture)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {POSTURE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} — {o.hint}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleRefreshAll()}
              disabled={refreshingAll}
              className="h-9 px-3 rounded-md border border-input text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {refreshingAll ? 'Refreshing all…' : 'Refresh all sources'}
            </button>
            {refreshProgress && refreshingAll ? (
              <div className="w-full max-w-xs text-xs text-muted-foreground space-y-1">
                {refreshProgress.phase === 'started' && refreshProgress.total !== undefined ? (
                  <p>Starting… {refreshProgress.total} sources</p>
                ) : null}
                {refreshProgress.phase === 'source' &&
                refreshProgress.processed !== undefined &&
                refreshProgress.total !== undefined ? (
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span className="truncate" title={refreshProgress.sourceName}>
                        {refreshProgress.sourceName ?? 'Source'}
                      </span>
                      <span>
                        {refreshProgress.processed}/{refreshProgress.total}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${Math.round((100 * refreshProgress.processed) / Math.max(refreshProgress.total, 1))}%`
                        }}
                      />
                    </div>
                  </div>
                ) : null}
                {refreshProgress.phase === 'completed' ? <p>{refreshProgress.message}</p> : null}
              </div>
            ) : null}
            {lastRefreshSummary && !refreshingAll ? (
              <p className="text-xs text-muted-foreground">{lastRefreshSummary}</p>
            ) : null}
          </div>
        </div>

        <div className="mb-8 rounded-lg border border-border bg-muted/20 p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Add a syndicated feed URL (RSS or Atom). Subscriptions are for{' '}
            <span className="font-medium text-foreground">steady, high-quality English reading</span>, not chasing headlines — URLs ending in{' '}
            <span className="font-mono text-xs">.xml</span> or containing <span className="font-mono text-xs">/feed</span> are typical feed addresses.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">URL</label>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://…"
                disabled={loading}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Label</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Readable name"
                disabled={loading}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={newEnglishOnly}
              onChange={(e) => setNewEnglishOnly(e.target.checked)}
              disabled={loading}
              className="accent-primary rounded border-input"
            />
            English-only filter (recommended for learning focus)
          </label>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAdd}
              disabled={loading || !newUrl.trim() || !newLabel.trim()}
              className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              {loading ? 'Saving…' : 'Add source'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm" role="alert">
            {error}
          </div>
        )}

        {sources.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <span className="text-3xl">🌿</span>
            </div>
            <h3 className="text-lg font-medium mb-2">Build a steady stream of English reading</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-2">
              Subscribe to sources you trust for <span className="font-medium text-foreground">material quality</span> and a repeatable habit — not another news river. Pair feeds with pasted URLs in your library; both feed the same deep-reading loop.
            </p>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              选你真正愿意精读的来源，养成稳定输入；订阅与粘贴共用同一套文章、查询词与复习流。
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Label</th>
                  <th className="px-3 py-2 font-medium">URL</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Refresh</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Backoff</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Created</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Last OK</th>
                  <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sources.map((s) => (
                  <Fragment key={s.id}>
                  <tr className="hover:bg-muted/30">
                    <td className="px-3 py-2 align-top">
                      <TypeBadge type={s.sourceType} />
                    </td>
                    <td className="px-3 py-2 align-top max-w-[10rem]">
                      {editingId === s.id ? (
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="w-full h-8 rounded border border-input bg-background px-2 text-xs"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium break-words">{s.label}</span>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        EN-only: {s.englishOnly ? 'on' : 'off'}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-muted-foreground max-w-[14rem]">
                      <span className="break-all" title={s.url}>
                        {truncate(s.url, 48)}
                      </span>
                      {s.lastError ? (
                        <button
                          type="button"
                          className="mt-1 block text-left text-[11px] font-medium text-destructive hover:underline"
                          onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                        >
                          View error & how to fix
                        </button>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-3 py-2 align-top">
                      {s.sourceType === 'feed' || s.sourceType === 'watch' ? (
                        <select
                          value={s.refreshPosture ?? ''}
                          onChange={(e) => void handleSourcePostureChange(s, e.target.value)}
                          disabled={loading}
                          className="max-w-[9rem] h-8 rounded border border-input bg-background px-1 text-xs"
                          title="Override global refresh cadence for this source"
                        >
                          <option value="">Default</option>
                          {POSTURE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-muted-foreground whitespace-nowrap">
                      {(s.sourceType === 'feed' || s.sourceType === 'watch') && s.consecutiveFailures > 0 ? (
                        <span title={s.lastError ?? ''}>
                          {s.consecutiveFailures} fail{s.consecutiveFailures > 1 ? 's' : ''}
                          {s.lastAttemptAt ? (
                            <span className="block text-[10px] max-w-[7rem] truncate">Last try {formatRelativeTime(s.lastAttemptAt)}</span>
                          ) : null}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-muted-foreground whitespace-nowrap text-xs">
                      {formatRelativeTime(s.createdAt)}
                    </td>
                    <td className="px-3 py-2 align-top text-muted-foreground whitespace-nowrap text-xs">
                      {s.lastSuccessAt ? formatRelativeTime(s.lastSuccessAt) : '—'}
                    </td>
                    <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                      {editingId === s.id ? (
                        <div className="flex gap-1 justify-end">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="h-8 px-2 rounded border border-input text-xs hover:bg-muted"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={saveEdit}
                            disabled={loading}
                            className="h-8 px-2 rounded bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1 justify-end">
                          {s.sourceType === 'feed' ? (
                            <button
                              type="button"
                              onClick={() => void handleRefreshFeed(s)}
                              disabled={refreshingId === s.id || s.status !== 'enabled'}
                              className="h-8 px-2 rounded border border-input text-xs hover:bg-muted disabled:opacity-50"
                              title={s.status !== 'enabled' ? 'Resume source to refresh' : 'Fetch latest items from feed'}
                            >
                              {refreshingId === s.id ? 'Refreshing…' : 'Refresh'}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => startEdit(s)}
                            className="h-8 px-2 rounded border border-input text-xs hover:bg-muted"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePause(s)}
                            className="h-8 px-2 rounded border border-input text-xs hover:bg-muted"
                          >
                            {s.status === 'enabled' ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(s)}
                            className="h-8 px-2 rounded border border-destructive/40 text-destructive text-xs hover:bg-destructive/10"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                            className="h-8 px-2 rounded border border-input text-xs hover:bg-muted"
                          >
                            {expandedId === s.id ? 'Hide detail' : 'Detail'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedId === s.id ? (
                    <tr className="bg-muted/20">
                      <td colSpan={9} className="px-4 py-4 text-sm">
                        <div className="grid gap-4 sm:grid-cols-2 max-w-4xl">
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                              Last successful fetch
                            </h4>
                            <p className="text-foreground">
                              {s.lastSuccessAt ? formatRelativeTime(s.lastSuccessAt) : 'Never'}
                              {s.lastSuccessAt ? (
                                <span className="block text-xs text-muted-foreground mt-0.5">
                                  {new Date(s.lastSuccessAt).toLocaleString()}
                                </span>
                              ) : null}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                              Last attempt
                            </h4>
                            <p className="text-foreground">
                              {s.lastAttemptAt ? formatRelativeTime(s.lastAttemptAt) : '—'}
                              {s.lastAttemptAt ? (
                                <span className="block text-xs text-muted-foreground mt-0.5">
                                  {new Date(s.lastAttemptAt).toLocaleString()}
                                </span>
                              ) : null}
                            </p>
                          </div>
                          <div className="sm:col-span-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                              Next scheduled / eligible automatic fetch
                            </h4>
                            <p className="text-foreground">{describeSourceSchedule(s, globalPosture, Date.now())}</p>
                          </div>
                          <div className="sm:col-span-2 border-t border-border pt-3 mt-1">
                            <button
                              type="button"
                              disabled={storageBusy}
                              onClick={() => void handleDeleteAllArticlesForSource(s)}
                              className="h-9 px-3 rounded-md border border-destructive/50 text-destructive text-sm font-medium hover:bg-destructive/10 disabled:opacity-50"
                            >
                              Delete all articles from this source…
                            </button>
                            <p className="text-xs text-muted-foreground mt-2">
                              Removes every article linked to this source, including lookups and cards. The source entry itself stays unless you delete the row above.
                            </p>
                          </div>
                          {s.lastError ? (
                            <div className="sm:col-span-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-destructive mb-2">
                                Last error
                              </h4>
                              {(() => {
                                const help = remediateIngestionError(s.lastError);
                                if (!help) return null;
                                return (
                                  <div className="space-y-2">
                                    <p className="font-medium text-foreground">{help.summary}</p>
                                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground text-sm">
                                      {help.bullets.map((b, i) => (
                                        <li key={i}>{b}</li>
                                      ))}
                                    </ul>
                                    <details className="text-xs text-muted-foreground">
                                      <summary className="cursor-pointer hover:text-foreground">Technical detail</summary>
                                      <p className="mt-2 whitespace-pre-wrap break-words">{help.sanitizedTechnical}</p>
                                    </details>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <section className="mt-12 pt-10 border-t border-border space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-1">Library and storage</h3>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Control how much space imported feed items use. Retention only removes imported articles with{' '}
              <span className="font-medium text-foreground">no lookups</span> (anything you studied stays). Unread here means a feed item you have{' '}
              <span className="font-medium text-foreground">never opened in the reader</span> for full text (stub preview only).
            </p>
          </div>

          {storageStats && (
            <div className="rounded-lg border border-border bg-muted/15 p-4 grid gap-2 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Imported from sources</p>
                <p className="text-foreground font-medium">
                  {storageStats.importedCount} articles · ~{formatApproxBytes(storageStats.importedApproxBytes)} text
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pasted / manual</p>
                <p className="text-foreground font-medium">
                  {storageStats.manualCount} articles · ~{formatApproxBytes(storageStats.manualApproxBytes)} text
                </p>
              </div>
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                Sizes sum UTF-8 lengths of stored fields (approximate; excludes SQLite overhead).
              </p>
            </div>
          )}

          {retentionDraft ? (
            <div className="rounded-lg border border-border p-4 space-y-4">
              <h4 className="text-sm font-semibold">Retention policy</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block text-sm">
                  <span className="text-xs font-medium text-muted-foreground block mb-1">
                    Max age for unread imports (days, 0 = off)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={3650}
                    value={retentionDraft.maxUnreadImportedAgeDays}
                    onChange={(e) =>
                      setRetentionDraft((d) =>
                        d ? { ...d, maxUnreadImportedAgeDays: Number(e.target.value) || 0 } : d
                      )
                    }
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-medium text-muted-foreground block mb-1">
                    Max total imported articles (0 = off)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={1_000_000}
                    value={retentionDraft.maxImportedTotal}
                    onChange={(e) =>
                      setRetentionDraft((d) => (d ? { ...d, maxImportedTotal: Number(e.target.value) || 0 } : d))
                    }
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-medium text-muted-foreground block mb-1">
                    Per-source imported cap (0 = off)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100_000}
                    value={retentionDraft.perSourceImportedCap}
                    onChange={(e) =>
                      setRetentionDraft((d) =>
                        d ? { ...d, perSourceImportedCap: Number(e.target.value) || 0 } : d
                      )
                    }
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={storageBusy}
                  onClick={() => void handleSaveRetention()}
                  className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  Save policy
                </button>
                <button
                  type="button"
                  disabled={storageBusy}
                  onClick={() => void handlePreviewCleanup()}
                  className="h-9 px-3 rounded-md border border-input text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  Preview cleanup
                </button>
                <button
                  type="button"
                  disabled={storageBusy}
                  onClick={() => void handleRunCleanup()}
                  className="h-9 px-3 rounded-md border border-destructive/50 text-destructive text-sm font-medium hover:bg-destructive/10 disabled:opacity-50"
                >
                  Run cleanup now
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
