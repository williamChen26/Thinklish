# Evaluation: Sprint 5 — Round 1

## Verdict: PASS

## Summary
F5 通过两处精准改动实现了跨界面数字一致性：(1) sidebar badge 改为从 `cardsAPI.getStats().due` 获取，与仪表盘同源；(2) 每次导航切换都刷新 badge，不再仅限于切到 review 时。

## Criteria Evaluation

### AC-5.1: 侧边栏 badge 与仪表盘 "待复习" 一致
- **Verdict**: PASS
- **Evidence**: `App.tsx:16-17` — `refreshReviewCount` 使用 `cardsAPI.getStats()`，取 `.due`。仪表盘的 "待复习" 也来自 `getCardStats().due`。同一 SQL 查询逻辑。

### AC-5.2: 完成复习后两侧同步更新
- **Verdict**: PASS
- **Evidence**: `App.tsx:29` — 每次 `handleNavChange` 都调用 `refreshReviewCount()`。从 review 切到 cardOverview 时 badge 立即刷新，cardOverview 的 `loadStats` 也在 mount 时触发。

### AC-5.3: 导航切换后 badge 刷新
- **Verdict**: PASS
- **Evidence**: `App.tsx:26-30` — `handleNavChange` 对所有导航项都调用 `refreshReviewCount()`，不再有 `if (nav === 'review')` 的限制。

### AC-5.4: 无卡片时 badge 不显示
- **Verdict**: PASS
- **Evidence**: `Sidebar.tsx:45-49` — `reviewCount > 0` 条件渲染 badge。`getCardStats()` 空库返回 `due: 0`，badge 不显示。

### T1: typecheck
- **Verdict**: PASS
- **Evidence**: `pnpm typecheck` 退出码 0。

## Recommendation
PASS — all 5 features complete. Proceed to Phase 3 (completion).
