# Sprint 5 contract — F5: Storage governance and library growth control

**Run:** `2026-04-10-rss-subscription`  
**Scope:** Retention policy (global knobs), retention cleanup that preserves articles with lookups, explicit per-source article purge, storage footprint reporting, IPC + UI with destructive confirmations.

## In scope

1. **Retention policy (global)** — Persisted settings (SQLite `app_settings`) with at least:
   - **Max age for unread imported articles** (days; `0` = off). **Unread** = feed-backed article still in stub state (`is_stub = 1`, user never ran full extraction in reader).
   - **Max total imported articles** (`0` = off) — counts only articles with `source_id NOT NULL`.
   - **Per-source imported cap** (`0` = off) — per `source_id`, same eligibility as total cap.
2. **Retention cleanup** — `runRetentionCleanup()` removes candidates matching policy; **never** deletes articles that have **any lookup** (cards hang off lookups; protecting lookups covers AC2).
3. **Cleanup preview** — Before running cleanup from UI, show **counts**: articles to delete; optional line that articles with lookups are skipped (and count of imported stubs older than threshold that have lookups, when age rule is on).
4. **Per-source destructive delete** — `deleteArticlesBySource(sourceId)` removes all rows with that `source_id` (CASCADE removes lookups/cards). IPC `sources:deleteWithArticles` + preview for confirm dialog counts (articles, how many had lookups).
5. **Storage stats** — `getStorageStats()`: counts and **approximate** byte sums (`length` of text columns) split **imported** (`source_id NOT NULL`) vs **manual** (`source_id IS NULL`).
6. **IPC** — `storage:getStats`, `storage:getRetentionPolicy`, `storage:setRetentionPolicy`, `storage:getCleanupPreview`, `storage:runCleanup`, `sources:deleteWithArticlesPreview`, `sources:deleteWithArticles`.
7. **UI** — “Library & storage” panel on **Sources** screen: policy fields, stats, preview + confirm cleanup, per-source “Delete all articles from this source…” with typed confirmation using preview counts.

## Out of scope

- F4 watch ingestion, F7 discovery, cloud sync.
- Exact on-disk SQLite file size (approximate content bytes only).
- Per-source retention overrides (global knobs only).

## Acceptance mapping (spec F5)

| AC | Verification |
|----|----------------|
| AC1 Global policy knob | Three numeric settings + persisted defaults |
| AC2 Lookups/cards preserved in retention | Core deletes only imported rows with no lookups; tests |
| AC3 Bulk deletion warning + counts | Cleanup preview + confirm; source delete preview + confirm |
| AC4 Remove all articles from a source | `deleteArticlesBySource` + destructive UI |
| AC5 Imported vs manual footprint | `getStorageStats` + UI summary |

## Definition of done

- `pnpm typecheck` passes.
- `pnpm --filter @thinklish/core test` passes.
- `build-log.md` updated for this sprint.
