# Sprint 4 build log — F4: 可筛选的全量卡片清单

## Summary

Implemented a filterable full card list below the donut chart in `CardOverviewView`, backed by `getCardsWithBucket()` in core (SQL `CASE` for bucket) and IPC `cards:getAllWithBucket`.

## Changes

| Layer | File | Change |
|-------|------|--------|
| shared | `packages/shared/src/types/card.ts` | Added `CardBucket`, `CardWithBucket` |
| shared | `packages/shared/src/index.ts` | Re-exported new types |
| core | `packages/core/src/cards/repository.ts` | `CardWithBucketRow`, `getCardsWithBucket()`, `mapRowToCardWithBucket` |
| core | `packages/core/src/index.ts` | Exported `getCardsWithBucket` |
| main | `packages/app/src/main/ipc/cards.ts` | Handler `cards:getAllWithBucket` |
| renderer | `packages/app/src/renderer/src/lib/api.ts` | `cardsAPI.getAllWithBucket` |
| renderer | `packages/app/src/renderer/src/components/CardOverviewView.tsx` | Scroll layout; filter tabs; list with preview, badge, relative next review; empty state |

## Verification

- `pnpm typecheck` (run after implementation)

## Notes

- Bucket logic matches existing `getCardStats()` thresholds (`datetime('now')`, `interval` 7-day split).
- Client-side filtering only; single fetch when `stats.total > 0`.
