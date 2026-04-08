# Sprint 2 Contract: F4 — FloatingPanel Viewport Clamping Fix

## Feature
F4: FloatingPanel Viewport Clamping Fix

## Scope

修复 `FloatingPanel` 的 `computePosition()` 函数，确保浮窗在任何选区位置都不超出可视区。用 ref 测量面板实际渲染高度替代硬编码估算值。

### Deliverables

1. **`computePosition` 重写**: 使用面板实际高度（通过 `useLayoutEffect` + ref 测量）替代硬编码的 `panelEstimatedHeight = 300`。
2. **四方向约束**: top ≥ padding, left ≥ padding, right ≤ viewport - padding, bottom ≤ viewport - padding。
3. **智能翻转**: 默认选区下方 → 溢出底部则翻转上方 → 上方也不够则限制 maxHeight 并钳位。
4. **避免首帧跳动**: 首次渲染使用 `opacity: 0` 测量高度后再设置位置并显示。

### Non-Scope
- 不修改浮窗内容、功能按钮或样式
- 不修改 `useTextSelection` hook
- 不修改后端逻辑

## Test Criteria

| # | 标准 | 验证方法 |
|---|------|---------|
| T1 | 选区在视口底部时浮窗翻转到上方 | 代码逻辑审查 |
| T2 | 选区在视口顶部时浮窗显示在下方 | 代码逻辑审查 |
| T3 | 上下均不够空间时限制 maxHeight 并钳位 | 代码逻辑审查 |
| T4 | 水平方向不超出视口左右边界 | 代码逻辑审查 |
| T5 | 使用 ref 测量实际高度而非硬编码 | 代码审查 |
| T6 | `pnpm build` 通过 | 运行命令 |
