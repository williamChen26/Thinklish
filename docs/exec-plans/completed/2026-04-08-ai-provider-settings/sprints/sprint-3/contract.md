# Sprint 3 Contract: F2 — AI Provider Settings System

## Feature
F2: AI Provider Settings System

## Scope

### Deliverables

1. **新增 IPC: `ai:getAgents`** — 返回所有注册 adapter 的 id、名称、安装状态、安装链接
2. **扩展 IPC: `ai:explain`** — 新增入参 `aiProvider` (`'auto' | 'claude' | 'codex' | 'cursor'`)，指定用哪个 agent；返回值新增 `agentName` 字段
3. **扩展 `useSettings` hook** — 新增 `aiProvider` 设置项，持久化到 localStorage
4. **ReaderToolbar AI 工具选择器** — 下拉选择 AI provider，未安装的 agent 置灰并显示安装提示
5. **`ai-provider.ts` 扩展** — `explainTextStream` 接受 `aiProvider` 参数，按选择调用对应 agent 或 auto fallback

### Non-Scope
- 不修改 FloatingPanel 显示逻辑（Sprint 4 处理）
- 不添加独立 Settings 页面
- 不支持用户自定义 agent

## Test Criteria

| # | 标准 | 验证方法 |
|---|------|---------|
| T1 | `ai:getAgents` 返回 claude/codex/cursor 三个条目含 status | 代码审查 |
| T2 | `ai:explain` 带 `aiProvider='claude'` 时使用 Claude agent | 代码逻辑审查 |
| T3 | `ai:explain` 带 `aiProvider='auto'` 时行为与当前一致 | 代码逻辑审查 |
| T4 | 指定 agent 不可用时返回错误而非 fallback | 代码逻辑审查 |
| T5 | `aiProvider` 设置持久化到 localStorage | useSettings 代码审查 |
| T6 | Toolbar 下拉展示 agent 列表，不可用项置灰 | 代码审查 |
| T7 | `pnpm build && pnpm typecheck` 通过 | 运行命令 |
