# Sprint 7 build log — F7 Feed discovery assistance

## Summary

Implemented feed discovery from pasted page URLs: HTML `<link rel="alternate">` RSS/Atom discovery, optional common-path probing when no alternates exist, `feeds:discover` IPC, Articles UI suggestion strips (feed + watch fallback), and Sources prefill for watched-site onboarding.

## Files touched

- `packages/shared/src/types/discovered-feed.ts` — `DiscoveredFeed` type.
- `packages/shared/src/index.ts` — export `DiscoveredFeed`.
- `packages/core/src/ingestion/feed-discovery.ts` — discovery + `isLikelySiteOrArticleUrl`.
- `packages/core/src/ingestion/feed-discovery.test.ts` — unit tests (HTML parse + mocked `fetch`).
- `packages/core/src/index.ts` — export discovery helpers.
- `packages/app/src/main/ipc/feeds.ts` — `feeds:discover` handler.
- `packages/app/src/main/index.ts` — register feed IPC.
- `packages/app/src/renderer/src/lib/api.ts` — `feedsAPI.discover`.
- `packages/app/src/renderer/src/components/ArticlesView.tsx` — debounced discovery UI + confirm add.
- `packages/app/src/renderer/src/components/SourcesView.tsx` — watch URL prefill from Articles.
- `packages/app/src/renderer/src/App.tsx` — prefill state + `onOpenSourcesForWatch`.
- `docs/exec-plans/active/2026-04-10-rss-subscription/sprints/sprint-7/contract.md` — sprint contract.
- `docs/exec-plans/active/2026-04-10-rss-subscription/sprints/sprint-7/build-log.md` — this file.
- `docs/exec-plans/active/2026-04-10-rss-subscription/sprints/sprint-7/evaluation.md` — Evaluator placeholder.

## Follow-ups (optional)

- If product needs “hidden” feeds not declared in `<link>` but living only at `/rss`, consider a **limited** probe pass even when alternates exist (with stricter caps and dedupe).
