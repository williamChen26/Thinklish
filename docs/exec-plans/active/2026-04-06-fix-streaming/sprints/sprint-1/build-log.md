# Sprint 1 Build Log: Fix Streaming Output

## Root Cause

`claude -p` 默认使用 `text` 输出格式，将全部 AI 响应缓冲后一次性写入 stdout。
导致 `spawn` 的 `stdout.on('data')` 只在进程结束时收到一个大 chunk，无流式效果。

## Diagnosis

通过 `claude --help` 确认以下关键标志：
- `--output-format stream-json` — 实时流式 JSON 输出
- `--include-partial-messages` — 包含 `content_block_delta` 事件（文本增量）
- `--verbose` — `stream-json` 格式的前置要求
- `--system-prompt` — 可分离系统提示与用户消息

实际测试 `claude -p --verbose --output-format stream-json --include-partial-messages "Say hi"` 确认流式 JSON 行：
```json
{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}}
{"type":"result","subtype":"success","result":"Hi there, friend!"}
```

## Fixes Applied

### Fix 1: `ai-provider.ts` — 使用 stream-json 模式

**变更:**
- `findCli()` 返回 `CliInfo { cmd, supportsStreamJson }` 替代简单的 `{ cmd, args }`
- Claude CLI 参数: `-p --verbose --output-format stream-json --include-partial-messages --system-prompt <skill> <user_msg>`
- Codex CLI 保持 `-q <fullPrompt>` 兼容
- 新增 `buildCliArgs()` 根据 CLI 类型构造不同参数
- 新增 JSON 行解析器: `parseStreamJsonLine()` 提取 `content_block_delta.text_delta.text`
- 新增 `extractResultText()` 从 `result` 事件提取完整文本
- stdout 数据处理分两条路径: Claude → JSON 行解析; Codex → 原始文本
- 使用 `--system-prompt` 将 skill 内容与用户消息分离（更清晰，利于 API 缓存）
- 修复 close handler: 处理所有 exit 情况（超时、正常、异常、killed），不再有静默失败

### Fix 2: `FloatingPanel.tsx` — 消除 listener 竞态

**变更:**
- `onStreamChunk` listener 在 `await aiAPI.explain()` 之前注册
- streamId 未知期间，chunk 事件暂存到 `earlyBuffer`
- `explain()` 返回 streamId 后，立即 drain buffer 处理已到达的事件
- 若 explain 失败，清理 listener 后设置 error 状态

### Fix 3: 错误处理改善

- `ai-provider.ts` close handler: 用 `timedOut` flag 区分超时 vs 正常退出
- 使用 `resultText ?? streamedText` 作为最终文本（优先 result 事件中的官方文本）
- 不再将 stderr 内容混入响应（stderr 可能含 CLI 诊断信息）

## Verification

- `tsc --noEmit -p tsconfig.node.json`: PASS
- `tsc --noEmit -p tsconfig.web.json`: PASS
- Linter: 0 errors
