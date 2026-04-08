# Post-Sprint Hotfixes

运行 `2026-04-08-ai-provider-settings` 在 4 个 sprint 全部通过后，用户实测发现两个问题。以下为 hotfix 记录。

---

## HF1: Cursor ACP 初始化卡死 (affects F1 / Sprint 1)

### 现象

选择 Cursor 作为 AI 工具后，连接一直停留在 `step 4: calling initialize...`，无法获取 AI 响应。

### 根因分析

Sprint 1 将 Cursor ACP 注册为 `{ filePath: which('cursor'), kind: 'native', acpArgs: ['agent', 'acp'] }`。

但 PATH 中的 `cursor` 命令（`/opt/homebrew/bin/cursor`）实际是 **Cursor IDE 启动器**（基于 VS Code CLI 的 shell 脚本），它会启动 GUI 应用，不支持 ACP stdio 协议。

真正的 ACP 服务端二进制是 **`cursor-agent`**（`~/.local/bin/cursor-agent`），这是一个 Node.js wrapper 脚本，通过 `cursor-agent acp` 启动 ACP 服务器。

### 修复

| 文件 | 变更 |
|------|------|
| `packages/app/src/main/services/acp-agents.ts` | `resolveCursorEntry()`: `findBinaryInPath('cursor')` → `findBinaryInPath('cursor-agent')`; `acpArgs: ['agent', 'acp']` → `acpArgs: ['acp']` |

### 经验教训

- `cursor` (IDE launcher) ≠ `cursor-agent` (ACP server)。Cursor 的 ACP 文档说 `cursor agent acp`，但这是在 Cursor 内置终端的语境下。从外部 spawn 时，需要直接使用 `cursor-agent acp`。
- 应在 sprint 实现时增加 smoke test：spawn 二进制后检查 ACP initialize handshake 是否在超时内完成。

---

## HF2: 浮窗位置跳动 (affects F4 / Sprint 2)

### 现象

文本选中后浮窗出现，随着 AI 流式内容输出，面板高度增长导致位置不断跳动（上下来回移动），用户体验差。

### 根因分析

Sprint 2 使用 `useLayoutEffect` 监听 `state` 变化重新计算位置。虽然在 streaming 阶段用 `PANEL_MAX_HEIGHT` 预估高度，但 `state` 从 `loading` → `streaming` → `success` 的每次切换都触发位置重新计算，加上实际高度 vs 预估高度的差异，导致多次重定位。

### 修复

| 文件 | 变更 |
|------|------|
| `packages/app/src/renderer/src/components/ai/FloatingPanel.tsx` | 1. `useLayoutEffect` + `positionStyle` state → `useMemo` 一次性计算 `panelStyle` |
| | 2. `computePosition(rect, panelHeight)` → `computePosition(rect)`，不再依赖动态高度 |
| | 3. `maxHeight` 始终从可用空间计算并写入 style（移除 CSS `max-h-[480px]` 硬编码） |
| | 4. 删除 `visibility: hidden` 初始隐藏（不再需要，位置一次性确定） |

### 用户策略（采纳）

> 一开始定义好浮窗位置，根据位置计算最大宽高（不允许超出可视区）。

核心原则：**面板位置和 maxHeight 在 selection.rect 确定时一次性计算，后续内容变化不触发重定位**。面板内容超出 maxHeight 时自然产生滚动，而非改变位置。

### 经验教训

- 动态内容面板的定位应在挂载时一次性决定，maxHeight 约束确保不超出视口。
- `useLayoutEffect` 适合一次性测量场景，不适合跟随 state 反复重计算位置。
- `useMemo` 基于 `selection.rect` 是更稳定的选择——输入不变则位置不变。
