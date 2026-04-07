# Sprint 1 Contract: Agent 适配器注册表与解析

## Feature: F1

## 交付物

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/app/src/main/services/acp-agents.ts` | 新建 | Agent 适配器注册表、解析逻辑、可用性检测 |

## 实现范围

1. 定义 `AgentAdapter` 接口：id, name, adapterPackage, resolveEntry()
2. 定义 `ResolvedEntry` 类型：`{ filePath: string; kind: 'node' | 'native' }` 
3. 定义 `AgentStatus` 类型：`{ adapter: AgentAdapter; status: 'ready' | 'not_found'; entry: ResolvedEntry | null; installHint: string }`
4. 内置 Claude Code 和 Codex CLI 两个 adapter 定义
5. Claude resolve: 通过 `createRequire()` 解析 `@agentclientprotocol/claude-agent-acp/dist/acp-agent.js`
6. Codex resolve: 解析 `@zed-industries/codex-acp` 的平台特定原生二进制
7. asar 路径处理
8. `getAvailableAgents()` 函数：遍历注册表返回可用性状态

## 不做

- 不安装 npm 依赖（Sprint 3 统一安装）
- 不实现 ACP 连接逻辑
- 不修改现有代码

## 验收标准

- AC-1.1 ~ AC-1.4（见 spec.md）
- `pnpm typecheck` 通过（该文件不导入外部 ACP 包，仅使用 Node.js 内置模块）
