# Sprint 2 Build Log: F4 — FloatingPanel Viewport Clamping Fix

## Status: PASSED

## Changed Files

### `packages/app/src/renderer/src/components/ai/FloatingPanel.tsx`
- 新增 `useLayoutEffect` import
- 新增常量 `PANEL_PADDING`、`PANEL_WIDTH`、`PANEL_MAX_HEIGHT` 替代硬编码魔数
- 新增 `positionStyle` state，初始 `visibility: hidden` 防止首帧闪烁
- 新增 `useLayoutEffect` 在 DOM 渲染后、浏览器绘制前测量面板实际高度并计算位置
- 重写 `computePosition(rect, panelHeight)` 函数：
  - 水平：居中对齐选区，双向钳位到 viewport 内
  - 垂直优先级：下方 → 上方 → 空间更大侧（限制 maxHeight，最小 120px）
  - 最终 `top` 钳位 ≥ PADDING
  - streaming 阶段使用 PANEL_MAX_HEIGHT 预估高度，避免内容增长导致重定位

## Verification Results

| Criterion | Result |
|-----------|--------|
| 底部选区 → 浮窗翻转到上方 | PASS — `spaceAbove >= panelHeight` 分支 |
| 顶部选区 → 浮窗在下方 | PASS — `spaceBelow >= panelHeight` 分支（默认） |
| 上下均不够 → 限制 maxHeight | PASS — `spaceBelow >= spaceAbove` 或反向分支 + maxHeight 约束 |
| 水平不超出 | PASS — `Math.max(PADDING, Math.min(left, vw - WIDTH - PADDING))` |
| ref 测量实际高度 | PASS — `useLayoutEffect` + `panel.offsetHeight` |
| `pnpm build` | PASS |
| `pnpm typecheck` | PASS |

## Key Decisions

1. **useLayoutEffect 而非 useEffect**: 在浏览器绘制前同步计算位置，首次渲染用 `visibility: hidden` 隐藏，避免位置跳动。
2. **streaming 阶段使用 PANEL_MAX_HEIGHT**: 因为内容在持续增长，用最大高度预估避免频繁重定位。状态变为 success/error 后用实际高度。
3. **最小 maxHeight 120px**: 即使空间极窄也保证面板可用。

## ⚠️ Errata (HF2 — Post-Sprint Hotfix)

**问题**: `useLayoutEffect` 监听 `state` 变化导致 streaming 过程中位置反复重算，面板位置跳动。

**修复**: 将 `useLayoutEffect` + `positionStyle` state 替换为 `useMemo` 基于 `selection.rect` 一次性计算。`maxHeight` 始终从可用空间计算（移除 CSS 硬编码），面板不再重定位。

详见 [`hotfixes/hotfix-log.md`](../../hotfixes/hotfix-log.md#hf2-浮窗位置跳动-affects-f4--sprint-2)。
