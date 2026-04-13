# Round 2 feedback — Sprint 3 (Evaluator)

**Verdict driver:** F3-AC5 **FAIL** — completion summary must include counts **ok / fail / skipped**.

## Required changes (contract-shaped)

1. **`RefreshAllResult` (`@thinklish/shared`)**  
   Add a field for aggregate skipped count (name TBD but semantically “skipped”, e.g. `skippedCount` or `skippedItemCount`) consistent with per-feed `FeedRefreshResult.skipped` (items skipped during ingestion, not duplicate semantics).

2. **`FeedScheduler.refreshAll` (`packages/app/src/main/services/feed-scheduler.ts`)**  
   After each `fetchFeed`, accumulate `result.skipped` into the summary object. Include the new field in the final `RefreshAllResult` and in the `phase: 'completed'` progress `message` (or keep message human-readable but ensure the structured result is complete).

3. **Renderer (`SourcesView.tsx`)**  
   Extend `lastRefreshSummary` (and any inline completion text) to show all three counts so users see **ok / fail / skipped** as in the contract.

4. **Tests (recommended)**  
   Add a small unit or integration-level test that simulates `FeedRefreshResult` values with non-zero `skipped` and asserts the aggregated summary (core helper or app-level test as appropriate) so AC5 does not regress.

## Non-blocking note

- **F3-AC6 vs per-source override:** Confirm product rule when global posture is `manual` but a source has `relaxed`/`normal` override. Current scheduler uses **effective** posture; document intended behavior in spec or enforce global ceiling in code if a hard stop is required.
