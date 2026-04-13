# Sprint 1 Build Log: Agent 适配器注册表与解析

## 交付

| 文件 | 操作 |
|------|------|
| `packages/app/src/main/services/acp-agents.ts` | 新建 |

## 实现要点

1. **类型定义**: `ResolvedEntry`、`AgentAdapter`、`AgentStatus` 三个接口，覆盖 adapter 配置、解析结果、可用性状态。
2. **模块解析**: 使用 `createRequire(import.meta.url)` 创建 require 函数，通过标准 Node.js 模块解析定位 adapter 包，不手动拼 node_modules 路径。
3. **Claude 解析**: 直接 resolve `@agentclientprotocol/claude-agent-acp/dist/acp-agent.js`，返回 `kind: 'node'`。
4. **Codex 解析**: 优先尝试平台特定包 `@zed-industries/codex-acp-{platform}-{arch}` 的原生二进制（`kind: 'native'`），回退到主包 JS wrapper。
5. **Asar 处理**: `fixAsarPath()` 将 `app.asar` 替换为 `app.asar.unpacked`。
6. **公开 API**: `getAvailableAgents()` 返回全量状态列表，`findFirstAvailableAgent()` 返回第一个可用 agent。

## 验证

- `pnpm typecheck:node` ✅ 通过
- 无新增外部依赖（仅使用 Node.js 内置模块 `node:module`, `node:fs`, `node:path`）
