import { useState, useEffect, useCallback } from 'react';
import type { IngestionSource, IngestionSourceType, RefreshPosture, RefreshProgressEvent } from '@thinklish/shared';
import { sourcesAPI } from '../lib/api';
import { formatRelativeTime, truncate } from '../lib/format';
import { cn } from '../lib/utils';

/** Trivial URL hint: pre-select feed when the path looks like a syndication URL; user can still change type. */
function suggestSourceTypeFromUrl(raw: string): IngestionSourceType | null {
  const u = raw.trim().toLowerCase();
  if (!u) return null;
  if (u.includes('/feed') || u.endsWith('.xml') || u.includes('.xml?') || u.includes('.rss')) {
    return 'feed';
  }
  return null;
}

function TypeBadge({ type }: { type: IngestionSourceType }): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        type === 'feed' ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300' : 'bg-amber-500/15 text-amber-800 dark:text-amber-200'
      )}
    >
      {type === 'feed' ? 'Feed' : 'Watch'}
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
  const [newSourceType, setNewSourceType] = useState<IngestionSourceType>('feed');
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

  const loadSources = useCallback(async () => {
    const [data, posture] = await Promise.all([sourcesAPI.list(), sourcesAPI.getGlobalPosture()]);
    setSources(data);
    setGlobalPosture(posture);
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  useEffect(() => {
    return sourcesAPI.onRefreshProgress((ev) => {
      setRefreshProgress(ev);
    });
  }, []);

  const onNewUrlChange = (value: string): void => {
    setNewUrl(value);
    const hint = suggestSourceTypeFromUrl(value);
    if (hint) {
      setNewSourceType(hint);
    }
  };

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
      sourceType: newSourceType,
      englishOnly: newEnglishOnly
    });

    if (result.success) {
      setNewUrl('');
      setNewLabel('');
      setNewSourceType('feed');
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
      setLastRefreshSummary(`${summary.successCount} succeeded, ${summary.failCount} failed`);
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
              {refreshingAll ? 'Refreshing all…' : 'Refresh all feeds'}
            </button>
            {refreshProgress && refreshingAll ? (
              <div className="w-full max-w-xs text-xs text-muted-foreground space-y-1">
                {refreshProgress.phase === 'started' && refreshProgress.total !== undefined ? (
                  <p>Starting… {refreshProgress.total} feeds</p>
                ) : null}
                {refreshProgress.phase === 'source' &&
                refreshProgress.processed !== undefined &&
                refreshProgress.total !== undefined ? (
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span className="truncate" title={refreshProgress.sourceName}>
                        {refreshProgress.sourceName ?? 'Feed'}
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
            Add a feed URL or a single listing page to watch. Choose the type explicitly — we only use the URL
            for a light hint (e.g. <span className="font-mono text-xs">.xml</span> suggests a feed).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">URL</label>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => onNewUrlChange(e.target.value)}
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

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground mb-2">Source type</legend>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="sourceType"
                  checked={newSourceType === 'feed'}
                  onChange={() => setNewSourceType('feed')}
                  disabled={loading}
                  className="accent-primary"
                />
                Feed (RSS / Atom)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="sourceType"
                  checked={newSourceType === 'watch'}
                  onChange={() => setNewSourceType('watch')}
                  disabled={loading}
                  className="accent-primary"
                />
                Watch (one listing page)
              </label>
            </div>
          </fieldset>

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
              Subscribe to your favorite English content sources and keep a calm, repeatable reading habit — not
              just another RSS inbox.
            </p>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              订阅你喜欢的英语内容源，保持阅读习惯；把精读和复习留给下面的文章与卡片流程。
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
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sources.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30">
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
                        <div className="mt-1 text-[11px] text-destructive break-words" role="alert">
                          {s.lastError}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-3 py-2 align-top">
                      {s.sourceType === 'feed' ? (
                        <select
                          value={s.refreshPosture ?? ''}
                          onChange={(e) => void handleSourcePostureChange(s, e.target.value)}
                          disabled={loading}
                          className="max-w-[9rem] h-8 rounded border border-input bg-background px-1 text-xs"
                          title="Override global refresh cadence for this feed"
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
                      {s.sourceType === 'feed' && s.consecutiveFailures > 0 ? (
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
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
