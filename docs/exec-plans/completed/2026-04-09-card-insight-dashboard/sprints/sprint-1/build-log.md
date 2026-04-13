# Sprint 1 build log — F1: Card overview nav & skeleton

## Summary

Added sidebar entry **Card overview** (`cardOverview`), wired `App.tsx` to render `CardOverviewView`, and implemented loading / empty / ready states driven by `cardsAPI.getAll()`.

## Files touched

| File | Change |
|------|--------|
| `packages/app/src/renderer/src/components/Sidebar.tsx` | Extended `NavItem` with `cardOverview`; inserted nav entry between Learning Log and Review. |
| `packages/app/src/renderer/src/App.tsx` | Import and conditional render of `CardOverviewView`; `onGoToLearningLog` sets nav to `log`. |
| `packages/app/src/renderer/src/components/CardOverviewView.tsx` | **New** — fetch all cards, spinner + copy for loading, empty state with CTA to Learning Log, ready placeholder with card count. |

## Verification

- `pnpm typecheck` — **pass** (2026-04-09).

## AC mapping (contract)

- **AC-1.1** — Visible sidebar button for Card overview.
- **AC-1.2** — Empty state explains no cards, directs user to Learning Log (copy + “Open Learning Log”); no charts or error-as-empty.
- **AC-1.3** — Loading uses spinner and “Loading card overview…” vs empty headline/copy.
- **AC-1.4** — Sidebar remains available for Articles, Learning Log, Review.
- **T1** — Typecheck clean.
- **T2** — `NavItem` union drives `NAV_ITEMS` and `App` branches; new item included in both.
