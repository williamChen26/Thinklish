# Sprint 3 Contract: AI Provider 迁移与 IPC 集成

## Feature: F3

## 交付物

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/app/src/main/services/ai-provider.ts` | 重写 | 移除 CLI 直接调用，改用 ACP |
| `packages/app/src/main/ipc/ai.ts` | 修改 | cancel 改用 ACP handle |
| `packages/app/package.json` | 修改 | 新增 adapter 包依赖 |

## 实现范围

1. **ai-provider.ts 重写**:
   - 移除 `findCli()`、`buildCliArgs()`、`parseStreamJsonLine()`、`extractResultText()` 和 `CliInfo` 类型
   - 保留 `StreamCallbacks` 接口、`detectMode()`、`buildUserMessage()`、`buildFullPrompt()`、`skillContent`
   - `explainTextStream()` 改为调用 `findFirstAvailableAgent()` + `queryViaAcp()`
   - 返回 `AcpQueryHandle | null` 而非 `ChildProcess | null`
   - 超时处理改为调用 `handle.cancel()`
   - 错误信息更新为列出 ACP agent 选项

2. **ai.ts IPC handler 修改**:
   - `activeStreams` Map 的 value 从 `ChildProcess` 改为 `AcpQueryHandle`
   - `ai:stream-cancel` 调用 `handle.cancel()` 而非 `child.kill('SIGTERM')`

3. **依赖安装**:
   - `@agentclientprotocol/claude-agent-acp`
   - `@zed-industries/codex-acp`

## 不做

- 不修改 renderer 侧代码
- 不修改 `ai:explain` IPC 通道的入参/返回格式

## 验收标准

- AC-3.1 ~ AC-3.6（见 spec.md）
- `pnpm typecheck` 通过（node + web）
