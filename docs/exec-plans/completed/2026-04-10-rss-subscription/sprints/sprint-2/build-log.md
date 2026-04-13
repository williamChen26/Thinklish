# Build Log: Sprint 2 — RSS/Atom Ingestion

## Round 1

### What Was Built

- **Article model extensions:** `sourceId`, `feedItemId`, `isStub`, `sourceLabel` (denormalized for UI via SQL join).
- **Repository:** feed-aware finders, `applyFeedItemToExistingArticle` (conditional updates for stub vs full), `fillArticleFromExtraction`.
- **Ingestion pipeline:** `url-normalize`, `english-heuristic`, `ingestFeedXml`, `fetchFeed` with bounded HTTP client behavior and structured `FeedRefreshResult`.
- **Wire-up:** `sources:refreshFeed` invokes `fetchFeed`; articles IPC gains stub **hydration** on `getArticleById`.
- **Articles UI:** source badge + **Preview** marker for stubs.

### Acceptance Criteria Status (table)

| AC ID | Status | Notes |
|-------|--------|-------|
| F2-AC1 | Met | RSS + Atom tests create list rows; renderer lists all articles. |
| F2-AC2 | Met | Re-ingest updates in place, no row explosion. |
| F2-AC3 | Met | Provenance columns + joined label. |
| F2-AC4 | Met | Full article protected from feed title/body overwrite on re-ingest. |
| F2-AC5 | Met | Parse/fetch failures return `ok: false` and populate `last_error`. |
| F2-AC6 | Met | Normalized URL merge attaches `sourceId` / `feedItemId`. |
| F2-AC7 | Met | `englishOnly` skips likely non-English titles/snippets. |

### Decisions Made

- **Stub-first list:** feed provides title/summary only until user opens article (lazy extraction per product spec).
- **Identity:** prefer `guid` string when present; else normalized item link.
- **Transaction:** per-feed batch in single SQLite transaction for consistency and performance.

### TypeCheck Results

- `@thinklish/core`: `pnpm typecheck` — **PASS**
- `@thinklish/app`: `pnpm typecheck` — **PASS**

### Known Issues

- `findArticleByNormalizedUrl` scans articles in JS for normalized match — acceptable for v1 volume; may need indexing strategy at scale.
- No automatic periodic refresh yet (F3).

### Test Results

- `@thinklish/core` — `vitest run src/ingestion/feed-fetcher.test.ts` (includes dedupe, merge, English filter, invalid XML, stub→full): **PASS** (8 tests in file; full sources + feed suite **19 tests** when run with `repository.test.ts`).

## ⚠️ Errata (HF1 — Post-Sprint Hotfix)

**问题**: `CREATE INDEX idx_articles_feed_item_id` 在主 `db.exec()` 块中于迁移函数之前执行，导致已有数据库（无 `feed_item_id` 列）启动崩溃。
**修复**: 从主 `db.exec()` 块中移除该索引创建语句，改由迁移函数之后的独立 `db.exec()` 调用创建。

详见 [`hotfixes/hotfix-log.md`](../../hotfixes/hotfix-log.md).
