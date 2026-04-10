# Build Log: Sprint 1 — Ingestion Source Registry

## Round 1

### What Was Built

| Area | Files |
|------|--------|
| **shared** | `packages/shared/src/types/ingestion-source.ts` — `IngestionSourceType`, `IngestionSourceStatus`, `IngestionSource`, create/update inputs. |
| **shared** | `packages/shared/src/index.ts` — re-exports for ingestion source types. |
| **core** | `packages/core/src/database/schema.ts` — `ingestion_sources` table + index on `status`. |
| **core** | `packages/core/src/sources/repository.ts` — CRUD, `getEnabledSources`, URL/label validation, unique URL handling. |
| **core** | `packages/core/src/sources/repository.test.ts` — Vitest suite against temp SQLite files. |
| **core** | `packages/core/vitest.config.ts`, `packages/core/package.json` — test script and devDependencies (`vitest`, `electron` for ABI-compatible `better-sqlite3`). |
| **core** | `packages/core/src/index.ts`, `packages/core/tsconfig.json` — exports; exclude `*.test.ts` from `tsc`. |
| **app/main** | `packages/app/src/main/ipc/sources.ts` — `sources:list`, `sources:create`, `sources:update`, `sources:setPaused`, `sources:delete` with runtime boundary checks. |
| **app/main** | `packages/app/src/main/index.ts` — `registerSourceHandlers()`. |
| **app/renderer** | `packages/app/src/renderer/src/lib/api.ts` — `sourcesAPI` + result types. |
| **app/renderer** | `packages/app/src/renderer/src/components/SourcesView.tsx` — list, add (URL + explicit type + English-only default), rename/pause/delete, empty state. |
| **app/renderer** | `packages/app/src/renderer/src/components/Sidebar.tsx`, `App.tsx` — Sources nav and route. |

### Acceptance Criteria Status

| ID | Criterion | Status | Evidence |
|----|-----------|--------|----------|
| AC-1.1 | Add source with URL + explicit feed vs watch; optional URL hint; typecheck | **Pass** | Repository tests for `feed`/`watch`; `suggestSourceTypeFromUrl` pre-selects feed for `/feed`, `.xml`, `.rss`; radios require explicit choice; `pnpm typecheck` PASS. |
| AC-1.2 | Rename, pause/resume, delete; paused excluded from eligibility query | **Pass** | `getEnabledSources` test; UI actions wired to IPC. |
| AC-1.3 | Persists across restarts; same userData DB | **Pass** | Repository test closes DB and reopens same path; app uses existing `thinklish.db` init in main. |
| AC-1.4 | Delete source does not delete articles; safe delete only | **Pass** | Repository test: article count unchanged after `deleteSource`; delete SQL is single-table `DELETE`; UI copy explains library articles remain. |
| AC-1.5 | Empty state: English learning / steady reading, not RSS framing | **Pass** | Copy review: “Build a steady stream of English reading” + bilingual line emphasizing habit vs inbox. |
| AC-1.6 | `english_only` per source, default ON | **Pass** | Schema `DEFAULT 1`; repository default when omitted; tests; UI checkbox default checked. |
| AC-1.7 | Watch stores single listing URL; valid URL validation | **Pass** | Same `url` column; `new URL()` validation in repository; watch type in tests. |
| AC-1.8 | `created_at` on create; `last_success_at` nullable; UI shows both | **Pass** | Repository test; table columns “Created” / “Last OK” with em dash when null. |

### Decisions Made

- **Ordering**: `getAllSources` / `getEnabledSources` use `ORDER BY datetime(created_at) DESC, id DESC` so fast double-inserts still return a stable “newest first” order.
- **Core tests + native module**: System Node and Electron use different `NODE_MODULE_VERSION` for `better-sqlite3`. Core `test` script runs Vitest via `ELECTRON_RUN_AS_NODE=1 electron …` so tests load the same binary ABI as the packaged app rebuild.
- **IPC validation**: Handlers validate ids (positive integers), `paused` boolean, create/update payload shapes before calling core.
- **Type hint**: Internal `suggestSourceTypeFromUrl` in `SourcesView.tsx` only steers toward `feed` when the URL looks syndication-like; user always picks type via radios before save.

### TypeCheck Results

- `pnpm typecheck`: **PASS**

### Known Issues

- `./scripts/check_repo_docs.sh` fails in this workspace due to a missing referenced product spec (`tideglass-rss-reader.md`); unrelated to Sprint 1 code.
- Core `pnpm test` uses `ELECTRON_RUN_AS_NODE=1` (Unix-style env). Windows developers may need an equivalent (e.g. `cross-env`) if they run core tests locally.

### Test Results

- `pnpm --filter @thinklish/core test`: **PASS** (11 tests, `repository.test.ts`).
