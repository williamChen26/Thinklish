# Sprint 3 build log — F3 scheduled refresh, fairness, UI non-interference

## Summary

Implemented global and per-source refresh posture, SQLite-backed settings, exponential backoff with persisted failure streaks, a main-process `FeedScheduler` using dynamic `setTimeout` and round-robin source selection, IPC for posture and refresh-all with progress events, and renderer controls in Sources.

## Packages touched

### `@thinklish/shared`

- Added `packages/shared/src/types/refresh-schedule.ts`: `RefreshPosture`, `RefreshProgressEvent`, `RefreshAllResult`, `RefreshProgressPhase`.
- Extended `IngestionSource` with `refreshPosture`, `consecutiveFailures`, `lastAttemptAt`; `IngestionSourceUpdateInput.refreshPosture`.
- Re-exported refresh types from `index.ts`.

### `@thinklish/core`

- **Schema:** `ingestion_sources.refresh_posture`, `consecutive_failures`, `last_attempt_at`; new `app_settings` table; idempotent migrations for existing DBs.
- **Settings:** `packages/core/src/settings/repository.ts` — `getSetting`, `setSetting`, `getGlobalRefreshPosture` (default `normal`), `setGlobalRefreshPosture`.
- **Sources repository:** mapping for new columns; `recordSourceAttempt`, `recordSourceFailure`, `resetSourceFailures`; `recordSourceFeedSuccess` clears failures; `recordSourceFeedFailure` delegates to `recordSourceFailure` (increment + `last_error`); `updateSource` supports `refreshPosture`.
- **Scheduler logic:** `packages/core/src/ingestion/feed-scheduler-logic.ts` — intervals (manual ∞, relaxed 2h, normal 30m), `getEffectivePosture`, `getEffectiveIntervalMs`, `getBackoffMultiplier` (cap 48×), `getNextDueTime`, `isSourceDue`, `pickNextSource`, `computeSchedulerDelayMs`.
- **Feed fetcher:** `recordSourceAttempt` after each attempt path (success/failure) alongside existing success/failure updates.
- **Exports:** scheduler helpers + settings + new repository functions from `src/index.ts`.
- **Tests:** `feed-scheduler-logic.test.ts`; `repository.test.ts` extended for new defaults.

### `@thinklish/app`

- **Main:** `services/feed-scheduler.ts` — `FeedScheduler` (`start`, `stop`, `reschedule`, `refreshAll`), `createAndRegisterFeedScheduler`, `getFeedScheduler`; attaches per window on `did-finish-load` / `closed` + macOS `activate`.
- **IPC:** `sources:getGlobalPosture`, `sources:setGlobalPosture`, `sources:refreshAll`; main → renderer `sources:refreshProgress`; reschedule hooks after source mutations.
- **Renderer:** `api.ts` wrappers; `SourcesView` global posture selector, refresh-all with progress bar, per-source posture override, backoff column.

## Verification

- `pnpm typecheck` — pass (all three packages).
- `pnpm --filter @thinklish/core test` — pass (35 tests).
- `./scripts/check_repo_docs.sh` — failed in this workspace due to pre-existing missing `docs/product-specs/tideglass-rss-reader.md` (not introduced by this sprint).

## Round 2 (2026-04-13) — F3-AC5 skipped aggregate

Evaluator Round 2 feedback: refresh-all completion must surface **ok / fail / skipped** (aggregate `skipped` from each `fetchFeed`).

### Changes

- `RefreshAllResult.skippedCount` in `@thinklish/shared`.
- `FeedScheduler.refreshAll`: `skippedCount += result.skipped` per feed; IPC `completed` message and returned summary include skipped.
- `SourcesView` completion line shows all three counts.
- Core test `refresh-all-skipped.test.ts` guards skipped aggregation across mixed success/failure results.
- IPC `sources:refreshAll` early return when scheduler is absent includes `skippedCount: 0`.

### Verification

- `pnpm typecheck` — pass.
- `pnpm --filter @thinklish/core test` — pass (38 tests).

Details: `sprints/sprint-3/iterations/round-2/changes.md`.

## Commits

Three commits: shared → core → app (including this build log).
