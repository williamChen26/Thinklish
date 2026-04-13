# Sprint 6 build log — F4 Virtual feed / watch listing pages

## Summary

Implemented watched listing-page ingestion: HTML fetch, JSDOM link extraction with heuristics, first-run baseline (`watch_baseline_complete` + `watch_seen_urls`), subsequent **candidate** article stubs, dismiss persistence (`watch_dismissed_urls`), IPC for refresh/accept/dismiss/list, scheduler parity with feeds, and UI for review plus syndicated vs watched copy.

## Files touched

### Shared

- `packages/shared/src/types/article.ts` — `sourceType`, `candidateStatus` on `Article`; `candidateStatus` on `ArticleCreateInput`.
- `packages/shared/src/types/ingestion-source.ts` — `watchBaselineComplete`.
- `packages/shared/src/feed-scheduler-logic.ts` — `isSourceDue` / `computeSchedulerDelayMs` include `watch`.

### Core

- `packages/core/package.json` — `jsdom`, `@types/jsdom`.
- `packages/core/src/database/schema.ts` — migrations + indexes for candidate column, watch tables, `watch_baseline_complete`.
- `packages/core/src/articles/repository.ts` — join `source_type`, candidate CRUD, `listCandidateArticles`, `acceptWatchCandidateArticle`, `dismissWatchCandidateArticle`, `createArticle` / `fillArticleFromExtraction` candidate handling.
- `packages/core/src/sources/repository.ts` — map `watch_baseline_complete`, `setWatchBaselineComplete`.
- `packages/core/src/ingestion/watch-url-store.ts` — seen / dismissed URL helpers.
- `packages/core/src/ingestion/watch-fetcher.ts` — `extractWatchLinkCandidates`, `refreshWatch`, `ingestWatchLinks`.
- `packages/core/src/ingestion/watch-fetcher.test.ts` — extraction + two-phase refresh tests.
- `packages/core/src/storage/retention.ts` — exclude `ingestion_candidate_status = 'candidate'` from cleanup eligibility.
- `packages/core/src/storage/retention.test.ts` — candidate retention exclusion.
- `packages/core/src/index.ts` — exports for watch + candidates.

### App (Electron + renderer)

- `packages/app/src/main/index.ts` — register candidate IPC.
- `packages/app/src/main/ipc/sources.ts` — `sources:refreshWatch`.
- `packages/app/src/main/ipc/candidates.ts` — `candidates:list|accept|dismiss`.
- `packages/app/src/main/services/feed-scheduler.ts` — schedule + tick + refresh-all for watch; call `refreshWatch`.
- `packages/app/src/renderer/src/lib/api.ts` — `sourcesAPI.refreshWatch`, `candidatesAPI`.
- `packages/app/src/renderer/src/lib/source-schedule-hint.ts` — watch uses same schedule copy as feeds.
- `packages/app/src/renderer/src/components/SourcesView.tsx` — watch refresh, posture for watch, candidates panel, syndicated/watched labels, optional `onOpenArticle`.
- `packages/app/src/renderer/src/components/ArticlesView.tsx` — candidate + syndicated + watched badges; copy tweak.
- `packages/app/src/renderer/src/App.tsx` — pass `onOpenArticle` into `SourcesView`.

### Docs (this sprint)

- `docs/exec-plans/active/2026-04-10-rss-subscription/sprints/sprint-6/contract.md`
- `docs/exec-plans/active/2026-04-10-rss-subscription/sprints/sprint-6/build-log.md`

### Lockfile

- `pnpm-lock.yaml` — updated for core `jsdom` dependency.

## Verification

- `pnpm install --no-frozen-lockfile`
- `pnpm typecheck` (root)
- `pnpm --filter @thinklish/core test` — all passing including new tests.

## Follow-ups (not in this sprint)

- Tune link heuristics per real-world sites; optional allowlist/blocklist UX.
- Consider surfacing “baseline complete” or last candidate count in source detail.
- Optional: `pnpm exec ./scripts/check_repo_docs.sh` before release (repo convention).
