# Sprint 2 build log — F2 RSS/Atom ingestion

## Summary

Implemented manual per-source feed refresh, RSS/Atom parsing via `rss-parser` (async `parseString`), stub articles with lazy full extraction on open, URL/`feed_item_id` deduplication, English-only heuristic, metadata update policy for stub vs full rows, and UI hooks (Refresh, provenance badge, `last_error` display).

## Stub content convention

Until Readability runs, `content` / `content_html` hold the **feed title** plus **plain-text summary** (from `contentSnippet`, `summary`, or stripped `content`). `is_stub = 1`. Opening the article triggers `extractArticle` in the main process; on success `fillArticleFromExtraction` replaces body fields, updates title/domain/published_at from extraction, and sets `is_stub = 0`.

## English heuristic

Non-whitespace characters are scanned. Digits and a small set of ASCII punctuation are ignored for the ratio. Remaining characters that are **not** Unicode Latin script letters count as “non-Latin.” If more than **50%** of counted characters are non-Latin, the item is skipped when `englishOnly` is true.

## URL normalization

`normalizeArticleUrl`: parse as WHATWG URL, lowercase host, strip trailing slash on non-root paths, then `toString()` for comparisons and stored canonical `url` on new stubs.

## `feed_item_id`

Uses **trimmed `guid` when present**, otherwise the **normalized item link** (same string used for URL dedup).

## Files touched (high level)

| Area | Changes |
|------|---------|
| `packages/shared` | `Article` extended; `ArticleCreateInput` optional feed fields; `FeedRefreshResult` type |
| `packages/core` | Schema reorder (`ingestion_sources` before `articles` for FK), migration for existing DBs, `rss-parser` dependency, articles repo + join for `sourceLabel`, `ingestFeedXml` / `fetchFeed`, Vitest fixtures |
| `packages/app` | `sources:refreshFeed`, stub extraction + in-flight dedupe on `articles:getById`, Sources Refresh + `last_error`, article list badges |

## Tests

- `packages/core/src/ingestion/feed-fetcher.test.ts`: RSS + Atom fixtures, dedup, URL merge, English skip, full-body preservation on re-ingest, invalid XML → `last_error`, stub → full via `fillArticleFromExtraction`.
- Run: `pnpm --filter @thinklish/core test` (uses `ELECTRON_RUN_AS_NODE=1 electron` for better-sqlite3).

## Verification

- `pnpm typecheck` — passed (2026-04-10).
- `./scripts/check_repo_docs.sh` — failed in this workspace due to missing `docs/product-specs/tideglass-rss-reader.md` (pre-existing; unrelated to this sprint).

## Manual checklist (AC-2.3 / AC-2.7)

1. Add an enabled **feed** source with a real RSS URL → **Refresh** → new rows appear in Articles with **source label** badge and **Preview** when stub.
2. Open a stub article → wait for extraction → full reader content; second open should be fast (already full).
3. Break the feed URL or use invalid XML → Refresh → **error** in Sources row and banner; app stays usable.

## Notes

- `ingestFeedXml` is **async** because `rss-parser`’s `parseString` returns a **Promise** when no callback is passed.
- DB writes during ingestion run inside a **single transaction** per refresh; failure rolls back partial inserts and sets `last_error`.
