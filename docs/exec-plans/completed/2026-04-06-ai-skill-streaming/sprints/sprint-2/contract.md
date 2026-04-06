# Sprint 2 Contract: Streaming Output + Markdown Rendering

## Scope

将 AI 响应从"等待完整结果后一次性渲染"改为流式逐步输出，并使用 `react-markdown` 库完整渲染 Markdown。

## Deliverables

### D1: 后端流式输出 (`ai-provider.ts`)

- 新增 `explainTextStream()` 函数，使用 `child_process.spawn` 替代 `execFileAsync`
- 通过回调函数逐步传递 stdout chunk
- 支持取消（kill 子进程）
- 保留 `explainText()` 作为兼容接口（内部可复用流式逻辑）

### D2: IPC 流式通道 (`ipc/ai.ts`)

- `ai:explain` 改为返回 `{ success: true, streamId: string }` 启动流
- 新增 `ai:stream-chunk` 事件（main → renderer 推送）：`{ streamId, chunk, done }`
- 新增 `ai:stream-cancel` 通道（renderer → main）：取消指定 streamId 的进程
- 进程管理：维护 `Map<streamId, ChildProcess>`，面板关闭时清理

### D3: Preload 层

- `preload/index.ts` 已有 `on()` 方法暴露 `ipcRenderer.on`，可直接复用
- 无需修改 preload 代码

### D4: 前端流式接收 (`lib/api.ts`)

- `aiAPI.explain()` 改为返回 streamId
- 新增 `aiAPI.onStreamChunk()` 监听 stream-chunk 事件
- 新增 `aiAPI.cancelStream()` 取消流

### D5: FloatingPanel 重构

- 状态机改为 `'loading' | 'streaming' | 'success' | 'error'`
- `streaming` 状态下实时拼接 chunk，实时渲染 Markdown
- 删除手写 `AiResponseRenderer`，替换为 `react-markdown` + `remark-gfm`
- 流式过程中显示闪烁光标
- 关闭面板时调用 `cancelStream()` 清理后台进程
- 完成后启用 Save/Retry 按钮

### D6: 依赖安装

- `react-markdown` + `remark-gfm` 添加到 `packages/app/package.json`

## Files Changed

| File | Action |
|------|--------|
| `packages/app/src/main/services/ai-provider.ts` | 新增 `explainTextStream` |
| `packages/app/src/main/ipc/ai.ts` | 重写为流式 IPC |
| `packages/app/src/renderer/src/lib/api.ts` | 更新 AI API 接口 |
| `packages/app/src/renderer/src/components/ai/FloatingPanel.tsx` | 重构为流式 + react-markdown |
| `packages/app/package.json` | 新增依赖 |

## Out of Scope

- 不修改 ReaderContent.tsx 或 useTextSelection.ts
- 不修改学习日志保存逻辑（保存时使用完整响应文本即可）
- 不修改 preload 层

## Acceptance Criteria

- [ ] 首个 chunk 到达后 FloatingPanel 立即开始渲染，无长时间空白 loading
- [ ] Markdown 正确渲染 ##、**粗体**、> 引用、- 列表、表格、emoji
- [ ] 面板关闭时 CLI 子进程被 kill，不泄漏
- [ ] 流式完成后 Save 按钮可用，保存完整响应
- [ ] `pnpm typecheck` 通过
