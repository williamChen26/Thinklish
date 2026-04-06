# Sprint 2 Build Log: Streaming Output + Markdown Rendering

## Changes Made

### Updated: `packages/app/package.json`
- 新增依赖 `react-markdown@^10.1.0`, `remark-gfm@^4.0.1`

### Rewritten: `packages/app/src/main/services/ai-provider.ts`
- 删除 `explainText()` (非流式), 新增 `explainTextStream()`
- `explainTextStream()` 使用 `spawn` 替代 `execFileAsync`，通过 `StreamCallbacks` 逐步推送 chunk
- 返回 `ChildProcess` 引用，支持外部 kill 取消
- 保留 60s 超时保护

### Rewritten: `packages/app/src/main/ipc/ai.ts`
- `registerAiHandlers()` 签名新增 `getWindow` 参数，用于获取 BrowserWindow 发送事件
- `ai:explain` handler 改为启动流式调用，返回 `{ success, streamId }`
- 通过 `win.webContents.send('ai:stream-chunk', ...)` 推送 chunk 事件
- 新增 `ai:stream-cancel` handler，kill 指定 streamId 的子进程
- 维护 `activeStreams: Map<string, ChildProcess>` 管理进程生命周期

### Updated: `packages/app/src/main/index.ts`
- 模块级 `mainWindow` 变量，通过 `() => mainWindow` 传入 `registerAiHandlers()`
- 确保 `activate` 事件更新 `mainWindow` 引用，不重复注册 IPC handler

### Updated: `packages/app/src/renderer/src/lib/api.ts`
- 删除 `AiExplainResult` 类型，新增 `AiStreamStartResult` + `AiStreamChunkEvent` 类型
- `aiAPI.explain()` 返回 `AiStreamStartResult`（含 streamId）
- 新增 `aiAPI.onStreamChunk()` 监听流事件
- 新增 `aiAPI.cancelStream()` 取消流

### Rewritten: `packages/app/src/renderer/src/components/ai/FloatingPanel.tsx`
- 状态机扩展为 `loading | streaming | success | error`
- `streaming` 状态下实时拼接 chunk 并渲染
- 删除手写 `AiResponseRenderer`，替换为 `<Markdown remarkPlugins={[remarkGfm]}>` 
- 使用 Tailwind `prose` 类提供完整 Markdown 排版
- 流式过程中显示闪烁光标（`animate-pulse` 块元素）
- 关闭面板时调用 `cleanup()` → `cancelStream()` + 取消事件监听
- Retry 按钮在 loading/streaming 期间 disabled
- Save 按钮使用完成后的 `fullResponse`

## Verification

- `tsc --noEmit -p tsconfig.node.json`: PASS
- `tsc --noEmit -p tsconfig.web.json`: PASS
- Linter: 0 errors on all 5 changed files

## Architecture Notes

### IPC 流式通信设计
```
renderer                     main
   |-- ai:explain ------------>|  (invoke, returns streamId)
   |<-- ai:stream-chunk -------|  (event, multiple times)
   |<-- ai:stream-chunk done --|  (event, with fullText)
   |-- ai:stream-cancel ------>|  (invoke, kills child process)
```

### 资源清理路径
1. 正常完成: `onDone` → remove from `activeStreams` → send done event
2. 用户关闭: `handleClose` → `cleanup()` → `cancelStream(streamId)` → kill child
3. 超时: 60s timer → `SIGTERM` → `onError` callback
4. 窗口销毁: `win.isDestroyed()` guard 防止向已销毁窗口发送事件
