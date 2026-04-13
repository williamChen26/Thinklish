# Sprint 5 Contract: F5 — 与侧边栏复习提示的跨界面一致性

## Feature

**F5:** 与侧边栏复习提示的跨界面一致性（P1）

## Scope

确保侧边栏 Review 导航项上的 badge 数字与 CardOverviewView 中的 "待复习" 数字在语义和刷新时机上一致。

### 现状分析

- **侧边栏 badge**: `App.tsx` 中 `cardsAPI.getDue()` 返回 `getDueCards()` — 条件 `next_review_at <= datetime('now')`
- **仪表盘 "待复习"**: `getCardStats()` — 条件 `next_review_at <= datetime('now')` (CASE WHEN)
- **语义一致性**: ✅ 两者定义完全相同
- **时机问题**: ❌ 侧边栏仅在 `nav === 'review'` 时手动刷新，导航到 `cardOverview` 或从 `log` 生成卡片后不刷新

### Deliverables

1. **`App.tsx`** — 改进 `refreshReviewCount` 为使用 `cardsAPI.getStats()` 以复用同一数据源，并在更多导航切换时刷新（特别是 `cardOverview`）。
2. **`App.tsx`** — 将 `reviewCount` 改为从 `CardStats.due` 获取，确保与仪表盘同源。

## Out of Scope

- 修改 SRS 算法或分桶语义
- 新增 IPC 通道
- 修改 CardOverviewView 内部逻辑
- 修改 Sidebar 组件结构

## Acceptance Criteria & Verification

| AC | 标准 | 验证方法 |
|----|------|----------|
| AC-5.1 | 侧边栏 badge 数字与仪表盘 "待复习" 数字一致 | **运行时**：进入 cardOverview 看 "待复习" 数字，与侧边栏 Review badge 对比，应一致。 |
| AC-5.2 | 完成复习后两侧同步更新 | **运行时**：在 Review 完成一张卡片→切换到 cardOverview→两个数字均减 1。 |
| AC-5.3 | 从 cardOverview 导航出去再回来，badge 刷新 | **运行时**：从 cardOverview 切到 articles 再切回 cardOverview，badge 和仪表盘数字一致。 |
| AC-5.4 | 无卡片时 badge 不显示 | **运行时**：无卡片时侧边栏 Review 无 badge，cardOverview 显示空状态。 |
| T1 | 类型安全 | **命令**：`pnpm typecheck` 通过。 |

## Technical Approach

将 `refreshReviewCount` 改为调用已有的 `cardsAPI.getStats()`，取其 `.due` 字段作为 badge 数字。在 `handleNavChange` 中对所有导航切换都触发刷新（不仅仅是 `review`）。这样 badge 来源与仪表盘完全同源（同一 SQL），刷新时机也覆盖了 cardOverview。

## Dependencies

- F2（CardStats 和 `cardsAPI.getStats()`）

## Estimated Complexity

**低**：仅改 App.tsx 中的 `refreshReviewCount` 逻辑和 `handleNavChange` 触发条件。
