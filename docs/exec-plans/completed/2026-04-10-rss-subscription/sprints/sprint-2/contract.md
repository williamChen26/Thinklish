# Sprint 2 Contract: RSS/Atom Ingestion into Unified Article Library (F2)

## Feature

**F2 — RSS/Atom ingestion.** For `feed`-type sources, the app fetches feed XML, parses RSS and Atom via `rss-parser`, and creates or updates **stub articles** (title + summary) in the same `articles` table used for pasted URLs. Deduplication uses **`feed_item_id`** (guid when present, else normalized link) and **normalized URL** merge with existing rows. English-only sources skip likely non-English items (`isLikelyEnglishText`). Failures record `last_error` and return `FeedRefreshResult` without crashing. Opening a stub article triggers **lazy Readability extraction** in the main process.

## Scope

- **Shared:** `Article` extended with `sourceId`, `feedItemId`, `isStub`, `sourceLabel` (joined for lists); `ArticleCreateInput` optional fields; `FeedRefreshResult` (`ok`, counts, `error`).
- **Schema / articles repo:** insert with provenance; `getAllArticles` / `getArticleById` join `ingestion_sources` for `sourceLabel`; `findArticleByFeedItem`, `findArticleByNormalizedUrl`; `applyFeedItemToExistingArticle` (stub refresh vs preserved full body); `fillArticleFromExtraction` clears stub.
- **Ingestion:** `normalizeArticleUrl`; `english-heuristic`; `ingestFeedXml` + `fetchFeed` (HTTP fetch with timeout, Accept headers, User-Agent); transactional upsert loop; `recordSourceFeedSuccess` / `recordSourceFeedFailure`.
- **IPC:** `articles:getById` loads stub then runs `extractArticle` + `fillArticleFromExtraction` (deduped in-flight per id).
- **UI:** `ArticlesView` shows `sourceLabel` chip and **Preview** when `isStub`; same list as paste/manual flows.

## Out of Scope

- Background scheduler, fairness, backoff, global refresh bands (F3).
- Watch-target / synthetic feed crawling (F4).
- Storage caps / retention (F5).
- OPML, feed discovery (F7), multi-device sync.

## Acceptance Criteria (table with ID, Criterion, Verification Method)

| ID | Criterion | Verification Method |
|----|-----------|---------------------|
| F2-AC1 | Valid RSS/Atom produces **articles** visible in the primary article list. | Unit: `feed-fetcher.test.ts` RSS + Atom fixtures → `getAllArticles`; UI shows new rows with source label. |
| F2-AC2 | Re-ingestion **does not duplicate** the same logical item. | Unit: second `ingestFeedXml` pass yields `inserted: 0`, `updated: N`, row count stable. |
| F2-AC3 | **Provenance:** articles carry source association and stable feed identity. | Code: `source_id`, `feed_item_id`, list query `source_label`; tests assert `sourceId` / `feedItemId`. |
| F2-AC4 | **Update policy:** feed metadata updates stubs; **full** articles keep extracted body/title on re-ingest when feed title changes. | Unit: `fillArticleFromExtraction` then changed RSS; assert content/title unchanged for full row. |
| F2-AC5 | Malformed feed / bad HTTP → **graceful** failure, source-level error, no throw from public API. | Unit: invalid XML → `ok: false`, `lastError` set; `fetchFeed` catches network errors. |
| F2-AC6 | **URL merge:** pasted article same URL as feed item attaches metadata without second row. | Unit: pre-create article + ingest → `inserted`/`updated` counts and merged `sourceId` / `feedItemId`. |
| F2-AC7 | **English filter** respects `source.englishOnly`. | Unit: mixed-language fixture skips non-English item when flag true. |

## Technical Approach (brief)

`rss-parser` for XML → items; link resolution supports string or Atom `link.href`; `computeFeedItemId(guid, normalizedLink)`. Stub HTML built with minimal escaping. SQLite **transaction** wraps per-feed upsert batch. `fetch` with `AbortSignal.timeout(25000)`. Lazy full text: IPC `getArticleById` triggers extraction pipeline once per stub load.

## Dependencies

- **F1:** `IngestionSource`, `createSource` / status fields, `recordSourceFeed*` helpers, `sources:refreshFeed` entry point.
- **Existing extraction:** `extractArticle` in app main services.

## Cross-package type changes

- **`@thinklish/shared`:** `article.ts`, `feed.ts` (`FeedRefreshResult`).
- **`@thinklish/core`:** articles repository + ingestion modules exported via package index as needed by app.

## Estimated Complexity

**Medium** — parser edge cases, dedupe rules, stub vs full lifecycle, and IPC lazy-load coordination.
