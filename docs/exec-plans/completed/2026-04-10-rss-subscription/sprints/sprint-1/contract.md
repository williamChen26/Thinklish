# Sprint 1 Contract: Ingestion Source Registry (F1)

## Feature

**F1 — Ingestion source registry (feeds & watched targets).** Users register **ingestion sources** with a clear type (`feed` vs `watch`), human-readable label, enabled/paused state, optional English-only flag, and trust metadata (`last_success_at`, `last_error`). Data persists in SQLite; the renderer exposes a **Sources** UI and IPC for CRUD. Deleting a source does not remove existing articles from the library.

## Scope

- Shared types: `IngestionSource`, `IngestionSourceType`, `IngestionSourceStatus`, create/update inputs (`englishOnly` default true when omitted).
- SQLite `ingestion_sources` table: unique `url`, `label`, `source_type`, `status`, `english_only`, timestamps, `last_success_at`, `last_error`; index on `status`.
- Core repository: `createSource`, `getAllSources`, `getSourceById`, `getEnabledSources`, `updateSource` (label + `englishOnly`), `setSourcePaused`, `deleteSource`, `recordSourceFeedSuccess` / `recordSourceFeedFailure` (for downstream ingestion status).
- Main IPC: `sources:list`, `sources:create`, `sources:update`, `sources:setPaused`, `sources:delete`, plus `sources:refreshFeed` (delegates to core `fetchFeed` when a feed is refreshed manually from the UI).
- Renderer: `SourcesView` — add form (URL, label, type radios, English-only checkbox, URL-based type hint), table with rename/pause/delete, last error display, empty state copy framed for **English reading habit** (not RSS-client positioning). Delete confirmation states articles remain.
- Renderer API: `sourcesAPI` wrapping the above channels.

## Out of Scope

- Automatic scheduled polling, global refresh bands, backoff, and fairness (F3).
- RSS/Atom parsing and article row creation as an automated pipeline beyond manual **Refresh** on a feed row (full F2 behavior is Sprint 2; the Refresh button may call into F2 once available).
- Watch-target crawling / synthetic feed (F4).
- OPML, profiles/multi-user sync, feed discovery (F7).

## Acceptance Criteria (table with ID, Criterion, Verification Method)

| ID | Criterion | Verification Method |
|----|-----------|---------------------|
| F1-AC1 | User can **add** a source with URL, label, and explicit **type** (`feed` or `watch`); product may **hint** type from URL patterns. | Manual: `SourcesView` radios + `suggestSourceTypeFromUrl`; `createSource` persists `source_type`. |
| F1-AC2 | User can **rename** (label), **pause/resume**, and **delete**; paused sources are excluded from enabled queries. | Manual + unit: `updateSource`, `setSourcePaused`, `deleteSource`; `repository.test.ts` `getEnabledSources` excludes paused. |
| F1-AC3 | Source list **persists** across restarts (same DB path). | Unit: `repository.test.ts` close/reopen DB retains row. |
| F1-AC4 | Deleting a source does **not** remove articles from the library by default. | Unit: `deleteSource` test asserts article count unchanged; schema `articles.source_id` references source with `ON DELETE SET NULL`. |
| F1-AC5 | Empty state explains **learning purpose** of sources, not “RSS inbox” framing. | Manual: empty `SourcesView` copy (EN + ZH) emphasizes steady English reading. |
| F1-AC6 | Invalid input fails safely with clear errors (invalid URL, duplicate URL, empty label). | Unit: `createSource` throws; IPC returns `{ success: false, error }`. |

## Technical Approach (brief)

SQLite + `better-sqlite3`; snake_case columns mapped to shared camelCase in the repository. URL validation via `URL` constructor; duplicate URLs surface as user-facing error from unique constraint. Pause is a status flag; future schedulers use `getEnabledSources()`. IPC validates payloads with small type guards before calling core.

## Dependencies

- Existing app shell, Electron preload `invoke` bridge, and database init path used by other features.
- Optional coupling: `sources:refreshFeed` → `@thinklish/core` `fetchFeed` (F2) for manual per-feed refresh from the Sources table.

## Cross-package type changes

- **`@thinklish/shared`:** `packages/shared/src/types/ingestion-source.ts` — source model and create/update inputs.
- **`@thinklish/core`:** schema + `sources/repository` exports (consumed by app IPC and by F2 ingestion).

## Estimated Complexity

**Low–medium** — straightforward CRUD + one new UI surface; no networking beyond optional F2 hook-up for Refresh.
