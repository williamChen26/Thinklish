# Sprint 6 evaluation — F4: Synthetic / virtual feed (watched listing pages)

**Run:** `2026-04-10-rss-subscription`  
**Rubric:** `sprints/sprint-6/contract.md` only (`build-log.md` used for cross-check, not as the acceptance source).  
**Verdict:** **PASS**

## Hard thresholds

| Gate | Required | Evidence | Result |
|------|------------|----------|--------|
| Typecheck | `pnpm typecheck` passes at repo root | Confirmed in-session (parent verification); contract Definition of done | **PASS** |
| Core tests | Core tests green including watch + retention coverage | Confirmed in-session: **51** tests pass (`pnpm --filter @thinklish/core test`); includes `watch-fetcher.test.ts`, `retention.test.ts` extensions per build log | **PASS** |
| Build log | `build-log.md` lists files touched and follow-ups | `sprints/sprint-6/build-log.md` present, complete file list + verification notes | **PASS** |

## Acceptance criteria (contract mapping)

### AC1 — Register watch when no feed; discovery + refresh wired

**Contract:** F1 already allows `sourceType: watch`; this sprint wires discovery and refresh.

**Evidence:** `refreshWatch` gates on `sourceType === 'watch'` and `status === 'enabled'` (`watch-fetcher.ts` ~215–227). Main `sources:refreshWatch` and scheduler call paths are listed in `build-log.md` (`sources.ts`, `feed-scheduler.ts`). Renderer exposes **Watched listing page** type and **Refresh** for watch rows (`SourcesView.tsx` ~497–498, ~669–682).

**Result:** **PASS**

### AC2 — After baseline, new same-origin article-like links → `articles` with `candidateStatus: 'candidate'`

**Contract:** First successful snapshot baselines without flooding; subsequent diffs create candidate stubs; dedup via `watch:<normalizedUrl>` and global URL lookup.

**Evidence:** `ingestWatchLinks` marks URLs seen and sets `watchBaselineComplete` without inserts when baseline incomplete (`watch-fetcher.ts` ~131–137); after baseline, creates rows with `candidateStatus: 'candidate'`, `feedItemId` `watch:${normalizedUrl}`, and skips dismissed / seen / English-filtered / global duplicates (`watch-fetcher.ts` ~140–194). Vitest: first round inserts 0 articles, second round inserts 1 candidate (`watch-fetcher.test.ts` ~56–103).

**Result:** **PASS**

### AC3 — Opening uses same extraction path; successful extraction clears candidate status

**Contract:** Reader path unchanged; `fillArticleFromExtraction` clears candidate.

**Evidence:** `fillArticleFromExtraction` sets `ingestion_candidate_status = NULL` alongside full content and `is_stub = 0` (`articles/repository.ts` ~171–204). **Watch candidates** panel wires **Open** to optional `onOpenArticle(a.id)` from `App` (`SourcesView.tsx` ~829–836, props ~59–61).

**Result:** **PASS**

### AC4 — Dismiss deletes stub and persists normalized URL so it is not suggested again

**Contract:** Dismiss removes stub and records dismissal for that watch source.

**Evidence:** `dismissWatchCandidateArticle` validates candidate + `sourceId`, `markWatchUrlDismissed(sourceId, normalizeArticleUrl(url))`, then deletes the article row (`articles/repository.ts` ~243–255). `ingestWatchLinks` skips `isWatchUrlDismissed` (`watch-fetcher.ts` ~141–143). IPC validates positive integer ids (`candidates.ts` ~28–36).

**Result:** **PASS**

### AC5 — Copy distinguishes syndicated vs watched; higher false-positive risk communicated

**Contract:** Badges and labels in Sources + Articles.

**Evidence:** `TypeBadge` renders **Syndicated (RSS / Atom)** vs **Watched page** (`SourcesView.tsx` ~27–37). Watch candidates section explains stubs, accept/dismiss, and same reader flow as pasted URLs (`SourcesView.tsx` ~801–808). Build log cites `ArticlesView.tsx` for candidate + syndicated + watched badges.

**Result:** **PASS**

## In-scope technical items

| Item | Evidence |
|------|----------|
| DB: `ingestion_candidate_status`, `watch_seen_urls`, `watch_dismissed_urls`, `watch_baseline_complete` | Listed in `build-log.md` (`schema.ts`); used in `watch-fetcher.ts`, `watch-url-store.ts`, `repository.ts` |
| Core extraction heuristics | `extractWatchLinkCandidates`: same-origin, `footer` skip, nav segment filter, article-like path, dedupe (`watch-fetcher.ts` ~56–107); unit test for footer / off-site / login skip (`watch-fetcher.test.ts` ~32–48) |
| Shared types + scheduler parity | `build-log.md` (`article.ts`, `ingestion-source.ts`, `feed-scheduler-logic.ts`); `feed-scheduler.ts` filters `feed` \| `watch` and dispatches `refreshWatch` for watch sources |
| Retention: candidates excluded from automatic cleanup | `eligibleNoLookupsClause` requires `ingestion_candidate_status IS NULL` (`retention.ts` ~52–57); test coverage per build log |
| IPC: `sources:refreshWatch`, `candidates:list\|accept\|dismiss` | `candidates.ts`, `sources.ts` in build log |

**Result:** **PASS** (aligned with contract scope; out-of-scope items correctly deferred.)

## Definition of done

Contract requires root typecheck, core tests including new coverage, and build log. All satisfied (see Hard thresholds and `build-log.md`).

## Notes (non-blocking)

- **Heuristic tuning:** Link discovery is intentionally heuristic-heavy; real-site false positives/negatives are expected until follow-up tuning (already noted in build-log follow-ups).
- **Renderer / IPC integration tests:** Candidate flows are covered well in core + unit tests; there is no automated E2E in-repo for `candidates:*` IPC through the React panel (acceptable for this sprint’s DoD).
- **Repo convention:** Build log suggests optionally running `./scripts/check_repo_docs.sh` before release; not required by Sprint 6 contract DoD.

## Summary

Sprint 6 implements watched listing-page ingestion (fetch, JSDOM extraction, baseline vs diff, candidate stubs, dismiss persistence, dedup), scheduler and refresh-all parity with feeds, retention exclusion for candidates, IPC for refresh and candidate lifecycle, and Sources UI for type distinction, watch refresh, posture override, and the **Watch candidates** review panel with optional reader open. Automated gates reported green (**51** core tests). **No `feedback.md`** required for this round.
