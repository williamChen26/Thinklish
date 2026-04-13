# Sprint 3 evaluation — F3 scheduled refresh, fairness, UI non-interference

**Evaluator:** contract-only, evidence-based, no code changes in this pass.  
**Contract:** `sprints/sprint-3/contract.md`  
**Build log (cross-reference only):** `sprints/sprint-3/build-log.md`

## Tooling (independent)

| Command | Result |
|---------|--------|
| `pnpm typecheck` | **PASS** (exit 0; turbo typecheck all packages) |
| `pnpm --filter @thinklish/core test` | **PASS** (exit 0; Vitest 3 files, **36** tests passed) |

Hard threshold: typecheck PASS. Core tests PASS.

## Overall verdict: **FAIL**

One acceptance criterion fails the explicit contract text (**F3-AC5**). Per harness rules, **single FAIL = sprint FAILS**.

---

## AC-by-AC grading

### F3-AC1 — Global default refresh posture (manual / relaxed / normal); optional per-source override

**Verdict: PASS**

**Evidence**

- Persistence: `app_settings` + `getGlobalRefreshPosture` / `setGlobalRefreshPosture` in `packages/core/src/settings/repository.ts` (default `'normal'` when unset/invalid).
- Schema: `app_settings` table in `packages/core/src/database/schema.ts`.
- IPC: `sources:getGlobalPosture`, `sources:setGlobalPosture` in `packages/app/src/main/ipc/sources.ts` with posture validation.
- Renderer: global `<select>` in `packages/app/src/renderer/src/components/SourcesView.tsx` (`POSTURE_OPTIONS`, `handleGlobalPostureChange`).
- Per-source override: `ingestion_sources.refresh_posture`, `IngestionSource.refreshPosture`, `updateSource` branch for `refreshPosture`, UI per-row select (“Default” / posture), documented in UI `title` on override control.

---

### F3-AC2 — Background work does not cause sustained UI stalls; chunked / deferred per budget

**Verdict: PASS**

**Evidence**

- Scheduled and bulk refresh run in the **main** process: `FeedScheduler` in `packages/app/src/main/services/feed-scheduler.ts` calls `@thinklish/core` `fetchFeed` (network + parse off renderer path).
- Renderer receives **events only** (`sources:refreshProgress` via `sendProgress`, subscribed in `sourcesAPI.onRefreshProgress`).
- Refresh-all **yields** between sources: `await new Promise((resolve) => setTimeout(resolve, 0))` between iterations in `refreshAll` (`feed-scheduler.ts`).
- Scheduler ticks **one source** per wake (`runTick` → single `fetchFeed`).

No automated “UI stall” test was found; contract verification allows manual smoke + structural separation, which the code satisfies.

---

### F3-AC3 — Many enabled sources: scheduler **rotates** (round-robin) within documented max skew

**Verdict: PASS**

**Evidence**

- Pure selection: `pickNextSource` in `packages/core/src/ingestion/feed-scheduler-logic.ts` — filters due sources, sorts by `id`, picks next `id` after `lastRefreshedId` (wrap to smallest id).
- Unit tests: `feed-scheduler-logic.test.ts` — `round-robins by id after lastRefreshedId`, `skips non-due sources in rotation`, synthetic `nowMs` / ISO timestamps.

**Note:** There is no separate product/design doc in-repo stating a numeric “max skew” bound beyond implied RR among **due** feeds. The contract’s **verification method** for this row is unit tests on scheduler logic; those are present and green.

---

### F3-AC4 — Repeated failures → backoff + actionable status (“retry after …” / “paused after failures”)

**Verdict: PASS**

**Evidence**

- Backoff: `getBackoffMultiplier` (exponential, cap 48) and `getNextDueTime` combine interval × multiplier in `feed-scheduler-logic.ts`; tests in `feed-scheduler-logic.test.ts` (`getBackoffMultiplier`, `getNextDueTime`, `isSourceDue` before/after window).
- Persistence: `recordSourceFeedFailure` → `recordSourceFailure` increments `consecutive_failures`, sets `last_error` in `packages/core/src/sources/repository.ts`; success path clears via `recordSourceFeedSuccess`.
- Attempts: `recordSourceAttempt` on success/failure paths in `feed-fetcher.ts`.
- UI: `lastError` under URL; “Backoff” column shows failure streak + relative last attempt in `SourcesView.tsx`.

Status strings are mostly raw HTTP/parse errors rather than templated “Retry after …”; contract uses **e.g.** wording; stored `last_error` + failure count meet “actionable” bar.

---

### F3-AC5 — Manual **refresh all**: enabled feeds, **visible progress**, **completion summary (counts ok / fail / skipped)**

**Verdict: FAIL**

**Evidence (contract gap)**

- Shared type `RefreshAllResult` in `packages/shared/src/types/refresh-schedule.ts` defines only `successCount`, `failCount`, `errors` — **no skipped aggregate**.
- `FeedScheduler.refreshAll` in `packages/app/src/main/services/feed-scheduler.ts` increments success/fail only; ignores `FeedRefreshResult.skipped` from each `fetchFeed` result.
- Completion IPC message: `` `Done: ${successCount} ok, ${failCount} failed` `` — **no skipped**.
- Renderer `SourcesView.tsx` `lastRefreshSummary`: `` `${summary.successCount} succeeded, ${summary.failCount} failed` `` — **no skipped**.

Per-feed `FeedRefreshResult` in `packages/shared/src/types/feed.ts` includes `skipped`, but refresh-all does not surface an aggregate **skipped** count in the completion summary, which the contract table explicitly requires.

---

### F3-AC6 — Paused sources and manual-only global mode: **no scheduled** automatic fetches

**Verdict: PASS**

**Evidence**

- Paused: `isSourceDue` returns false when `source.status !== 'enabled'` (`feed-scheduler-logic.ts`); `enabledFeedStates` / tick paths use enabled sources; `pickNextSource` never selects paused.
- Global manual: `getEffectiveIntervalMs('manual')` is `Infinity` → `getNextDueTime` → `Infinity` → `isSourceDue` false for sources **inheriting** global manual (test: `isSourceDue` … `'manual'` … false).
- `computeSchedulerDelayMs` skips non-finite intervals; when all schedulable feeds are manual-effective, delay is `null` → `FeedScheduler.scheduleNext` returns without scheduling a timer (`feed-scheduler.ts`).

**Caveat (document for product, not used to flip AC):** A per-source posture override of `relaxed`/`normal` while global is `manual` can still produce finite intervals and scheduled ticks. The AC text stresses “manual-only **global** mode”; if the product intent is a **hard** global stop, implementation would need to change; if override is intentional, the contract may need clarification in a future revision.

---

## Summary table

| AC ID   | Verdict |
|---------|---------|
| F3-AC1  | PASS    |
| F3-AC2  | PASS    |
| F3-AC3  | PASS    |
| F3-AC4  | PASS    |
| F3-AC5  | **FAIL** |
| F3-AC6  | PASS    |

## Follow-up for harness

Sprint **FAIL**. Address **F3-AC5** (aggregate and display **skipped** in refresh-all result + UI + completion message, aligned with `FeedRefreshResult.skipped` semantics). See `sprints/sprint-3/iterations/round-2/feedback.md`.
