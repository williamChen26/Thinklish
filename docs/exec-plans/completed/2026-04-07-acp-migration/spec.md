# Spec: AI 调用层迁移至 ACP 协议

## Background

Thinklish 当前通过 `child_process.spawn` 直接调用 Claude CLI / Codex CLI，存在硬编码耦合、协议不统一、缺乏标准会话管理等问题。ACP（Agent Client Protocol）已稳定至 v1，主流 AI coding agent 已全面接入。现有 `ai-provider.ts` 仅 225 行，是迁移的最佳窗口。

迁移后，Thinklish 将通过标准化的 ACP 协议与任意兼容 agent 通信，消除 CLI 特定的解析逻辑，并获得标准的会话管理和取消机制。

## 设计思路

### 官方适配器包

ACP 生态中，每个 agent 都有对应的 **ACP 适配器**（adapter）包，负责将 agent 的原生协议桥接为标准 ACP stdio 通信：

| Agent | 官方适配器包 | 类型 | 来源 |
|-------|-------------|------|------|
| Claude Code | `@agentclientprotocol/claude-agent-acp` | TypeScript/JS（Node.js 运行） | [claude-agent-acp](https://github.com/agentclientprotocol/claude-agent-acp) |
| Codex CLI | `@zed-industries/codex-acp` | Rust 原生二进制（平台特定） | [codex-acp](https://github.com/zed-industries/codex-acp) |

这些适配器包作为 **ACP server 子进程**运行：Client（Thinklish）spawn 适配器进程，通过 stdin/stdout 以 JSON-RPC 2.0 ndjson 格式通信。

### 我们的方案

独立设计，核心：

1. **直接使用官方包名** — `@agentclientprotocol/claude-agent-acp` 和 `@zed-industries/codex-acp`。
2. **Node.js 模块解析** — 通过 `require.resolve()` / `createRequire()` 定位适配器入口，而非手动拼接 `node_modules` 路径扫描。这更符合 Node.js 惯例，也能正确处理 hoisted、symlinked 等 monorepo 场景。
3. **精简 Client handler** — Thinklish 的查词场景不需要终端、文件系统等 agent 能力，Client handler 只实现 `sessionUpdate`（流式文本）和 `requestPermission`（自动批准），实现轻量得多。
4. **适配器解析器模式** — 每个 agent 适配器有独立的 `resolve` 函数，知道如何找到并启动自己的进程。Claude 适配器走 Node.js，Codex 适配器走原生二进制。
5. **单次查询优化** — 不维护长连接。每次查词 spawn → initialize → session → prompt → done → cleanup。Thinklish 的使用频率（偶尔查词）不需要连接池。

### 协议流程

```
Thinklish Main Process              ACP Adapter (子进程)              Agent Backend
       │                                   │                              │
       │── spawn adapter ────────────────>│                              │
       │── initialize (JSON-RPC) ────────>│                              │
       │<── agentCapabilities ────────────│                              │
       │                                   │                              │
       │── session/new ──────────────────>│                              │
       │<── sessionId ───────────────────│                              │
       │                                   │                              │
       │── session/prompt (text) ────────>│──── Claude API / Codex ────>│
       │<── session/update (chunk) ──────│<─── streaming response ─────│
       │<── session/update (chunk) ──────│                              │
       │<── prompt response (end_turn) ──│                              │
       │                                   │                              │
       │── [cancel 可随时发送] ───────────>│                              │
       │── process cleanup ──────────────>│                              │
```

## Goals

1. 用 ACP 标准协议替代当前的 CLI 直接调用，消除 agent 特定的参数组装和输出解析。
2. 通过官方适配器包（`@agentclientprotocol/claude-agent-acp`, `@zed-industries/codex-acp`）接入 agent，利用生态标准化能力。
3. 建立可扩展的 agent 注册表，新增 agent 只需添加配置和 resolve 函数。
4. 实现标准化的 cancel 机制，替代当前的 SIGTERM 超时杀进程。
5. 保持 renderer 侧零破坏性变更：`ai:explain` IPC 通道的入参和返回格式不变。

## Non-Goals

1. **不实现 multi-turn 对话** — Thinklish 查词场景为单轮 prompt → response。
2. **不实现 agent 选择 UI** — 本期只做后端迁移，前端设置界面属于后续迭代。
3. **不支持 remote agent** — 仅支持本地 stdio 模式。
4. **不实现完整 Client capabilities** — 不提供终端、文件系统等能力（查词不需要）。
5. **不支持 WebSocket 或 SDK 模式** — 初期只走 stdio ACP adapter。

## Feature List

### F1: Agent 适配器注册表与解析

建立 agent 适配器的配置注册表和运行时解析机制。每个 agent 定义包含：名称、官方适配器包名、进程启动方式（Node.js 还是原生二进制），以及 `resolve()` 函数负责定位适配器入口点。

Claude 适配器 (`@agentclientprotocol/claude-agent-acp`) 是 TypeScript 包，需用 Node.js 执行其 `dist/acp-agent.js`。Codex 适配器 (`@zed-industries/codex-acp`) 是 Rust 原生二进制，通过平台特定可选依赖（如 `@zed-industries/codex-acp-darwin-arm64`）分发。

**Acceptance Criteria:**
- AC-1.1: 新建 `acp-agents.ts`，导出 `AgentAdapter` 接口（包含 id、name、adapterPackage、resolveEntry 函数），且类型通过 `pnpm typecheck`。
- AC-1.2: 内置 Claude Code 和 Codex CLI 两个 adapter 定义，各自的 `resolveEntry()` 能正确解析对应 npm 包的入口点（Claude → JS 文件路径 + `{ kind: 'node' }`，Codex → 原生二进制路径 + `{ kind: 'native' }`）。
- AC-1.3: 导出 `getAvailableAgents()` 函数，遍历注册表调用 `resolveEntry()`，返回每个 agent 的可用性状态。解析失败的 agent 状态为 `not_found`，包含用户可读的安装指引。
- AC-1.4: `resolveEntry()` 通过 `createRequire()` 做模块解析（不手动拼 node_modules 路径），且能处理 Electron asar 打包场景（`app.asar` → `app.asar.unpacked` 路径替换）。

**Priority:** P0 (must-have)
**Dependencies:** None

### F2: ACP 连接与流式 Prompt

实现 ACP 协议的客户端通信层：spawn 适配器进程 → Node/Web 流桥接 → `ClientSideConnection` 创建 → `initialize → newSession → prompt` 生命周期 → `session/update` 流式文本推送 → cancel 支持 → 进程清理。

Client handler 只实现两个回调：
- `sessionUpdate`: 从 `agent_message_chunk` 事件提取文本，推送到 `onChunk`
- `requestPermission`: 自动批准（Thinklish 查词不涉及工具操作）

**Acceptance Criteria:**
- AC-2.1: 新建 `acp-connection.ts`，导出 `queryViaAcp(entry, prompt, callbacks)` 函数，接收 F1 的 resolve 结果、prompt 文本和流式回调。
- AC-2.2: `queryViaAcp()` 完整执行 ACP 生命周期：spawn 进程 → 流桥接 → `initialize` → `newSession` → `prompt`，通过 `session/update` 的 `agent_message_chunk` 事件逐块推送文本到 `onChunk`。
- AC-2.3: 支持 `cancel` 操作：对外暴露 cancel 句柄，调用时发送 ACP `session/cancel` 通知，并在 prompt 响应返回后安全清理子进程。
- AC-2.4: 正确处理 Electron GUI 环境下的 login shell 环境变量继承（PATH 等），确保适配器子进程能找到 agent CLI 依赖。
- AC-2.5: 查询完成或异常后，适配器子进程必须被可靠终止，不留孤儿进程。

**Priority:** P0 (must-have)
**Dependencies:** F1

### F3: AI Provider 迁移与 IPC 集成

将现有 `ai-provider.ts` 的 CLI 直接调用逻辑替换为 ACP 调用，同时更新 IPC handler 的 cancel 机制。添加 npm 依赖。保持所有公开 API 和 IPC 契约不变。

**Acceptance Criteria:**
- AC-3.1: `explainTextStream()` 内部调用 `queryViaAcp()` 而非 `spawn()` + 自定义解析，`StreamCallbacks` 接口签名不变。
- AC-3.2: `ai:stream-cancel` IPC handler 通过 ACP cancel 句柄取消查询，而非 `child.kill('SIGTERM')`。
- AC-3.3: `ai-provider.ts` 中不再存在 `findCli()`、`buildCliArgs()`、`parseStreamJsonLine()`、`extractResultText()` 等 CLI 特定函数。
- AC-3.4: 超时处理（60s）改为调用 ACP cancel 句柄，超时后仍返回 `'AI 响应超时（60 秒），请重试'` 错误信息。
- AC-3.5: 未安装任何 agent 时，错误提示列出支持 ACP 的 agent 选项及安装链接。
- AC-3.6: `packages/app/package.json` 新增 `@agentclientprotocol/sdk`、`@agentclientprotocol/claude-agent-acp`、`@zed-industries/codex-acp` 依赖，`pnpm install` 成功且 `pnpm typecheck` 通过。

**Priority:** P0 (must-have)
**Dependencies:** F2

## Risks & Dependencies

1. **ACP SDK ESM-only**: `@agentclientprotocol/sdk` 是 ESM 包，需通过动态 `import()` 在 electron-vite 编译后仍能正确解析。
2. **Electron asar 路径**: 打包后 `node_modules` 可能被打入 asar，适配器的 JS/二进制文件需标记为 unpacked 资源。
3. **平台二进制分发**: `@zed-industries/codex-acp` 通过 optional dependencies 分发平台特定二进制（如 `@zed-industries/codex-acp-darwin-arm64`），需确认 pnpm 能正确安装。
4. **Login Shell 环境**: GUI 启动的 Electron 进程 `process.env` 可能缺少 PATH，需从 login shell 继承完整环境。
5. **适配器与 agent 版本兼容**: 适配器包版本需与用户安装的 agent CLI 版本兼容，可能存在 API breaking change。

## Open Questions

1. 是否需要为 agent 优先级提供配置？→ **建议**: 初期固定顺序（Claude → Codex），后续加配置。
2. 适配器包放 `dependencies` 还是 `optionalDependencies`？→ **建议**: `dependencies`，包体积小（Claude 144KB, Codex 4.4KB wrapper），确保开箱即用。

## Suggested Sprint Order

1. **Sprint 1: F1** — Agent 适配器注册表与解析
2. **Sprint 2: F2** — ACP 连接与流式 Prompt
3. **Sprint 3: F3** — AI Provider 迁移与 IPC 集成
