# Sprint 3 Contract: F3 — 洞察仪表盘可视化

## Feature

**F3:** 洞察仪表盘可视化（P1）

## Scope

在 CardOverviewView 中用**图形化方式**呈现 F2 的分桶结果（环形图/甜甜圈图），替代纯数字方阵，并保留数字作为图例。使用纯 CSS/SVG 实现，不引入第三方图表库。

### Deliverables

1. **`CardOverviewView.tsx`** — 重构 ready 状态，加入环形图可视化 + 数字图例
2. **新组件 `DonutChart.tsx`**（或内联） — 纯 SVG 甜甜圈图，接收三分桶数据，输出颜色分区

## Out of Scope

- F4：可筛选卡片列表
- F5：侧边栏一致性
- 引入 chart.js / recharts / d3 等第三方图表库
- 历史趋势图（"近 7 日复习量"等时序数据）

## Acceptance Criteria & Verification

| AC | 标准 | 验证方法 |
|----|------|----------|
| AC-3.1 | 用户无需滚动即可看到分桶的图形化摘要（与 F2 数字同源） | **运行时**：启动应用进入总览页，首屏可见环形图和数字。 |
| AC-3.2 | 图形与数字一致：各分区占比与旁边数值匹配 | **运行时**：目视确认图形分区大小与数字比例一致。 |
| AC-3.3 | 提供图例或简短说明解释各颜色对应分类 | **运行时**：确认图例标签包含 "待复习" / "复习中" / "已掌握" 及对应色块。 |
| AC-3.4 | 暗色与亮色主题下仪表盘可读 | **代码审查**：确认颜色使用 Tailwind dark: 变体或使用在两种主题下都有足够对比度的固定颜色。 |
| AC-3.5 | 空状态（0 张卡片）不显示图表 | **运行时**：无卡片时仍显示 F1 的空状态引导，不出现空环形图。 |
| T1 | 类型安全 | **命令**：`pnpm typecheck` 通过。 |

## Technical Approach

用 SVG `<circle>` 的 `stroke-dasharray` 和 `stroke-dashoffset` 实现甜甜圈图（零依赖）。三段弧分别对应 due/learning/mastered，使用固定颜色（红/黄/绿系）在明暗主题下都可辨。中心显示总数。图例用横排色块 + 文字 + 数字。整个视图重构为上方环形图 + 下方图例 + 底部卡片总数的垂直布局。

## Dependencies

- F2（已完成）：CardStats 数据源和分桶语义

## Estimated Complexity

**中**：核心挑战是 SVG 甜甜圈图的弧段计算和响应式布局，但无新 IPC/数据层变更。
