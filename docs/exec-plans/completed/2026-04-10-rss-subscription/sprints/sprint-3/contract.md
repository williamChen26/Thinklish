# Sprint 3 Contract: Scheduled Refresh, Fairness, and UI Non-Interference (F3)

## Feature

**F3 — Scheduled refresh, fairness, and UI non-interference.** Background ingestion runs on a **timer-driven scheduler** with **coarse global refresh posture** (e.g. manual-only, relaxed, normal) and optional **per-source override** if needed for v1. Work is **chunked / yielded** so the renderer stays responsive during reading. When many feeds are enabled, the scheduler **round-robins** sources so one noisy feed cannot starve others beyond documented bounds. **Backoff** (stepped or exponential) applies after repeated HTTP/parse failures, with user-visible status (e.g. temporarily paused / retry after). Users can run **manual refresh** for one source (existing) and **refresh all** with **progress** and a **completion summary**. Paused sources and manual-only mode must not run scheduled fetches.

## Scope

- **Settings / persistence:** store global default refresh band (and optional per-source override schema if product chooses); migrate safely in SQLite.
- **Scheduler core:** pure or testable module that, given clock + enabled sources + posture + backoff state, decides **which source** to tick next (round-robin), **when** the next global tick is allowed, and **whether** a source is currently blocked by backoff.
- **Main process runner:** `setInterval` / `setTimeout` or equivalent loop that invokes `fetchFeed` (or batched subset) **off the critical UI path**, respects concurrency limits, and reports progress events for “refresh all”.
- **IPC / preload:** APIs for reading/updating refresh settings, triggering manual refresh-all, subscribing to progress (events or invoke polling — contract TBD in implementation), and surfacing scheduler/backoff status fields needed by UI.
- **Renderer:** minimal surfaces for global posture (and per-source override if in scope), “refresh all” with progress + summary, and display of next run / backoff / last error aligned with spec F6 overlap (status strings may be shared with Sources view).

## Out of Scope

- Synthetic watch crawling (F4), storage caps (F5), OPML / discovery (F7).
- Replacing `rss-parser` or changing stub/full extraction semantics (F2).
- Cross-device sync of scheduler state.

## Acceptance Criteria (table with ID, Criterion, Verification Method)

| ID | Criterion | Verification Method |
|----|-----------|---------------------|
| F3-AC1 | User can set a **global default** refresh posture (manual / relaxed / normal); optional per-source override documented if shipped. | Manual + unit: settings repo / IPC; persisted value survives restart. |
| F3-AC2 | During active use, background ingestion **does not cause sustained UI stalls**; work is chunked or deferred per agreed budget. | Manual smoke + unit/integration timing hooks; main process does heavy fetch/parse, renderer receives incremental updates only. |
| F3-AC3 | With many enabled sources, scheduler **rotates** attention (round-robin) within documented max skew. | Unit tests on scheduler logic with synthetic clocks and source lists. |
| F3-AC4 | Repeated failures → **backoff** + **actionable** status string stored or emitted. | Unit: failure counter transitions; UI or IPC exposes message (“retry after …” / “paused after failures”). |
| F3-AC5 | **Manual refresh all** runs across enabled feed sources with **visible progress** and **completion summary** (counts ok/fail/skipped). | Manual + unit: aggregate `FeedRefreshResult` simulation / integration test. |
| F3-AC6 | **Paused** sources and **manual-only** global mode perform **no scheduled** automatic fetches. | Unit: scheduler does not select paused sources; manual mode disables timer ticks except explicit user actions. |

## Technical Approach (brief)

Persist refresh posture in SQLite settings table or keyed row. Maintain in-memory (or persisted) per-source **failure streak** and **next_allowed_at**. Main-process loop: small tick handler picks next eligible source ID, calls existing `fetchFeed`, updates backoff from `FeedRefreshResult`, emits progress for bulk operations. Use `setImmediate` / micro-batching between sources during refresh-all to avoid long IPC blocking. Reuse F2 `fetchFeed` / F1 status fields.

## Dependencies

- **F1:** `getEnabledSources`, pause semantics, `last_error` / `last_success_at`.
- **F2:** `fetchFeed`, `FeedRefreshResult`.

## Cross-package type changes

- **`@thinklish/shared`:** refresh posture enum / settings DTOs (exact names TBD in implementation).
- **`@thinklish/core`:** settings repository + exported scheduler helpers/tests.
- **`@thinklish/app`:** main bootstrap for timers + IPC + renderer controls.

## Estimated Complexity

**Medium–high** — concurrency, fairness, backoff state machine, and UX for progress must be designed and tested without regressing F2 behavior.
