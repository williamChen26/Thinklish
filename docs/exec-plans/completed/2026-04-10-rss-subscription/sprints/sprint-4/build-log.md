# Sprint 4 build log — F6 Integrated UX

**Date:** 2026-04-13  
**Contract:** `contract.md`

## Summary

Implemented F6: prominent paste vs sources entry points, article filters for discoverability, expandable source detail with last success / last error / next-eligible schedule, and plain-language error remediation without default stack dumps.

## Changes

### Shared (`@thinklish/shared`)

- **`feed-scheduler-logic.ts`** — Moved pure scheduler helpers from `@thinklish/core` so the renderer can reuse `getNextDueTime`, `getEffectivePosture`, etc., without pulling SQLite.
- **`source-error-remediation.ts`** — `remediateIngestionError()` maps HTTP/network/parse patterns to short summaries + bullets; collapses stack-like input to a single safe technical line.
- **`index.ts`** — Re-exports scheduler API and remediation.

### Core (`@thinklish/core`)

- Removed duplicate `ingestion/feed-scheduler-logic.ts`; `index.ts` re-exports scheduler symbols from `@thinklish/shared`.
- **`source-error-remediation.test.ts`** — Covers null/empty, 404 mapping, stack collapse, DNS-style messages.
- **`feed-scheduler-logic.test.ts`** — Imports updated to `@thinklish/shared`.

### App renderer

- **`Sidebar.tsx`** — “Add reading” block: **Paste article URL** and **Sources & feeds** as primary sibling actions (still mirrors main nav).
- **`App.tsx`** — `ArticlesView` receives `onOpenSources` to jump to Sources.
- **`ArticlesView.tsx`** — Header copy; “Sources & feeds” button; filter by source + “Recent imports (from feeds)”; “From feed” badge; habit/quality empty state; `onOpenSources` required prop.
- **`SourcesView.tsx`** — Onboarding copy tweak; per-row **Detail** / “View error & how to fix”; expandable panel: last success (relative + absolute), last attempt, next schedule via `describeSourceSchedule`, remediation + optional technical `<details>`.
- **`lib/source-schedule-hint.ts`** — Wraps shared scheduler math for user-facing schedule strings.

### Packaging

- **`packages/app/package.json`** — `@thinklish/shared` added to **dependencies** (removed from devDependencies) for correct install graph; `pnpm-lock.yaml` updated via `pnpm install --no-frozen-lockfile`.

## Verification

- `pnpm typecheck` — pass (shared, core, app node + web).
- `pnpm --filter @thinklish/core test` — pass (42 tests).

## Notes / follow-ups

- “Next scheduled” is **eligible-after** time plus copy that feeds **rotate**; exact wall-clock tick is global scheduler–dependent, which matches F3 semantics without new IPC.
- Watch sources: detail states they are not on the automatic feed timer until F4 wiring exists.
