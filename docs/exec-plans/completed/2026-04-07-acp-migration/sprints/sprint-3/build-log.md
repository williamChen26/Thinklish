# Sprint 3 Build Log: AI Provider 迁移与 IPC 集成

## 交付

| 文件 | 操作 |
|------|------|
| `packages/app/src/main/services/ai-provider.ts` | 重写 |
| `packages/app/src/main/ipc/ai.ts` | 修改 |
| `packages/app/package.json` | 修改 — 新增 adapter 包依赖 |

## 实现要点

1. **ai-provider.ts 重写**: 移除 `findCli()`、`buildCliArgs()`、`parseStreamJsonLine()`、`extractResultText()`、`CliInfo` 等所有 CLI 特定逻辑。`explainTextStream()` 改为调用 `findFirstAvailableAgent()` + `queryViaAcp()`。
2. **保留的公开 API**: `StreamCallbacks`、`detectMode()`、`buildFullPrompt()`、`skillContent` 保持不变。
3. **超时处理**: 60s 超时后调用 `handle.cancel()`（ACP session/cancel），不再使用 SIGTERM。使用 `settled` flag 防止 timeout/done/error 回调重复触发。
4. **IPC handler 修改**: `activeStreams` Map 的 value 从 `ChildProcess` 改为 `AcpQueryHandle`，cancel 调用 `handle.cancel()`。
5. **返回类型变更**: `explainTextStream()` 返回 `AcpQueryHandle | null` 而非 `ChildProcess | null`。IPC handler 已同步更新类型。
6. **新增依赖**: `@agentclientprotocol/claude-agent-acp ^0.25.3`, `@zed-industries/codex-acp ^0.11.1`。

## 已删除代码

- `findCli()` — CLI 检测逻辑（`which claude` / `which codex`）
- `buildCliArgs()` — CLI 特定参数组装
- `parseStreamJsonLine()` — Claude stream-json 格式解析
- `extractResultText()` — Claude result 提取
- `CliInfo` 接口
- `child_process` 直接 spawn 逻辑

## 验证

- `pnpm typecheck` ✅ 全量通过（shared + core + app:node + app:web，5 tasks）
- Renderer 侧零变更，`ai:explain` IPC 契约保持不变
