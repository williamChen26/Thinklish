# Sprint 1 Build Log: F1 — Cursor ACP Native Agent Registration

## Status: PASSED

## Changed Files

### `packages/app/src/main/services/acp-agents.ts`
- `ResolvedEntry` 新增可选字段 `acpArgs?: string[]`，用于 native 模式下传递 CLI 参数
- 新增 `findBinaryInPath(name)` 函数，通过 login shell 的 `which` 命令查找 PATH 中的二进制
- 新增 `resolveCursorEntry()` 函数，查找 `cursor` 二进制并返回 `{ filePath, kind: 'native', acpArgs: ['agent', 'acp'] }`
- `BUILTIN_ADAPTERS` 新增 Cursor 条目（id: `'cursor'`，name: `'Cursor'`）

### `packages/app/src/main/services/acp-connection.ts`
- `spawnAdapter()` 中 native 分支改用 `entry.acpArgs ?? []` 作为 spawn 参数，向后兼容 Codex（无 acpArgs = 空数组）

## Verification Results

| Criterion | Result |
|-----------|--------|
| `getAvailableAgents()` 含 cursor 条目 | PASS — Cursor 在 BUILTIN_ADAPTERS 中注册 |
| 已安装时 ready / 未安装时 not_found | PASS — `findBinaryInPath` 通过 login shell which 检测 |
| native spawn 使用 `['agent', 'acp']` | PASS — `spawnAdapter` 读取 `entry.acpArgs` |
| Claude/Codex 不受影响 | PASS — 它们的 ResolvedEntry 无 acpArgs，fallback 为 `[]` |
| `pnpm build` | PASS (3 tasks, 0 errors) |
| `pnpm typecheck` | PASS (5 tasks, 0 errors) |

## Key Decisions

1. **PATH 检测用 login shell which**: GUI Electron 进程的 PATH 是阉割过的，必须通过 login shell 获取完整 PATH 再查找二进制。
2. **acpArgs 作为可选字段**: 添加到 `ResolvedEntry` 而非创建新类型，向后兼容现有 extension 和 native (Codex) 模式。
3. **不创建新文件**: `findBinaryInPath` 放在 `acp-agents.ts` 内部，避免引入共享模块的额外复杂度。

## ⚠️ Errata (HF1 — Post-Sprint Hotfix)

**问题**: `findBinaryInPath('cursor')` 找到的是 IDE 启动器（`/opt/homebrew/bin/cursor`），不是 ACP 服务端二进制。导致 spawn 后 initialize handshake 超时挂死。

**修复**: `findBinaryInPath('cursor')` → `findBinaryInPath('cursor-agent')`; `acpArgs: ['agent', 'acp']` → `acpArgs: ['acp']`。

详见 [`hotfixes/hotfix-log.md`](../../hotfixes/hotfix-log.md#hf1-cursor-acp-初始化卡死-affects-f1--sprint-1)。
