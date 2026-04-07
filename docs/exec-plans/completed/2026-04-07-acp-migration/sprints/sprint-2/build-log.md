# Sprint 2 Build Log: ACP 连接与流式 Prompt

## 交付

| 文件 | 操作 |
|------|------|
| `packages/app/src/main/services/acp-connection.ts` | 新建 |
| `packages/app/package.json` | 修改 — 新增 `@agentclientprotocol/sdk ^0.18.1` 依赖 |

## 实现要点

1. **Login shell 环境**: `getLoginShellEnv()` 从用户 shell 获取完整 PATH，缓存结果，尝试多个 shell 候选。
2. **进程启动**: `spawnAdapter()` 根据 `entry.kind` 决定用 `process.execPath`（Node.js）还是直接执行原生二进制。
3. **流桥接**: `nodeToWebWritable()` / `nodeToWebReadable()` 将 child_process 的 stdin/stdout 转为 Web Streams API。
4. **ACP SDK 动态导入**: `await import('@agentclientprotocol/sdk')` 处理 ESM-only 包，使用 `import type` 获取编译时类型。
5. **精简 Client handler**: 只实现 `sessionUpdate`（提取 `agent_message_chunk` 文本）和 `requestPermission`（自动批准）。
6. **Cancel 句柄**: `queryViaAcp()` 返回 `AcpQueryHandle`，cancel 触发 ACP `session/cancel` 通知。
7. **进程清理**: `finally` 块中 `killProcess()` 确保子进程被终止。

## 验证

- `pnpm typecheck:node` ✅ 通过
- 新增依赖: `@agentclientprotocol/sdk ^0.18.1`
