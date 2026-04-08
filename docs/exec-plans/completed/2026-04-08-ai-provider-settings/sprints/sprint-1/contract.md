# Sprint 1 Contract: F1 — Cursor ACP Native Agent Registration

## Feature
F1: Cursor ACP Native Agent Registration

## Scope

扩展 `acp-agents.ts` 和 `acp-connection.ts`，新增 Cursor 作为 native 模式 ACP agent。Cursor CLI 通过 `cursor agent acp` 命令直接充当 ACP 服务器。

### Deliverables

1. **`acp-agents.ts` 扩展**: 新增 `AgentAdapter` 条目 `cursor`，类型标记为 native 模式。新增 `resolveCursorEntry()` 函数，通过 PATH 查找 `cursor` 二进制。扩展 `ResolvedEntry` 类型以区分 extension 和 native 模式。
2. **`acp-connection.ts` 扩展**: 修改 `spawnAdapter()` 函数，当 entry 为 native 模式时，spawn `[binary, ...acpArgs]` 而非用 Node 运行 JS 入口。
3. **类型更新**: `ResolvedEntry` 增加 `acpArgs` 字段（native 模式下为 `['agent', 'acp']`）。

### Non-Scope
- 不修改 renderer 侧任何代码
- 不添加 AI 工具设置 UI（Sprint 3）
- 不修改 `ai-provider.ts` 的 prompt 构建逻辑
- 不添加新的 npm 依赖

## Test Criteria

| # | 标准 | 验证方法 |
|---|------|---------|
| T1 | `getAvailableAgents()` 返回包含 `cursor` 条目 | 代码审查 + 类型检查 |
| T2 | Cursor 已安装时 status = `ready`，未安装时 = `not_found` | 代码逻辑审查 |
| T3 | native 模式 spawn 使用 `[binary, 'agent', 'acp']` | 代码审查 `spawnAdapter()` |
| T4 | Claude Code 和 Codex CLI 行为不受影响 | 现有 extension 模式路径不变 |
| T5 | `pnpm build` 通过 | 运行命令 |
| T6 | `pnpm typecheck` 通过 | 运行命令 |
