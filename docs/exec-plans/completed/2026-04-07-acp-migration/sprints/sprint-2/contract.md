# Sprint 2 Contract: ACP 连接与流式 Prompt

## Feature: F2

## 交付物

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/app/src/main/services/acp-connection.ts` | 新建 | ACP 协议通信层：进程启动、流桥接、生命周期、流式推送、cancel |
| `packages/app/package.json` | 修改 | 新增 `@agentclientprotocol/sdk` 依赖 |
| `packages/app/electron.vite.config.ts` | 修改 | 确保 ACP SDK 被正确 externalize |

## 实现范围

1. `queryViaAcp(entry, prompt, callbacks)` 函数：接收 ResolvedEntry + prompt + 回调
2. 进程启动：根据 entry.kind 决定用 Node.js 还是直接执行原生二进制
3. Login shell 环境继承：从用户 shell 获取完整 PATH 等环境变量
4. Node-to-Web 流桥接：将 child_process 的 stdout/stdin 转为 Web ReadableStream/WritableStream
5. ACP SDK 动态导入：`import('@agentclientprotocol/sdk')` 按需加载 ESM 包
6. ClientSideConnection 创建：精简 Client handler（仅 sessionUpdate + requestPermission）
7. 协议生命周期：initialize → newSession → prompt → 流式 session/update → prompt response
8. Cancel 支持：返回 cancel 句柄，调用 ACP session/cancel
9. 进程清理：finally 块确保子进程被终止

## 不做

- 不修改 ai-provider.ts 或 IPC handler（Sprint 3）
- 不安装 adapter 包（Sprint 3）

## 验收标准

- AC-2.1 ~ AC-2.5（见 spec.md）
- `pnpm typecheck` 通过
