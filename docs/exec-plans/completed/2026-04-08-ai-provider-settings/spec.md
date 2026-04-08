# Spec: AI Provider 设置与浮窗增强

## Background

Thinklish 已完成 ACP 协议迁移（`acp-connection.ts` + `acp-agents.ts`），当前支持 Claude Code 和 Codex CLI 两个适配器，通过 `findFirstAvailableAgent()` 自动选择第一个可用的 agent。

但用户体验存在以下缺口：

1. **Cursor ACP 缺失** — Cursor CLI 已原生内置 ACP 能力（`cursor agent acp`），无需第三方适配器，但 Thinklish 尚未注册 Cursor agent，Cursor 用户无法使用。
2. **无法选择 AI 工具** — 用户无法知道当前在用哪个 AI agent，也无法切换。当多个 agent 同时安装时，只会用第一个检测到的。
3. **浮窗未展示 AI 来源** — AI 回复来自哪个 agent 完全不可见，用户无法区分 Claude、Codex、Cursor 的输出。
4. **浮窗定位溢出** — 当前 `computePosition()` 仅做简单的上下翻转和水平钳位，在接近屏幕边缘的选区仍可能导致面板部分不可见。

## Goals

1. 注册 Cursor ACP 适配器，使 Cursor 用户能直接使用 Thinklish 的 AI 查词功能。
2. 提供 AI 工具设置界面，用户可选择使用哪个 AI agent（默认 auto 模式自动选择）。
3. 在浮窗中清晰展示当前使用的 AI 工具名，增强透明度。
4. 修复浮窗定位逻辑，确保在任何位置选中文本时浮窗都完全在可视区内。

## Non-Goals

1. **不实现 agent 市场/注册表** — 不接入 ACP Registry 做动态发现，仅支持内置 adapter 列表。
2. **不实现 agent 配置编辑** — 不支持用户自定义 adapter 命令行参数或环境变量。
3. **不做 multi-turn 对话** — 保持单轮 prompt → response 模式。
4. **不做 remote agent** — 仅支持本地 stdio 模式。
5. **不做全面设置页面** — Settings 功能聚焦 AI 工具选择，不涉及通用应用设置（如快捷键、代理等）。

## Feature List

### F1: Cursor ACP Native Agent Registration

在 `acp-agents.ts` 中注册 Cursor 作为 **native 模式** ACP agent。Cursor CLI 本身已内置 ACP 能力，通过 `cursor agent acp` 命令直接启动 ACP 服务器（与 Kimi CLI 的 `kimi acp`、OpenCode 的 `opencode acp` 同理）。无需社区适配器包。

检测逻辑：判断 `cursor` 命令是否在 PATH 中可用。连接模式为 native — 直接 spawn `cursor agent acp` 子进程，通过 stdio JSON-RPC 通信。

需要扩展现有架构以支持 native 模式：当前 `acp-agents.ts` 仅支持 extension 模式（通过 npm 包解析入口文件），需要新增 native 模式分支，即直接在 PATH 中查找 CLI 二进制并以 `[bin, ...acpArgs]` 启动。`acp-connection.ts` 的 `spawnAdapter` 需要新增 native 命令行 spawn 路径。

**Acceptance Criteria:**
- AC-1.1: `getAvailableAgents()` 返回结果中包含 Cursor 条目（`id: 'cursor'`），状态为 `ready`（CLI 在 PATH 中）或 `not_found`（未安装）。
- AC-1.2: 当用户仅安装了 Cursor CLI 时，`findFirstAvailableAgent()` 返回 Cursor agent，选中文本后能通过 `cursor agent acp` 获得流式 AI 响应。
- AC-1.3: Cursor 未安装时，不影响 Claude Code 和 Codex CLI 的正常工作。
- AC-1.4: native 模式的 spawn 逻辑复用现有 `getLoginShellEnv()` 环境检测，通过 PATH 查找 `cursor` 二进制。

**Priority:** P0 (must-have)
**Dependencies:** None

---

### F2: AI Provider Settings System

新增 AI 工具选择设置，持久化到 localStorage。设置包含：当前选用的 AI agent（默认 `auto`，即自动选择第一个可用的）。提供 IPC 通道让 renderer 获取可用 agent 列表及其安装状态。未安装的 agent 在 UI 中置灰或提示未安装。

**Acceptance Criteria:**
- AC-2.1: 新增 IPC 通道 `ai:getAgents` 返回所有已注册 adapter 及其安装状态（`ready` / `not_found`），包含 adapter id、名称、安装链接。
- AC-2.2: 新增设置项 `aiProvider`（类型：`'auto' | 'claude' | 'codex' | 'cursor'`），持久化在 localStorage 中，默认值为 `'auto'`。
- AC-2.3: 当 `aiProvider` 设为特定 agent 时，`ai:explain` 使用指定 agent；若该 agent 不可用则返回明确错误（而非 fallback 到其他 agent）。
- AC-2.4: 当 `aiProvider` 设为 `'auto'` 时，行为与当前一致，按优先级自动选择第一个可用 agent。
- AC-2.5: 在阅读器工具栏（ReaderToolbar）或独立设置区域，提供 AI 工具选择 UI，未安装的 agent 显示为禁用状态并附安装提示。

**Priority:** P0 (must-have)
**Dependencies:** F1

---

### F3: FloatingPanel AI Provider Display

在浮窗（FloatingPanel）右上角（header 区域）显示当前使用的 AI 工具名称。用户可以一眼看到本次 AI 回复来自哪个 agent。

**Acceptance Criteria:**
- AC-3.1: FloatingPanel header 右上角（关闭按钮左侧区域）显示当前 AI agent 名称标签（如 "Claude Code"、"Codex"、"Cursor"）。
- AC-3.2: 标签样式轻量、不抢视觉焦点（小字号、muted 颜色），不影响现有操作按钮的可点击区域。
- AC-3.3: `ai:explain` 的返回值中新增 `agentName` 字段，renderer 从中获取当前 agent 名称。
- AC-3.4: 当 AI 工具为 auto 模式时，显示实际使用的 agent 名称（而非 "Auto"）。

**Priority:** P0 (must-have)
**Dependencies:** F2

---

### F4: FloatingPanel Viewport Clamping Fix

修复浮窗定位逻辑，确保面板在任何选区位置（包括屏幕四角、顶部边缘、底部边缘）都完全处于可视区内。当默认位置（选区下方居中）导致溢出时，依次尝试上方、左偏、右偏等备选位置。

**Acceptance Criteria:**
- AC-4.1: 选区位于视口底部时，浮窗自动翻转到选区上方显示，且不超出视口顶部。
- AC-4.2: 选区位于视口顶部且上方空间不足时，浮窗显示在选区下方，并在必要时限制最大高度。
- AC-4.3: 选区位于视口左右边缘时，浮窗水平位置自动调整，确保左右两侧都不超出视口。
- AC-4.4: 浮窗的 top、left、maxHeight 在渲染后均满足 `>= padding` 且 `<= viewport - padding` 的约束（padding = 12px）。
- AC-4.5: 定位逻辑使用面板的实际渲染高度（通过 ref 测量），而非硬编码的估算高度。

**Priority:** P0 (must-have)
**Dependencies:** None

## Risks & Dependencies

### 技术风险

1. **Cursor CLI 可用性** — Cursor CLI（`cursor` 命令）需要用户已安装 Cursor 桌面应用并完成认证。与 Claude Code / Codex CLI 不同，Cursor CLI 可能需要 `cursor agent acp` 子命令，其参数格式需参考 ACP 文档确认。
2. **Native 模式架构扩展** — 当前 `acp-agents.ts` 和 `acp-connection.ts` 仅支持 extension 模式（npm 包入口），需要新增 native 模式分支（PATH 二进制 + acpArgs），涉及 `ResolvedEntry` 类型和 `spawnAdapter` 函数的扩展。
3. **Settings 持久化一致性** — AI provider 设置在 renderer（localStorage）中持久化，但实际 agent 选择在 main 进程执行。需要确保 renderer → main 的设置传递时序正确（每次 explain 调用时携带 provider 选择）。
4. **面板高度测量时序** — 使用 ref 测量实际渲染高度需要在首次渲染后进行二次定位，可能引发视觉跳动（需要在初次渲染时使用 `visibility: hidden` 或 `opacity: 0` 过渡）。

### 产品风险

1. **Settings 入口不明显** — 如果设置入口放在 ReaderToolbar 中，用户可能不容易发现。需要考虑首次引导。

### 外部依赖

1. Cursor 桌面应用已安装，`cursor` CLI 命令在 PATH 中可用
2. 用户已完成 Cursor 认证（通过 Cursor 应用内登录）

## Open Questions

1. **Settings UI 入口位置** — 放在 ReaderToolbar 还是独立的 Settings 页面？建议在 ReaderToolbar 加一个 AI 工具选择下拉框，简洁直接。
2. **Agent 优先级顺序** — auto 模式下 Claude Code → Codex → Cursor 的默认优先级是否合理？还是应该让用户配置优先级？建议 MVP 固定优先级，后续再做可配置。

## Suggested Sprint Order

1. **Sprint 1 → F1 (Cursor ACP Adapter)**: 先扩展后端适配器注册，不涉及 UI 变更，可独立验证。
2. **Sprint 2 → F4 (Viewport Clamping Fix)**: 独立的 bug fix，不依赖其他 feature，可并行推进。
3. **Sprint 3 → F2 (AI Provider Settings)**: 依赖 F1 的 adapter 注册，需要新增 IPC 通道和 renderer 设置组件。
4. **Sprint 4 → F3 (FloatingPanel Provider Display)**: 依赖 F2 的设置系统和 agent 信息传递。

## Post-Sprint Hotfixes

| ID | 影响 Feature | 问题 | 修复 |
|----|-------------|------|------|
| HF1 | F1 (Sprint 1) | `cursor` 是 IDE 启动器，非 ACP 服务端。spawn 后 initialize 握手永远无响应 | 改为查找 `cursor-agent` 二进制，`acpArgs` 改为 `['acp']` |
| HF2 | F4 (Sprint 2) | `useLayoutEffect` 监听 `state` 变化导致 streaming 时面板位置反复跳动 | 改用 `useMemo` 基于 `selection.rect` 一次性计算位置和 `maxHeight`，不再重定位 |

详见 [`hotfixes/hotfix-log.md`](hotfixes/hotfix-log.md)。
