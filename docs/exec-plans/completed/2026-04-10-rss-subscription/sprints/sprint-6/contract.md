# Sprint 6 contract — F4 Synthetic / virtual feed (watched listing pages)

**Run:** `2026-04-10-rss-subscription`  
**Feature:** F4 — Synthetic / “virtual feed” path for non-RSS sites  
**Priority:** P1 · **Depends on:** F1, F3 (shares scheduling posture and backoff semantics)

## Product decisions (locked for this sprint)

1. **Watch target (v1):** exactly one listing-page URL per watch source (the source URL is the page to poll).
2. **Inbox semantics:** new discoveries are **candidate stubs**; the user must **accept** (or may **dismiss** noise). No auto-import into the “confirmed” library path.
3. **Opening:** opening a candidate in the reader uses the **same extraction path** as pasted URLs (stub → full content on first open); successful extraction clears candidate status.
4. **Dismiss persistence:** dismissing records the normalized URL so it is **not suggested again** for that watch source.
5. **Copy / expectations:** UI distinguishes **syndicated (RSS/Atom)** sources from **watched pages** (HTML link discovery, higher false-positive risk).

## Scope

### In scope

- DB: `articles.ingestion_candidate_status` (`NULL` | `'candidate'`), `watch_seen_urls`, `watch_dismissed_urls`, `ingestion_sources.watch_baseline_complete` (first successful snapshot without flooding candidates).
- Core: `watch-fetcher.ts` — fetch listing HTML, JSDOM link extraction, same-origin + path heuristics, footer link skip, English filter (reuse feed heuristic), baseline then diff, `refreshWatch(source)`.
- Shared: extend `Article` / `IngestionSource` types for candidate + watch baseline + joined `sourceType` on articles.
- Scheduler: watch sources participate in the **same** global/per-source posture rotation as feeds (`isSourceDue`, `computeSchedulerDelayMs`, `FeedScheduler` tick + refresh-all).
- IPC: `sources:refreshWatch`, `candidates:list`, `candidates:accept`, `candidates:dismiss`.
- UI: Sources — syndicated vs watched labels, per-source refresh for watch, posture override for watch, **Watch candidates** panel (open / accept / dismiss), articles list badges; `SourcesView` accepts optional `onOpenArticle` from `App` to open the reader.

### Out of scope

- Multi-URL watch scopes, sitemap crawling, visual “content changed” diff, ML classifiers, robots.txt enforcement UI, auth / paywall flows.

## Acceptance criteria mapping

| AC | Verification |
|----|----------------|
| 1 Register watch when no feed | F1 UI already allows `sourceType: watch`; this sprint wires discovery + refresh. |
| 2 New links → library entries for review | After baseline, new same-origin article-like links → `articles` rows with `candidateStatus: 'candidate'`. |
| 3 Open = same reading path | Reader uses existing `articles:getById` + extraction; `fillArticleFromExtraction` clears candidate status. |
| 4 Dismiss / bounded noise | Dismiss deletes stub + `watch_dismissed_urls`; user can accept good links. |
| 5 Copy distinguishes syndicated vs watched | Badges and source type labels in Sources + Articles. |

## Technical notes

- **Retention:** candidate stubs are excluded from automatic retention deletes until accepted (then normal imported rules apply).
- **Dedup:** `feed_item_id` pattern `watch:<normalizedUrl>` per watch source; global `findArticleByNormalizedUrl` prevents duplicate stubs if the URL already exists in the library.
- **Tests:** `extractWatchLinkCandidates` unit tests; `refreshWatch` integration with mocked `fetch`; retention test for candidate exclusion.

## Definition of done

- `pnpm typecheck` passes at repo root.
- Core tests green including new watch + retention coverage.
- Sprint `build-log.md` lists files touched and any follow-ups.
