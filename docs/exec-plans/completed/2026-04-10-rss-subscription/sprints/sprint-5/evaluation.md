# Sprint 5 evaluation — F5: Storage governance

**Run:** `2026-04-10-rss-subscription`  
**Rubric:** `sprints/sprint-5/contract.md` only (`build-log.md` used for cross-check, not as the acceptance source).  
**Verdict:** **PASS**

## Hard thresholds

| Gate | Required | Evidence | Result |
|------|------------|----------|--------|
| Typecheck | `pnpm typecheck` passes | Executed 2026-04-13: turbo typecheck all packages (`@thinklish/shared`, `@thinklish/core`, `@thinklish/app`), exit 0 | **PASS** |
| Core tests | `pnpm --filter @thinklish/core test` passes | Executed 2026-04-13: 6 files, **48** tests, exit 0 | **PASS** |
| Build log | `build-log.md` present for sprint | `sprints/sprint-5/build-log.md` exists, lists key paths and verification | **PASS** |

## Contract scope vs implementation

### 1. Global retention policy (three knobs, persisted)

**Contract:** `maxUnreadImportedAgeDays` (0 = off), `maxImportedTotal` (0 = off), `perSourceImportedCap` (0 = off); persisted in SQLite `app_settings`.

**Evidence:** `setRetentionPolicy` / `getRetentionPolicy` read and write JSON under `retention_policy` via `getSetting` / `setSetting`; `parsePolicy` and `setRetentionPolicy` clamp ranges (`retention.ts` ~11–49). Renderer **Library and storage** exposes three number fields, **Save policy** calls `storageAPI.setRetentionPolicy` (`SourcesView.tsx` ~777–838).

**AC1:** **PASS**

### 2. Retention cleanup + lookup protection

**Contract:** `runRetentionCleanup()` removes candidates per policy; **never** deletes articles with any lookup (cards hang off lookups).

**Evidence:** Eligibility is centralized in `eligibleNoLookupsClause` (`NOT EXISTS … lookups l WHERE l.article_id = a.id`) and reused for age, per-source cap, and global cap queries (`retention.ts` ~52–118, ~152–167). Vitest covers: old unread stub without lookups deleted; stub with lookup retained (`retention.test.ts` ~46–104).

**AC2:** **PASS**

### 3. Cleanup preview (counts + protected stub line when age rule on)

**Contract:** Preview shows articles to delete; optional line for stubs past age threshold that still have lookups when age rule is on.

**Evidence:** `getRetentionCleanupPreview` returns `wouldDelete` (union of candidate ids) and `protectedStubsPastAgeWithLookups` when `maxUnreadImportedAgeDays > 0` (`retention.ts` ~129–149). UI **Preview cleanup** builds an alert with delete count, explicit lookup protection copy, and the protected-stub count when the age rule is enabled (`SourcesView.tsx` ~258–276).

**AC3:** **PASS**

### 4. Per-source bulk delete (preview, confirm, typed confirmation)

**Contract:** `deleteArticlesBySource(sourceId)`; IPC `sources:deleteWithArticlesPreview` + `sources:deleteWithArticles`; preview for confirm dialog (articles, how many had lookups).

**Evidence:** Core `getSourceArticlesDeleteImpact` / `deleteArticlesBySource` (`retention.ts` ~202–239). Main process registers both channels with id validation (`sources.ts` ~175–198). UI: preview → `window.confirm` with counts → `window.prompt('Type DELETE…')` → invoke delete (`SourcesView.tsx` ~310–338, detail row button ~698–709).

**AC4:** **PASS**

### 5. Storage stats (imported vs manual, approximate bytes)

**Contract:** `getStorageStats()`: counts and approximate byte sums from text column `length`, split imported (`source_id NOT NULL`) vs manual (`source_id IS NULL`).

**Evidence:** Single aggregate query sums counts and `length(url) + length(title) + …` per branch (`retention.ts` ~170–199). UI shows imported vs pasted/manual counts and `formatApproxBytes` (`SourcesView.tsx` ~757–774). Test asserts split counts and positive byte sums (`retention.test.ts` ~178–203).

**AC5:** **PASS**

### 6. IPC surface

**Contract:** `storage:getStats`, `storage:getRetentionPolicy`, `storage:setRetentionPolicy`, `storage:getCleanupPreview`, `storage:runCleanup`, `sources:deleteWithArticlesPreview`, `sources:deleteWithArticles`.

**Evidence:** `registerStorageHandlers()` implements the five `storage:*` handlers (`storage.ts` ~21–56); `registerSourceHandlers` (or equivalent) adds `sources:deleteWithArticles*` (`sources.ts` ~175–198). `packages/app/src/main/index.ts` calls `registerStorageHandlers()` (~75).

**Result:** **PASS**

### 7. Definition of done (repo gates)

Contract requires typecheck, core tests, and build-log update — all satisfied (see Hard thresholds and `build-log.md`).

**Result:** **PASS**

## Notes (non-blocking)

- **Test coverage gap:** `protectedStubsPastAgeWithLookups` is implemented and wired through preview IPC/UI but has no dedicated unit test asserting the count matches seeded data; behavior is still covered indirectly by “stub with lookup not deleted” and manual UI verification.
- **Cleanup implementation:** retention deletes rows with `DELETE FROM articles WHERE id = ?` inside a transaction loop; correct for SQLite and contract scope; very large candidate sets could be optimized later with batched SQL if needed (out of contract).

## Summary

Sprint 5 delivers persisted global retention knobs, safe cleanup excluding any article with lookups, preview and confirmation flows, per-source article purge with impact preview and typed `DELETE` confirmation, imported vs manual storage stats, and the required IPC plus **Library and storage** UI on Sources. Automated gates pass; **no `feedback.md`** required for this round.
