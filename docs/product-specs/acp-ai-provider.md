# AI 调用层迁移至 ACP 协议

> 状态: **草案** | 创建: 2026-04-07

## 用户

Thinklish 桌面端用户。他们在阅读英文文章时选中文本，依赖 AI 获取英语直觉式解释。

## 问题

当前 `ai-provider.ts` 通过 `child_process.spawn` 直接调用 Claude CLI / Codex CLI，存在以下痛点：

1. **硬编码耦合** — 代码中写死了两个 CLI 的检测逻辑（`which claude` / `which codex`）和各自不同的参数格式与输出解析方式，新增 agent 需要在代码中添加 if-else 分支。
2. **用户锁定** — 用户只能使用 Claude Code 或 Codex CLI 中已安装的那个，无法选择其他已支持 ACP 的 agent（Gemini CLI、Kimi、OpenCode、Cursor CLI 等 30+ 个）。
3. **协议不统一** — Claude CLI 使用 `--output-format stream-json`，Codex CLI 使用原始 stdout，两套解析逻辑并存，维护成本高。
4. **缺乏标准会话管理** — 当前实现无 session 概念、无 cancel 机制（仅靠 `SIGTERM` 超时杀进程）、无权限协商。

## 时机

- [Agent Client Protocol (ACP)](https://agentclientprotocol.com/get-started/introduction) 已稳定至 v1，TypeScript SDK（`@agentclientprotocol/sdk`）可直接使用。
- 主流 AI coding agent 已全面接入 ACP：Claude Code、Codex CLI、Gemini CLI、Kimi CLI、OpenCode、GitHub Copilot、Goose、Junie 等。
- 现有 `ai-provider.ts` 代码量小（225 行），迁移窗口最佳。

## 方案概述

### ACP 是什么

ACP（Agent Client Protocol）是标准化 editor/IDE 与 AI coding agent 之间通信的协议，类似于 LSP 对语言服务的标准化。核心特征：

- **传输层**: JSON-RPC 2.0 over stdio（agent 作为子进程，通过 stdin/stdout 通信）
- **生命周期**: `initialize` → `session/new` → `session/prompt` → `session/update`（流式通知）→ prompt 响应
- **双向通信**: agent 可向 client 发起请求（如 `session/request_permission`、`fs/read_text_file`）
- **能力协商**: 初始化阶段通过 capabilities 声明支持的功能（文件系统、终端、MCP 等）
- **流式输出**: 通过 `session/update` 通知推送 `agent_message_chunk`、`tool_call` 等事件

### 连接模式
支持以下连接模式：

| 模式 | 启动方式 | 适用 agent |
|------|----------|-----------|
| `extension` | 通过 npm 包启动 | Claude Code, Codex CLI |
| `native` | 直接执行 `{bin} acp` | Kimi CLI, OpenCode, Gemini CLI |
| `sdk` | 进程内运行，使用 API key 直接调用 | 内置 agent（无需安装外部 CLI） |

### 协议流程

```
Client (Thinklish)                    Agent (Claude/Gemini/...)
       │                                      │
       │──── initialize ──────────────────────>│
       │<─── agentCapabilities ───────────────│
       │                                      │
       │──── session/new (cwd) ───────────────>│
       │<─── sessionId ──────────────────────│
       │                                      │
       │──── session/prompt (text) ───────────>│
       │<─── session/update (chunk) ─────────│  × N
       │<─── session/update (chunk) ─────────│
       │<─── prompt response (stopReason) ───│
       │                                      │
       │──── [cancel 可随时发送] ──────────────>│
```

## 变更范围

### 替换

| 文件 | 当前 | 变更后 |
|------|------|--------|
| `packages/app/src/main/services/ai-provider.ts` | 直接 spawn CLI + 自定义 stdout 解析 | ACP `ClientSideConnection` + `session/update` 流式回调 |

### 新增

| 文件 | 职责 |
|------|------|
| `packages/app/src/main/services/acp-manager.ts` | ACP 连接管理器：agent 检测、连接建立、session 管理、prompt 发送 |
| `packages/app/src/main/services/acp-agents.ts` | Agent 注册表：内置 agent 定义 + 用户自定义 agent 配置 |

### 影响

| 文件 | 变化 |
|------|------|
| `packages/app/src/main/ipc/ai.ts` | 调用方从 `explainTextStream()` 改为通过 ACP manager 发送 prompt |
| `packages/shared/src/types.ts`（或新增类型） | 新增 `AgentInfo`、`AgentConfig` 等类型 |
| `packages/app/package.json` | 新增依赖 `@agentclientprotocol/sdk` |

### 不变

- **Prompt 构建逻辑** — `buildUserMessage()`、`buildFullPrompt()`、`skillContent` 保持不变，仍在 client 侧组装好 prompt 文本后通过 ACP 发送。
- **Renderer 侧** — `StreamCallbacks` 接口和 IPC 通道 `ai:explain` 对外契约保持不变，renderer 无需改动。
- **Skill 文件** — `english-intuition.md` 不变。

## 非目标

1. **不实现 multi-turn 对话** — Thinklish 查词场景为单轮 prompt → response，不需要多轮会话。
2. **不实现 tool call 授权 UI** — 查词场景不涉及 agent 执行工具（不写文件、不操作终端），`request_permission` 可自动批准或不提供。
3. **不实现 agent 市场/注册表** — 仅支持内置 agent 列表 + 用户手动配置，不接入 ACP Registry。
4. **不新增 agent 选择 UI** — 本期只做后端迁移，前端设置界面属于后续迭代。
5. **不支持 remote agent** — ACP remote transport 尚未稳定，仅支持本地 stdio 模式。

## 完成标准

### 功能验收

- [ ] 用户安装了任意一个支持 ACP 的 agent CLI（Claude Code / Codex CLI / Gemini CLI / Kimi CLI / OpenCode 等），选中文本后能正常获得流式 AI 响应。
- [ ] 未安装任何 agent CLI 时，给出清晰的错误提示，列出可安装的 agent 选项。
- [ ] AI 响应超时（60s）时能正常取消，通过 ACP `session/cancel` 而非 `SIGTERM`。
- [ ] 流式输出体验与当前一致：逐块推送文本到 renderer 的 FloatingPanel。

### 技术验收

- [ ] `ai-provider.ts` 不再直接 spawn CLI 进程，改为通过 `@agentclientprotocol/sdk` 的 `ClientSideConnection` 通信。
- [ ] Agent 检测逻辑统一：遍历注册表中的 agent，按优先级尝试连接，无需为每个 agent 写特定解析代码。
- [ ] ACP 协议流程完整：`initialize` → `session/new` → `session/prompt` → 流式接收 `session/update` → 响应完成。
- [ ] 进程清理可靠：查询完成或取消后，agent 子进程必须被正确终止。
- [ ] 现有 IPC 契约 `ai:explain` 的入参和返回格式对 renderer 无破坏性变更。
- [ ] `pnpm typecheck` 通过，无新增类型错误。

### 兼容性

- [ ] 已安装 Claude Code CLI 的用户，迁移后体验无回退。
- [ ] 已安装 Codex CLI 的用户，迁移后体验无回退。

## 参考资料

- [ACP 协议文档](https://agentclientprotocol.com/get-started/introduction)
- [ACP TypeScript SDK](https://www.npmjs.com/package/@agentclientprotocol/sdk)
- [ACP 协议概览（生命周期）](https://agentclientprotocol.com/protocol/overview)
- [ACP 已接入 Agent 列表](https://agentclientprotocol.com/get-started/agents)
