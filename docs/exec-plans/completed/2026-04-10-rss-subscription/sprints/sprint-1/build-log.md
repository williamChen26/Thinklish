# Build Log: Sprint 1 — Ingestion Source Registry

## Round 1

### What Was Built

- **Shared types** for ingestion sources (`feed` | `watch`, `enabled` | `paused`, timestamps, `englishOnly`, last success/error).
- **Schema:** `ingestion_sources` table with constraints and `idx_ingestion_sources_status`; articles table extended with nullable `source_id` (FK with `ON DELETE SET NULL`), `feed_item_id`, `is_stub` (migration helpers for existing DBs).
- **Core `sources/repository`:** full CRUD + `getEnabledSources` + feed status helpers used by ingestion.
- **IPC `registerSourceHandlers`:** list/create/update/setPaused/delete + `sources:refreshFeed` (loads source by id, calls `fetchFeed` for manual refresh).
- **UI `SourcesView`:** add flow, inline rename, pause/resume, delete with safe-delete copy, type badges, `lastError` / relative times, per-feed **Refresh** when type is `feed` and status enabled.
- **`sourcesAPI`** in renderer `api.ts`.

### Acceptance Criteria Status (table)

| AC ID | Status | Notes |
|-------|--------|-------|
| F1-AC1 | Met | Explicit type + URL hint in `SourcesView`. |
| F1-AC2 | Met | Rename, pause, delete + `getEnabledSources` behavior tested. |
| F1-AC3 | Met | Persistence test in `repository.test.ts`. |
| F1-AC4 | Met | Delete source does not delete articles; FK nulls `source_id` on source delete per schema. |
| F1-AC5 | Met | Empty state emphasizes English reading / habit. |
| F1-AC6 | Met | Validation + IPC error results. |

### Decisions Made

- **`englishOnly`** stored per source (default ON) to align with product “English learning” positioning; used later by feed ingestion.
- **URL uniqueness** enforced at DB layer; user sees “already exists” style message.
- **Watch** type is registered in UI/schema for F4 readiness; no crawler in this sprint.
- **Manual Refresh** on feed rows wired through IPC to core ingestion (`fetchFeed`) for immediate value once F2 landed in tree.

### TypeCheck Results

- `@thinklish/core`: `pnpm typecheck` — **PASS**
- `@thinklish/app`: `pnpm typecheck` — **PASS**

### Known Issues

- None blocking for F1. Per-source schedule overrides and global refresh bands deferred to F3.

### Test Results

- `@thinklish/core` — `vitest run src/sources/repository.test.ts`: **PASS** (all cases including persistence, pause filter, safe delete vs articles).
