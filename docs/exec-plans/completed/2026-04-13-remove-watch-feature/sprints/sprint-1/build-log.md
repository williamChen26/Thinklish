# Build Log: Sprint 1 — Remove Watch Feature (F1 + F2)

## Round 1

### What Was Removed

**Files deleted (4):**
- `packages/core/src/ingestion/watch-fetcher.ts` — Watch link discovery and candidate ingestion
- `packages/core/src/ingestion/watch-fetcher.test.ts` — Watch fetcher tests
- `packages/core/src/ingestion/watch-url-store.ts` — Watch seen/dismissed URL persistence
- `packages/app/src/main/ipc/candidates.ts` — Candidate IPC handlers

**Shared types cleaned:**
- `IngestionSourceType` narrowed from `'feed' | 'watch'` to `'feed'`
- `watchBaselineComplete` removed from `IngestionSource`
- `candidateStatus` removed from `Article` and `ArticleCreateInput`
- `FeedSchedulerSourceState.sourceType` narrowed to `'feed'`

**Core layer cleaned:**
- `schema.ts` — Removed watch columns, candidate columns, watch tables; added `migrateRemoveWatchAndCandidates` cleanup migration
- `sources/repository.ts` — Removed `setWatchBaselineComplete`, `watchBaselineComplete` mapping
- `articles/repository.ts` — Removed candidate functions, `markWatchUrlDismissed` import, candidate status mapping
- `index.ts` — Removed watch/candidate exports
- `feed-discovery.ts` — Removed `isLikelySiteOrArticleUrl`
- `storage/retention.ts` — Removed candidate exclusion from eligible articles clause

**App layer cleaned:**
- `main/index.ts` — Removed `registerCandidateHandlers`
- `main/ipc/sources.ts` — Removed `sources:refreshWatch` handler; restricted to `sourceType: 'feed'`
- `main/ipc/feeds.ts` — Removed `suggestWatch` from `FeedDiscoverResult`
- `main/services/feed-scheduler.ts` — Removed watch paths; feed-only scheduling
- `renderer/src/lib/api.ts` — Removed `candidatesAPI`, `refreshWatch`, `suggestWatch`
- `renderer/src/App.tsx` — Removed `prefillWatchUrl` state
- `renderer/src/components/ArticlesView.tsx` — Removed watch suggestion strip, candidate badges
- `renderer/src/components/SourcesView.tsx` — Removed watch type, candidates panel, watch refresh

**Tests cleaned:**
- `feed-discovery.test.ts` — Removed `isLikelySiteOrArticleUrl` tests
- `retention.test.ts` — Removed candidate retention test
- `sources/repository.test.ts` — Removed watch source test cases
- `feed-scheduler-logic.test.ts` — Removed watch scheduling test

### Acceptance Criteria Status

| AC ID | Status | Notes |
|-------|--------|-------|
| AC-1 | Met | 4 files deleted, verified via `ls` |
| AC-2 | Met | `IngestionSourceType = 'feed'` only |
| AC-3 | Met | No `candidateStatus` in article types |
| AC-4 | Met | No `candidates:*` IPC channels |
| AC-5 | Met | No `suggestWatch` anywhere |
| AC-6 | Met | `migrateRemoveWatchAndCandidates` cleans existing data |
| AC-7 | Met | `pnpm typecheck` — 5/5 PASS |
| AC-8 | Met | 54 tests passed (7 test files) |
| AC-9 | Met | No `refreshWatch` references anywhere |

### TypeCheck Results

- `@thinklish/shared`: PASS
- `@thinklish/core`: PASS
- `@thinklish/app`: PASS (both node and web)

### Test Results

- `@thinklish/core`: 54 tests passed (reduced from 60 — 6 watch-specific tests removed)
