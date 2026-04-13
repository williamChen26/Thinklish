# Sprint 3 — Round 2 changes (AC-5 refresh-all skipped summary)

## F3-AC5: ok / fail / skipped in refresh-all completion

### `@thinklish/shared`

- `RefreshAllResult` in `packages/shared/src/types/refresh-schedule.ts`: added required `skippedCount: number`.

### `@thinklish/app`

- `packages/app/src/main/services/feed-scheduler.ts`: after each `fetchFeed` in `refreshAll`, `skippedCount += result.skipped`; `RefreshAllResult` and `phase: 'completed'` progress `message` include skipped (e.g. `Done: N ok, M failed, K skipped`).
- `packages/app/src/main/ipc/sources.ts`: no-scheduler fallback result includes `skippedCount: 0`.
- `packages/app/src/renderer/src/components/SourcesView.tsx`: `lastRefreshSummary` shows ok, failed, and skipped counts.

### `@thinklish/core` (tests)

- `packages/core/src/ingestion/refresh-all-skipped.test.ts`: asserts skipped totals are summed across mixed ok/fail `FeedRefreshResult` values (mirrors main-process aggregation rule).

## Verification

- `pnpm typecheck` — pass.
- `pnpm --filter @thinklish/core test` — pass (38 tests).
