# Sprint 3 Build Log: F2 — AI Provider Settings System

## Status: PASSED

## Changed Files (7 files)

### Backend (main process)

**`packages/app/src/main/services/ai-provider.ts`**
- `explainTextStream` 新增 `aiProvider: string` 参数
- 当 `aiProvider === 'auto'` 时走 `findFirstAvailableAgent()`，否则从 `getAvailableAgents()` 中按 id 查找指定 agent
- 指定 agent 不可用时返回明确错误，不 fallback
- 返回值改为 `ExplainResult { handle, agentName }`

**`packages/app/src/main/ipc/ai.ts`**
- 新增 `ai:getAgents` IPC handler：返回所有注册 adapter 的 `{ id, name, status, installUrl }`
- `ai:explain` 入参新增 `aiProvider` 字段，传递给 `explainTextStream`
- 成功返回值新增 `agentName` 字段

### Renderer (frontend)

**`packages/app/src/renderer/src/lib/api.ts`**
- 新增 `AgentInfo` 接口
- `AiStreamStartResult` success 分支新增 `agentName`
- `aiAPI.explain` 入参新增 `aiProvider`
- 新增 `aiAPI.getAgents()`

**`packages/app/src/renderer/src/hooks/useSettings.ts`**
- 新增 `AiProvider` 类型 (`'auto' | 'claude' | 'codex' | 'cursor'`)
- `ReaderSettings` 新增 `aiProvider` 字段，默认 `'auto'`

**`packages/app/src/renderer/src/components/reader/ReaderToolbar.tsx`**
- 新增 `agents` 和 `onChangeAiProvider` props
- 渲染 `<select>` 下拉框：Auto + 各 agent（不可用的置灰 + "(未安装)"）

**`packages/app/src/renderer/src/components/reader/ReaderView.tsx`**
- `useEffect` 获取 agent 列表
- 传递 `agents`、`onChangeAiProvider` 到 `ReaderToolbar`

**`packages/app/src/renderer/src/components/reader/ReaderContent.tsx`**
- 传递 `settings.aiProvider` 到 `FloatingPanel`

**`packages/app/src/renderer/src/components/ai/FloatingPanel.tsx`**
- 新增 `aiProvider` prop，传递给 `aiAPI.explain`

## Verification Results

| Criterion | Result |
|-----------|--------|
| `ai:getAgents` 返回三个条目含 status | PASS |
| `ai:explain` 指定 agent 时使用该 agent | PASS |
| `ai:explain` auto 模式行为不变 | PASS |
| 指定 agent 不可用时返回错误 | PASS |
| `aiProvider` 持久化到 localStorage | PASS |
| Toolbar 下拉展示 agent 列表 | PASS |
| `pnpm build` | PASS |
| `pnpm typecheck` | PASS |
