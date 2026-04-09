# Sprint 2 Contract: F2 — 卡片聚合指标与状态分桶

## Feature

**F2:** 卡片聚合指标与状态分桶（产品语义）（P0）

## Scope

定义并实现**用户可见的卡片三分类**（待复习 / 复习中 / 已掌握），基于现有 Card 的 SRS 字段映射；在 CardOverviewView 中展示总数和各分类数字；确保数字反映最新状态。

### 分桶语义定义

基于 Card 已有字段 `nextReviewAt`, `interval`, `repetitions`:

| 用户语义 | 条件 | 说明 |
|----------|------|------|
| **待复习 (Due)** | `nextReviewAt <= now` | 已到期、应该复习的卡片 |
| **复习中 (Learning)** | `nextReviewAt > now && interval < 7` | 还在短周期巩固中，间隔小于 7 天 |
| **已掌握 (Mastered)** | `nextReviewAt > now && interval >= 7` | 进入长间隔，趋于稳定 |

> 三类互斥且穷尽全集：任一卡片在任一时刻只属于一个分类。

### Deliverables

1. **`core/src/cards/repository.ts`** — 新增 `getCardStats()` 函数，返回 `{ total, due, learning, mastered }` 聚合统计。
2. **`shared/src/types/card.ts`** — 新增 `CardStats` 类型定义。
3. **`app/src/main/ipc/cards.ts`** — 新增 `cards:getStats` IPC handler。
4. **`app/src/renderer/src/lib/api.ts`** — 新增 `cardsAPI.getStats()` 方法。
5. **`CardOverviewView.tsx`** — 替换简单卡片计数为分类统计展示。

## Out of Scope

- F3：图表/可视化（本 sprint 只展示数字）
- F4：可筛选列表
- F5：侧边栏一致性改造
- 修改 SRS 算法或数据库 schema（只读现有字段）

## Acceptance Criteria & Verification

| AC | 标准 | 验证方法 |
|----|------|----------|
| AC-2.1 | 总览展示**总卡片数**，与 `cardsAPI.getAll().length` 一致 | **命令**：`pnpm typecheck` 通过 + **运行时**：进入总览页确认总数字显示正确。 |
| AC-2.2 | 展示**待复习**数量，与 Review 页面的到期卡片数一致 | **运行时**：对比总览 "待复习" 数字与 Review 页面实际显示的卡片数（均依赖 `nextReviewAt <= now`）。 |
| AC-2.3 | 展示**复习中（巩固）**数量，表示 `nextReviewAt > now && interval < 7` 的卡片子集 | **运行时**：进入总览页确认数字展示；**代码验证**：确认分桶逻辑与合同定义一致。 |
| AC-2.4 | 展示**已掌握**数量，三类互斥穷尽（due + learning + mastered = total） | **运行时**：进入总览页确认三个数字之和等于总数。 |
| AC-2.5 | 新生成卡片或完成复习后，返回总览时指标**反映最新状态** | **运行时**：在 Learning Log 生成一张卡片→返回总览→数字更新。 |
| T1 | 类型安全 | **命令**：`pnpm typecheck` 全量通过。 |

## Technical Approach

在 `core/cards/repository.ts` 新增 `getCardStats()` 纯函数，单次 SQL 查询用 CASE WHEN 按 `nextReviewAt` 和 `interval` 聚合。在 `shared` 新增 `CardStats` 接口。通过新 IPC 通道 `cards:getStats` 暴露给 renderer。CardOverviewView 改为调用 `cardsAPI.getStats()` 替代 `getAll()`，渲染四个数字（总计、待复习、复习中、已掌握）。组件每次获得焦点时刷新数据。

## Dependencies

- F1（已完成）：CardOverviewView 页面骨架和导航入口
- 现有 cards 表结构（不修改 schema）

## Estimated Complexity

**中**：涉及 shared/core/main/renderer 四层变更（类型→逻辑→IPC→UI），但每层改动量小。核心复杂度在分桶 SQL 和类型传递。
