# Sprint 2 build log — F2: 卡片聚合指标与状态分桶

## Summary

Implemented `CardStats` and `getCardStats()` with a single aggregate SQL query using `CASE WHEN`, exposed via `cards:getStats` IPC and `cardsAPI.getStats()`, and updated `CardOverviewView` to load stats instead of the full card list. Loading and empty states are unchanged in behavior (empty when `total === 0`).

## Bucketing (SQL)

- **Due:** `next_review_at <= datetime('now')`
- **Learning:** `next_review_at > datetime('now') AND interval < 7`
- **Mastered:** `next_review_at > datetime('now') AND interval >= 7`

Buckets are mutually exclusive and align with the approved contract.

## Files touched

| Layer | Path |
|-------|------|
| shared | `packages/shared/src/types/card.ts` — `CardStats` |
| shared | `packages/shared/src/index.ts` — re-export |
| core | `packages/core/src/cards/repository.ts` — `getCardStats()` |
| core | `packages/core/src/index.ts` — re-export |
| main | `packages/app/src/main/ipc/cards.ts` — `cards:getStats` |
| renderer | `packages/app/src/renderer/src/lib/api.ts` — `cardsAPI.getStats()` |
| renderer | `packages/app/src/renderer/src/components/CardOverviewView.tsx` — stats grid |

## Verification

- `pnpm typecheck` — passed (2026-04-09).

## Out of scope (per contract)

- Charts or visualizations (F3).
- Gold-plated UI beyond four labeled counts.
